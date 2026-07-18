package cz.kuryr4you.driver.watch

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

const val API_BASE = "https://amicable-dogfish-440.eu-west-1.convex.site"
const val PREFS = "k4y_wear_driver"
const val KEY_TOKEN = "driver_token"
const val KEY_NAME = "driver_name"
const val KEY_MONITOR = "monitor_enabled"

class ApiException(message: String) : Exception(message)

data class MyRide(
    val rideId: String,
    val rideNumber: String,
    val status: String,
    val pickupAddress: String,
    val pickupContactPhone: String,
    val deliveryAddress: String,
    val deliveryContactPhone: String,
    val requestedPickupAt: Long,
    val requestedDeliveryAt: Long,
    val notes: String?,
) {
    // Cíl podle fáze: před vyzvednutím jedeme na pickup, pak na doručení
    fun targetAddress(): String = if (status == "transit") deliveryAddress else pickupAddress
    fun targetPhone(): String = if (status == "transit") deliveryContactPhone else pickupContactPhone
    fun targetTime(): Long = if (status == "transit") requestedDeliveryAt else requestedPickupAt
    fun targetLabel(): String = if (status == "transit") "Doručit" else "Vyzvednout"
}

data class AvailRide(
    val rideId: String,
    val rideNumber: String,
    val pickupAddress: String,
    val deliveryAddress: String,
    val requestedPickupAt: Long,
    val requestedDeliveryAt: Long,
    val cargoDescription: String,
)

private fun parseError(text: String, code: Int): String =
    try {
        JSONObject(text).optString("error", "Chyba serveru ($code)")
    } catch (_: Exception) {
        "Chyba serveru ($code)"
    }

suspend fun apiGet(path: String, token: String): String = withContext(Dispatchers.IO) {
    val conn = URL(API_BASE + path).openConnection() as HttpURLConnection
    try {
        conn.requestMethod = "GET"
        conn.connectTimeout = 10000
        conn.readTimeout = 15000
        conn.setRequestProperty("Authorization", "Bearer $token")
        val code = conn.responseCode
        val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.readText() ?: ""
        if (code !in 200..299) throw ApiException(parseError(body, code))
        body
    } finally {
        conn.disconnect()
    }
}

suspend fun apiPost(path: String, token: String?, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
    val conn = URL(API_BASE + path).openConnection() as HttpURLConnection
    try {
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 10000
        conn.readTimeout = 15000
        conn.setRequestProperty("Content-Type", "application/json")
        if (token != null) conn.setRequestProperty("Authorization", "Bearer $token")
        conn.outputStream.use { it.write(body.toString().toByteArray()) }
        val code = conn.responseCode
        val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.readText() ?: ""
        if (code !in 200..299) throw ApiException(parseError(text, code))
        try {
            JSONObject(text)
        } catch (_: Exception) {
            JSONObject()
        }
    } finally {
        conn.disconnect()
    }
}

fun parseMyRides(raw: String): List<MyRide> {
    val arr = JSONObject(raw).getJSONArray("rides")
    val rides = mutableListOf<MyRide>()
    for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        rides.add(
            MyRide(
                rideId = o.getString("rideId"),
                rideNumber = o.getString("rideNumber"),
                status = o.getString("status"),
                pickupAddress = o.getString("pickupAddress"),
                pickupContactPhone = o.optString("pickupContactPhone", ""),
                deliveryAddress = o.getString("deliveryAddress"),
                deliveryContactPhone = o.optString("deliveryContactPhone", ""),
                requestedPickupAt = o.optLong("requestedPickupAt"),
                requestedDeliveryAt = o.optLong("requestedDeliveryAt"),
                notes = if (o.isNull("notes")) null else o.optString("notes"),
            )
        )
    }
    return rides.sortedBy { it.targetTime() }
}

fun parseAvailRides(raw: String): List<AvailRide> {
    val arr = JSONObject(raw).getJSONArray("rides")
    val rides = mutableListOf<AvailRide>()
    for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        rides.add(
            AvailRide(
                rideId = o.getString("rideId"),
                rideNumber = o.getString("rideNumber"),
                pickupAddress = o.getString("pickupAddress"),
                deliveryAddress = o.getString("deliveryAddress"),
                requestedPickupAt = o.optLong("requestedPickupAt"),
                requestedDeliveryAt = o.optLong("requestedDeliveryAt"),
                cargoDescription = o.optString("cargoDescription", ""),
            )
        )
    }
    return rides.sortedBy { it.requestedPickupAt }
}

suspend fun fetchMyRides(token: String): List<MyRide> =
    parseMyRides(apiGet("/api/v1/driver/rides", token))

suspend fun fetchAvailable(token: String): List<AvailRide> =
    parseAvailRides(apiGet("/api/v1/driver/available", token))
