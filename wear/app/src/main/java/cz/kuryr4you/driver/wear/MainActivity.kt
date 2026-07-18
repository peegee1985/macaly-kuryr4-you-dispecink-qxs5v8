package cz.kuryr4you.driver.wear

import android.app.RemoteInput
import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.Card
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import androidx.wear.input.RemoteInputIntentHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ─── Data ───────────────────────────────────────────────────────────────────

const val API_BASE = "https://amicable-dogfish-440.eu-west-1.convex.site"
const val PREFS = "k4y_wear"
const val KEY_API = "api_key"

data class Summary(
    val activeOrders: Int,
    val pending: Int,
    val todayDelivered: Int,
    val activeDrivers: Int,
)

data class Order(
    val rideNumber: String,
    val status: String,
    val pickupAddress: String,
    val deliveryAddress: String,
    val requestedPickupAt: Long,
    val requestedDeliveryAt: Long,
    val notes: String?,
)

val STATUS_LABELS = mapOf(
    "pending" to "Čeká",
    "approved" to "Schváleno",
    "assigned" to "Přiřazeno",
    "pickup" to "Vyzvednutí",
    "transit" to "Na cestě",
    "delivered" to "Doručeno",
    "cancelled" to "Zrušeno",
    "failed" to "Selhalo",
)

val ACTIVE_STATUSES = setOf("pending", "approved", "assigned", "pickup", "transit")

fun statusColor(status: String): Color = when (status) {
    "pending" -> Color(0xFF9CA3AF)
    "approved" -> Color(0xFF60A5FA)
    "assigned" -> Color(0xFFF59E0B)
    "pickup" -> Color(0xFFFBBF24)
    "transit" -> Color(0xFF34D399)
    "delivered" -> Color(0xFF10B981)
    else -> Color(0xFFEF4444)
}

// ─── API client ─────────────────────────────────────────────────────────────

class ApiException(message: String) : Exception(message)

suspend fun apiGet(path: String, apiKey: String): String = withContext(Dispatchers.IO) {
    val conn = URL(API_BASE + path).openConnection() as HttpURLConnection
    try {
        conn.requestMethod = "GET"
        conn.connectTimeout = 10000
        conn.readTimeout = 15000
        conn.setRequestProperty("Authorization", "Bearer $apiKey")
        val code = conn.responseCode
        val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.readText() ?: ""
        if (code == 401) throw ApiException("Neplatný API klíč")
        if (code !in 200..299) throw ApiException("Chyba serveru ($code)")
        body
    } finally {
        conn.disconnect()
    }
}

suspend fun fetchSummary(apiKey: String): Summary {
    val json = JSONObject(apiGet("/api/v1/dispatch/summary", apiKey))
    val byStatus = json.getJSONObject("byStatus")
    val active = ACTIVE_STATUSES.sumOf { byStatus.optInt(it, 0) }
    return Summary(
        activeOrders = active,
        pending = byStatus.optInt("pending", 0),
        todayDelivered = json.optInt("todayDelivered", 0),
        activeDrivers = json.optInt("activeDrivers", 0),
    )
}

suspend fun fetchOrders(apiKey: String): List<Order> {
    val json = JSONObject(apiGet("/api/v1/dispatch/orders?status=all&limit=100", apiKey))
    val arr = json.getJSONArray("orders")
    val orders = mutableListOf<Order>()
    for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        if (o.getString("status") !in ACTIVE_STATUSES) continue
        orders.add(
            Order(
                rideNumber = o.getString("rideNumber"),
                status = o.getString("status"),
                pickupAddress = o.getString("pickupAddress"),
                deliveryAddress = o.getString("deliveryAddress"),
                requestedPickupAt = o.optLong("requestedPickupAt"),
                requestedDeliveryAt = o.optLong("requestedDeliveryAt"),
                notes = if (o.isNull("notes")) null else o.optString("notes"),
            )
        )
    }
    return orders.sortedBy { it.requestedDeliveryAt }
}

fun formatTime(ts: Long): String {
    if (ts <= 0) return "—"
    val fmt = SimpleDateFormat("d.M. HH:mm", Locale.forLanguageTag("cs"))
    return fmt.format(Date(ts))
}

// ─── UI ─────────────────────────────────────────────────────────────────────

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        setContent {
            MaterialTheme {
                App(
                    initialKey = prefs.getString(KEY_API, "") ?: "",
                    saveKey = { prefs.edit().putString(KEY_API, it).apply() },
                )
            }
        }
    }
}

sealed interface Screen {
    data object List : Screen
    data class Detail(val order: Order) : Screen
}

@Composable
fun App(initialKey: String, saveKey: (String) -> Unit) {
    var apiKey by remember { mutableStateOf(initialKey) }
    var screen by remember { mutableStateOf<Screen>(Screen.List) }

    if (apiKey.isBlank()) {
        SetupScreen { entered ->
            saveKey(entered)
            apiKey = entered
        }
        return
    }

    when (val s = screen) {
        is Screen.List -> ListScreen(
            apiKey = apiKey,
            onOrderClick = { screen = Screen.Detail(it) },
            onResetKey = {
                saveKey("")
                apiKey = ""
            },
        )
        is Screen.Detail -> DetailScreen(order = s.order, onBack = { screen = Screen.List })
    }
}

@Composable
fun SetupScreen(onKeyEntered: (String) -> Unit) {
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val data = result.data ?: return@rememberLauncherForActivityResult
        val results = RemoteInput.getResultsFromIntent(data) ?: return@rememberLauncherForActivityResult
        val entered = results.getCharSequence(KEY_API)?.toString()?.trim().orEmpty()
        if (entered.isNotBlank()) onKeyEntered(entered)
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
    ) {
        Text("K4Y Dispečink", style = MaterialTheme.typography.title3, color = Color(0xFFF59E0B))
        Spacer(Modifier.height(8.dp))
        Text(
            "Zadejte API klíč (k4ai_…) ze sekce AI přístup na webu.",
            style = MaterialTheme.typography.caption2,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        Chip(
            onClick = {
                val intent = RemoteInputIntentHelper.createActionRemoteInputIntent()
                val remoteInputs = listOf(
                    RemoteInput.Builder(KEY_API).setLabel("API klíč").build()
                )
                RemoteInputIntentHelper.putRemoteInputsExtra(intent, remoteInputs)
                launcher.launch(intent)
            },
            label = { Text("Zadat klíč") },
            colors = ChipDefaults.primaryChipColors(backgroundColor = Color(0xFFF59E0B)),
        )
    }
}

@Composable
fun ListScreen(apiKey: String, onOrderClick: (Order) -> Unit, onResetKey: () -> Unit) {
    var summary by remember { mutableStateOf<Summary?>(null) }
    var orders by remember { mutableStateOf<List<Order>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTick by remember { mutableStateOf(0) }

    LaunchedEffect(reloadTick) {
        loading = true
        error = null
        try {
            summary = fetchSummary(apiKey)
            orders = fetchOrders(apiKey)
        } catch (e: Exception) {
            error = e.message ?: "Chyba připojení"
        }
        loading = false
    }

    if (loading && summary == null) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
        ) {
            CircularProgressIndicator()
        }
        return
    }

    ScalingLazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Text(
                "K4Y Dispečink",
                style = MaterialTheme.typography.title3,
                color = Color(0xFFF59E0B),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        val err = error
        if (err != null) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(err, color = Color(0xFFEF4444), style = MaterialTheme.typography.caption1)
                }
            }
            if (err.contains("klíč")) {
                item {
                    Chip(
                        onClick = onResetKey,
                        label = { Text("Zadat jiný klíč") },
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        val s = summary
        if (s != null) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Column {
                        StatRow("Aktivní zakázky", s.activeOrders.toString(), Color(0xFFF59E0B))
                        StatRow("Čeká na schválení", s.pending.toString(), Color(0xFF9CA3AF))
                        StatRow("Dnes doručeno", s.todayDelivered.toString(), Color(0xFF10B981))
                        StatRow("Řidiči online", s.activeDrivers.toString(), Color(0xFF60A5FA))
                    }
                }
            }
        }

        if (orders.isEmpty() && error == null) {
            item {
                Text(
                    "Žádné aktivní zakázky",
                    style = MaterialTheme.typography.caption1,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                )
            }
        }

        items(orders) { order ->
            Card(onClick = { onOrderClick(order) }, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            order.rideNumber,
                            style = MaterialTheme.typography.caption1,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            STATUS_LABELS[order.status] ?: order.status,
                            style = MaterialTheme.typography.caption2,
                            color = statusColor(order.status),
                        )
                    }
                    Spacer(Modifier.height(2.dp))
                    Text(
                        order.deliveryAddress,
                        style = MaterialTheme.typography.caption2,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "Doručit: " + formatTime(order.requestedDeliveryAt),
                        style = MaterialTheme.typography.caption3,
                        color = Color(0xFF9CA3AF),
                    )
                }
            }
        }

        item {
            Chip(
                onClick = { reloadTick++ },
                label = { Text(if (loading) "Načítám…" else "Aktualizovat") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
fun StatRow(label: String, value: String, color: Color) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.caption2, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.caption1, color = color)
    }
}

@Composable
fun DetailScreen(order: Order, onBack: () -> Unit) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Text(
                order.rideNumber,
                style = MaterialTheme.typography.title3,
                color = Color(0xFFF59E0B),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Text(
                STATUS_LABELS[order.status] ?: order.status,
                style = MaterialTheme.typography.caption1,
                color = statusColor(order.status),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Vyzvednutí", style = MaterialTheme.typography.caption3, color = Color(0xFF9CA3AF))
                    Text(order.pickupAddress, style = MaterialTheme.typography.caption2)
                    Text(formatTime(order.requestedPickupAt), style = MaterialTheme.typography.caption3, color = Color(0xFF9CA3AF))
                }
            }
        }
        item {
            Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Doručení", style = MaterialTheme.typography.caption3, color = Color(0xFF9CA3AF))
                    Text(order.deliveryAddress, style = MaterialTheme.typography.caption2)
                    Text(formatTime(order.requestedDeliveryAt), style = MaterialTheme.typography.caption3, color = Color(0xFF9CA3AF))
                }
            }
        }
        val notes = order.notes
        if (!notes.isNullOrBlank()) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text("Poznámka", style = MaterialTheme.typography.caption3, color = Color(0xFF9CA3AF))
                        Text(notes, style = MaterialTheme.typography.caption2)
                    }
                }
            }
        }
        item {
            Chip(
                onClick = onBack,
                label = { Text("Zpět") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
