package cz.kuryr4you.driver.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject

const val CHANNEL_ONGOING = "k4y_monitor"
const val CHANNEL_ALERTS = "k4y_alerts"
const val SNAP_ORDERS = "snap_orders"
const val SNAP_DRIVERS = "snap_drivers"
const val KEY_MONITOR = "monitor_enabled"
const val POLL_INTERVAL_MS = 120_000L

class MonitorService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var started = false
    private var nextNotifId = 100

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannels()
        val notification = ongoingNotification()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(1, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!started) {
            started = true
            scope.launch {
                while (isActive) {
                    try {
                        checkOnce()
                    } catch (_: Exception) {
                        // síť nedostupná / klíč neplatný — zkusíme příště
                    }
                    delay(POLL_INTERVAL_MS)
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun createChannels() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ONGOING, "Sledování dispečinku", NotificationManager.IMPORTANCE_LOW)
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ALERTS, "Upozornění dispečinku", NotificationManager.IMPORTANCE_HIGH).apply {
                enableVibration(true)
            }
        )
    }

    private fun contentIntent(): PendingIntent = PendingIntent.getActivity(
        this, 0,
        Intent(this, MainActivity::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun ongoingNotification(): Notification =
        Notification.Builder(this, CHANNEL_ONGOING)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("K4Y hlídá dispečink")
            .setContentText("Kontrola každé 2 minuty")
            .setOngoing(true)
            .setContentIntent(contentIntent())
            .build()

    private fun alert(title: String, text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        val n = Notification.Builder(this, CHANNEL_ALERTS)
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(contentIntent())
            .build()
        nm.notify(nextNotifId++, n)
        if (nextNotifId > 900) nextNotifId = 100
    }

    private suspend fun checkOnce() {
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val apiKey = prefs.getString(KEY_API, "") ?: ""
        if (apiKey.isBlank()) return

        // ── Objednávky ──────────────────────────────────────────────────────
        val ordersJson = JSONObject(apiGet("/api/v1/dispatch/orders?status=all&limit=100", apiKey))
        val arr = ordersJson.getJSONArray("orders")
        val current = JSONObject()
        val addresses = mutableMapOf<String, String>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val num = o.getString("rideNumber")
            current.put(num, o.getString("status"))
            addresses[num] = o.getString("deliveryAddress")
        }

        val prevOrdersRaw = prefs.getString(SNAP_ORDERS, null)
        if (prevOrdersRaw != null) {
            val prev = JSONObject(prevOrdersRaw)
            for (num in current.keys()) {
                val status = current.getString(num)
                val label = STATUS_LABELS[status] ?: status
                if (!prev.has(num)) {
                    alert("Nová zakázka $num", "${addresses[num] ?: ""} · $label")
                } else if (prev.getString(num) != status) {
                    alert("Zakázka $num", "Nový stav: $label")
                }
            }
        }
        prefs.edit().putString(SNAP_ORDERS, current.toString()).apply()

        // ── Řidiči ──────────────────────────────────────────────────────────
        val driversJson = JSONObject(apiGet("/api/v1/dispatch/drivers", apiKey))
        val darr = driversJson.getJSONArray("drivers")
        val currentDrivers = JSONObject()
        for (i in 0 until darr.length()) {
            val d = darr.getJSONObject(i)
            val id = d.getString("driverId")
            val name = if (d.isNull("name")) d.getString("email") else d.getString("name")
            val tracking = d.optBoolean("isTracking", false)
            currentDrivers.put(id, JSONObject().put("n", name).put("t", tracking))
        }

        val prevDriversRaw = prefs.getString(SNAP_DRIVERS, null)
        if (prevDriversRaw != null) {
            val prev = JSONObject(prevDriversRaw)
            for (id in currentDrivers.keys()) {
                val cur = currentDrivers.getJSONObject(id)
                val name = cur.getString("n")
                val tracking = cur.getBoolean("t")
                if (!prev.has(id)) {
                    if (tracking) alert("Řidič online", name)
                } else if (prev.getJSONObject(id).getBoolean("t") != tracking) {
                    alert(if (tracking) "Řidič online" else "Řidič offline", name)
                }
            }
        }
        prefs.edit().putString(SNAP_DRIVERS, currentDrivers.toString()).apply()
    }

    companion object {
        fun start(context: Context) {
            context.startForegroundService(Intent(context, MonitorService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MonitorService::class.java))
        }
    }
}
