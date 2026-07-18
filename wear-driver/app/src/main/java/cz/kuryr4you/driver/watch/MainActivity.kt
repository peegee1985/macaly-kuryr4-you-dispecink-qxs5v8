package cz.kuryr4you.driver.watch

import android.Manifest
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
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
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// ─── Shared constants & helpers ─────────────────────────────────────────────

val AMBER = Color(0xFFF59E0B)
val GREEN = Color(0xFF10B981)
val GRAY = Color(0xFF9CA3AF)
val RED = Color(0xFFEF4444)

val STATUS_LABELS = mapOf(
    "assigned" to "Přiřazeno",
    "pickup" to "Vyzvednutí",
    "transit" to "Na cestě",
)

fun statusColor(status: String): Color = when (status) {
    "assigned" -> AMBER
    "pickup" -> Color(0xFFFBBF24)
    "transit" -> GREEN
    else -> GRAY
}

fun formatTime(ts: Long): String {
    if (ts <= 0) return "—"
    return SimpleDateFormat("d.M. HH:mm", Locale.forLanguageTag("cs")).format(Date(ts))
}

fun navigateTo(context: Context, address: String) {
    try {
        context.startActivity(
            Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + Uri.encode(address)))
        )
    } catch (_: Exception) {
        try {
            context.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(address)))
            )
        } catch (_: Exception) {
        }
    }
}

fun dial(context: Context, phone: String) {
    try {
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
    } catch (_: Exception) {
    }
}

// ─── Activity ───────────────────────────────────────────────────────────────

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        setContent {
            MaterialTheme {
                App(
                    initialToken = prefs.getString(KEY_TOKEN, "") ?: "",
                    initialName = prefs.getString(KEY_NAME, "") ?: "",
                    saveAuth = { token, name ->
                        prefs.edit().putString(KEY_TOKEN, token).putString(KEY_NAME, name).apply()
                    },
                )
            }
        }
    }
}

sealed interface Screen {
    data object List : Screen
    data class MyDetail(val ride: MyRide) : Screen
    data class AvailDetail(val ride: AvailRide) : Screen
}

@Composable
fun App(initialToken: String, initialName: String, saveAuth: (String, String) -> Unit) {
    var token by remember { mutableStateOf(initialToken) }
    var name by remember { mutableStateOf(initialName) }
    var screen by remember { mutableStateOf<Screen>(Screen.List) }
    var reloadTick by remember { mutableStateOf(0) }

    if (token.isBlank()) {
        PairScreen { newToken, newName ->
            saveAuth(newToken, newName)
            token = newToken
            name = newName
        }
        return
    }

    when (val s = screen) {
        is Screen.List -> ListScreen(
            token = token,
            name = name,
            reloadTick = reloadTick,
            onMyRide = { screen = Screen.MyDetail(it) },
            onAvailRide = { screen = Screen.AvailDetail(it) },
            onRefresh = { reloadTick++ },
            onResetToken = {
                saveAuth("", "")
                token = ""
            },
        )
        is Screen.MyDetail -> MyRideScreen(token, s.ride) {
            reloadTick++
            screen = Screen.List
        }
        is Screen.AvailDetail -> AvailRideScreen(token, s.ride) {
            reloadTick++
            screen = Screen.List
        }
    }
}

// ─── Pairing ────────────────────────────────────────────────────────────────

@Composable
fun PairScreen(onPaired: (String, String) -> Unit) {
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val data = result.data ?: return@rememberLauncherForActivityResult
        val results = RemoteInput.getResultsFromIntent(data) ?: return@rememberLauncherForActivityResult
        val code = results.getCharSequence("pair_code")?.toString()?.trim().orEmpty()
        if (code.isNotBlank()) {
            loading = true
            error = null
            scope.launch {
                try {
                    val resp = apiPost("/api/v1/driver/pair", null, JSONObject().put("code", code))
                    onPaired(resp.getString("token"), resp.optString("name", "Řidič"))
                } catch (e: Exception) {
                    error = e.message ?: "Párování selhalo"
                }
                loading = false
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("K4Y Řidič", style = MaterialTheme.typography.title3, color = AMBER)
        Spacer(Modifier.height(8.dp))
        Text(
            "V mobilní aplikaci otevřete Profil → Připojit hodinky a zadejte zde 6místný kód.",
            style = MaterialTheme.typography.caption2,
            textAlign = TextAlign.Center,
        )
        val err = error
        if (err != null) {
            Spacer(Modifier.height(6.dp))
            Text(err, style = MaterialTheme.typography.caption2, color = RED, textAlign = TextAlign.Center)
        }
        Spacer(Modifier.height(12.dp))
        Chip(
            onClick = {
                if (loading) return@Chip
                val intent = RemoteInputIntentHelper.createActionRemoteInputIntent()
                val remoteInputs = listOf(
                    RemoteInput.Builder("pair_code").setLabel("Párovací kód").build()
                )
                RemoteInputIntentHelper.putRemoteInputsExtra(intent, remoteInputs)
                launcher.launch(intent)
            },
            label = { Text(if (loading) "Páruji…" else "Zadat kód") },
            colors = ChipDefaults.primaryChipColors(backgroundColor = AMBER),
        )
    }
}

// ─── List ───────────────────────────────────────────────────────────────────

@Composable
fun ListScreen(
    token: String,
    name: String,
    reloadTick: Int,
    onMyRide: (MyRide) -> Unit,
    onAvailRide: (AvailRide) -> Unit,
    onRefresh: () -> Unit,
    onResetToken: () -> Unit,
) {
    var myRides by remember { mutableStateOf<List<MyRide>>(emptyList()) }
    var available by remember { mutableStateOf<List<AvailRide>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var loaded by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(reloadTick) {
        loading = true
        error = null
        try {
            myRides = fetchMyRides(token)
            available = fetchAvailable(token)
            loaded = true
        } catch (e: Exception) {
            error = e.message ?: "Chyba připojení"
        }
        loading = false
    }

    if (loading && !loaded) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            CircularProgressIndicator()
        }
        return
    }

    ScalingLazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("K4Y Řidič", style = MaterialTheme.typography.title3, color = AMBER)
                if (name.isNotBlank()) {
                    Text(name, style = MaterialTheme.typography.caption2, color = GRAY)
                }
            }
        }

        val err = error
        if (err != null) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(err, color = RED, style = MaterialTheme.typography.caption1)
                }
            }
            if (err.contains("token", ignoreCase = true)) {
                item {
                    Chip(
                        onClick = onResetToken,
                        label = { Text("Spárovat znovu") },
                        colors = ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        item {
            Text(
                "Moje zakázky (${myRides.size})",
                style = MaterialTheme.typography.caption1,
                color = AMBER,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            )
        }
        if (myRides.isEmpty()) {
            item {
                Text(
                    "Žádné aktivní zakázky",
                    style = MaterialTheme.typography.caption2,
                    color = GRAY,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        items(myRides) { ride ->
            Card(onClick = { onMyRide(ride) }, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            ride.rideNumber,
                            style = MaterialTheme.typography.caption1,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            STATUS_LABELS[ride.status] ?: ride.status,
                            style = MaterialTheme.typography.caption2,
                            color = statusColor(ride.status),
                        )
                    }
                    Text(
                        ride.targetAddress(),
                        style = MaterialTheme.typography.caption2,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        ride.targetLabel() + ": " + formatTime(ride.targetTime()),
                        style = MaterialTheme.typography.caption3,
                        color = GRAY,
                    )
                }
            }
        }

        item {
            Text(
                "Volné zakázky (${available.size})",
                style = MaterialTheme.typography.caption1,
                color = GREEN,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            )
        }
        if (available.isEmpty()) {
            item {
                Text(
                    "Žádné volné zakázky",
                    style = MaterialTheme.typography.caption2,
                    color = GRAY,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        items(available) { ride ->
            Card(onClick = { onAvailRide(ride) }, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(ride.rideNumber, style = MaterialTheme.typography.caption1, color = GREEN)
                    Text(
                        ride.pickupAddress,
                        style = MaterialTheme.typography.caption2,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "Vyzvednout: " + formatTime(ride.requestedPickupAt),
                        style = MaterialTheme.typography.caption3,
                        color = GRAY,
                    )
                }
            }
        }

        item {
            Chip(
                onClick = onRefresh,
                label = { Text(if (loading) "Načítám…" else "Aktualizovat") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        item {
            MonitorToggle()
        }
    }
}

// ─── My ride detail ─────────────────────────────────────────────────────────

@Composable
fun MyRideScreen(token: String, ride: MyRide, onDone: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var working by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun advance(newStatus: String) {
        if (working) return
        working = true
        error = null
        scope.launch {
            try {
                apiPost(
                    "/api/v1/driver/status", token,
                    JSONObject().put("rideId", ride.rideId).put("status", newStatus),
                )
                onDone()
            } catch (e: Exception) {
                error = e.message ?: "Akce se nezdařila"
            }
            working = false
        }
    }

    ScalingLazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Text(
                ride.rideNumber,
                style = MaterialTheme.typography.title3,
                color = AMBER,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Text(
                STATUS_LABELS[ride.status] ?: ride.status,
                style = MaterialTheme.typography.caption1,
                color = statusColor(ride.status),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        val err = error
        if (err != null) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(err, color = RED, style = MaterialTheme.typography.caption2)
                }
            }
        }
        item {
            Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Vyzvednutí", style = MaterialTheme.typography.caption3, color = GRAY)
                    Text(ride.pickupAddress, style = MaterialTheme.typography.caption2)
                    Text(formatTime(ride.requestedPickupAt), style = MaterialTheme.typography.caption3, color = GRAY)
                }
            }
        }
        item {
            Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Doručení", style = MaterialTheme.typography.caption3, color = GRAY)
                    Text(ride.deliveryAddress, style = MaterialTheme.typography.caption2)
                    Text(formatTime(ride.requestedDeliveryAt), style = MaterialTheme.typography.caption3, color = GRAY)
                }
            }
        }
        val notes = ride.notes
        if (!notes.isNullOrBlank()) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text("Poznámka", style = MaterialTheme.typography.caption3, color = GRAY)
                        Text(notes, style = MaterialTheme.typography.caption2)
                    }
                }
            }
        }

        when (ride.status) {
            "assigned" -> item {
                SlideToConfirm(
                    label = if (working) "Odesílám…" else "Zahájit vyzvednutí",
                    color = AMBER,
                    enabled = !working,
                ) { advance("pickup") }
            }
            "pickup" -> item {
                SlideToConfirm(
                    label = if (working) "Odesílám…" else "Vyzvednuto → Na cestě",
                    color = GREEN,
                    enabled = !working,
                ) { advance("transit") }
            }
            "transit" -> item {
                Text(
                    "Doručení dokončete v telefonu (fotka + podpis)",
                    style = MaterialTheme.typography.caption2,
                    color = GRAY,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                )
            }
        }

        item {
            Chip(
                onClick = { navigateTo(context, ride.targetAddress()) },
                label = { Text("Navigovat") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        val phone = ride.targetPhone()
        if (phone.isNotBlank()) {
            item {
                Chip(
                    onClick = { dial(context, phone) },
                    label = { Text("Zavolat kontaktu") },
                    colors = ChipDefaults.secondaryChipColors(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        item {
            Chip(
                onClick = onDone,
                label = { Text("Zpět") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

// ─── Available ride detail ──────────────────────────────────────────────────

@Composable
fun AvailRideScreen(token: String, ride: AvailRide, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var working by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun act(path: String) {
        if (working) return
        working = true
        error = null
        scope.launch {
            try {
                apiPost(path, token, JSONObject().put("rideId", ride.rideId))
                onDone()
            } catch (e: Exception) {
                error = e.message ?: "Akce se nezdařila"
            }
            working = false
        }
    }

    ScalingLazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Text(
                ride.rideNumber,
                style = MaterialTheme.typography.title3,
                color = GREEN,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        val err = error
        if (err != null) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(err, color = RED, style = MaterialTheme.typography.caption2)
                }
            }
        }
        item {
            Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Vyzvednutí", style = MaterialTheme.typography.caption3, color = GRAY)
                    Text(ride.pickupAddress, style = MaterialTheme.typography.caption2)
                    Text(formatTime(ride.requestedPickupAt), style = MaterialTheme.typography.caption3, color = GRAY)
                }
            }
        }
        item {
            Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Doručení", style = MaterialTheme.typography.caption3, color = GRAY)
                    Text(ride.deliveryAddress, style = MaterialTheme.typography.caption2)
                    Text(formatTime(ride.requestedDeliveryAt), style = MaterialTheme.typography.caption3, color = GRAY)
                }
            }
        }
        if (ride.cargoDescription.isNotBlank()) {
            item {
                Card(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text("Náklad", style = MaterialTheme.typography.caption3, color = GRAY)
                        Text(ride.cargoDescription, style = MaterialTheme.typography.caption2)
                    }
                }
            }
        }
        item {
            SlideToConfirm(
                label = if (working) "Odesílám…" else "Přijmout zakázku",
                color = GREEN,
                enabled = !working,
            ) { act("/api/v1/driver/accept") }
        }
        item {
            Chip(
                onClick = { act("/api/v1/driver/reject") },
                label = { Text("✕ Odmítnout") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Chip(
                onClick = onDone,
                label = { Text("Zpět") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

// ─── Monitor toggle ─────────────────────────────────────────────────────────

@Composable
fun MonitorToggle() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE) }
    var enabled by remember { mutableStateOf(prefs.getBoolean(KEY_MONITOR, false)) }

    fun setMonitor(on: Boolean) {
        enabled = on
        prefs.edit().putBoolean(KEY_MONITOR, on).apply()
        if (on) MonitorService.start(context) else MonitorService.stop(context)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) setMonitor(true)
    }

    Chip(
        onClick = {
            if (enabled) {
                setMonitor(false)
            } else {
                val needsPermission = Build.VERSION.SDK_INT >= 33 &&
                    context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                if (needsPermission) {
                    permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    setMonitor(true)
                }
            }
        },
        label = { Text(if (enabled) "Hlídání: zapnuto" else "Hlídání: vypnuto") },
        colors = if (enabled) {
            ChipDefaults.primaryChipColors(backgroundColor = AMBER)
        } else {
            ChipDefaults.secondaryChipColors()
        },
        modifier = Modifier.fillMaxWidth(),
    )
}
