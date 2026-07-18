package cz.kuryr4you.driver.watch

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

const val CHANNEL_ONGOING = "k4y_driver_monitor"
const val CHANNEL_ALERTS = "k4y_driver_alerts"
const val SNAP_MY = "snap_my_rides"
const val SNAP_AVAIL = "snap_available"
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
                        // síť nedostupná / token neplatný — zkusíme příště
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
            NotificationChannel(CHANNEL_ONGOING, "Hlídání zakázek", NotificationManager.IMPORTANCE_LOW)
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ALERTS, "Upozornění na zakázky", NotificationManager.IMPORTANCE_HIGH).apply {
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
            .setContentTitle("K4Y hlídá zakázky")
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
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        if (token.isBlank()) return

        // ── Volné zakázky: upozorni na nově dostupné ────────────────────────
        val available = fetchAvailable(token)
        val currentAvail = JSONObject()
        for (r in available) currentAvail.put(r.rideId, r.rideNumber)

        val prevAvailRaw = prefs.getString(SNAP_AVAIL, null)
        if (prevAvailRaw != null) {
            val prev = JSONObject(prevAvailRaw)
            for (r in available) {
                if (!prev.has(r.rideId)) {
                    alert("Nová volná zakázka ${r.rideNumber}", r.pickupAddress)
                }
            }
        }
        prefs.edit().putString(SNAP_AVAIL, currentAvail.toString()).apply()

        // ── Moje zakázky: nově přiřazené a změny stavu ──────────────────────
        val myRides = fetchMyRides(token)
        val currentMy = JSONObject()
        for (r in myRides) currentMy.put(r.rideId, r.status)

        val prevMyRaw = prefs.getString(SNAP_MY, null)
        if (prevMyRaw != null) {
            val prev = JSONObject(prevMyRaw)
            for (r in myRides) {
                if (!prev.has(r.rideId)) {
                    alert("Nová přiřazená zakázka ${r.rideNumber}", r.pickupAddress)
                } else if (prev.getString(r.rideId) != r.status) {
                    alert("Zakázka ${r.rideNumber}", "Nový stav: ${STATUS_LABELS[r.status] ?: r.status}")
                }
            }
        }
        prefs.edit().putString(SNAP_MY, currentMy.toString()).apply()
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
