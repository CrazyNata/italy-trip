package com.natasha.italytrip

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.net.HttpURLConnection
import java.net.URL

private data class WeatherCity(val city: String, val lat: Double, val lng: Double, val image: String, val iso: String?)
private data class WeatherValue(val high: Double, val low: Double, val code: Int)
private val WeatherDisplayFont = FontFamily(Font(R.font.playfair_display_600, FontWeight.SemiBold))

@Composable
fun WeatherSection(data: JsonObject) {
    var tripMode by remember { mutableStateOf(true) }
    val cities = remember(data) { weatherCities(data) }
    val weather by produceState<Map<String, WeatherValue?>>(emptyMap(), cities, tripMode) {
        value = withContext(Dispatchers.IO) { cities.associate { city -> city.city to loadWeather(city, tripMode) } }
    }
    Column {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Погода", Modifier.weight(1f), fontFamily = WeatherDisplayFont, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF26221D))
            Row(Modifier.background(Color(0xFFECE4D6), RoundedCornerShape(11.dp)).padding(4.dp)) {
                WeatherMode("В поездке", tripMode) { tripMode = true }
                WeatherMode("Сейчас", !tripMode) { tripMode = false }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 10.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            cities.forEach { city ->
                val current = weather[city.city]
                Column(
                    Modifier.width(112.dp).height(104.dp).background(Color(0xFFFCFAF5), RoundedCornerShape(16.dp)).border(1.dp, Color(0xFFE5DDD0), RoundedCornerShape(16.dp)).padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(weatherSymbol(current?.code), color = if (current?.code == 0) Color(0xFFD99A4E) else Color(0xFF8A8479), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(city.city.substringBefore(','), Modifier.padding(top = 4.dp), color = Color(0xFF26221D), fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1)
                    Text(if (current == null) "…" else "${current.high.toInt()}° / ${current.low.toInt()}°", color = Color(0xFF8A8479), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun WeatherMode(label: String, selected: Boolean, click: () -> Unit) {
    Text(
        label,
        Modifier.background(if (selected) Color(0xFFB5623C) else Color.Transparent, RoundedCornerShape(8.dp)).clickable(onClick = click).padding(horizontal = 14.dp, vertical = 8.dp),
        color = if (selected) Color.White else Color(0xFF9A9284), fontSize = 13.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
    )
}

private fun weatherSymbol(code: Int?): String = when (code) { 0 -> "☀"; in 1..3 -> "☁"; in 51..82 -> "☂"; else -> "☀" }

private fun weatherCities(data: JsonObject): List<WeatherCity> {
    val coords = mapOf(
        "Прага, Чехия" to Triple(50.08, 14.44, "prague"), "Зальцбург, Австрия" to Triple(47.8, 13.04, "salzburg"),
        "Верона, Италия" to Triple(45.44, 10.99, "verona"), "Рим, Италия" to Triple(41.9, 12.5, "rome"),
        "Фильине-Вальдарно, Тоскана" to Triple(43.62, 11.47, "figline"), "Кьоджа, Италия" to Triple(45.22, 12.28, "chioggia"),
        "Милан, Италия" to Triple(45.46, 9.19, "milan"), "Вальдидентро, Альпы" to Triple(46.48, 10.28, "valdidentro"),
        "Мюнхен, Германия" to Triple(48.15, 11.6, "munich"),
    )
    val days = data["days"]?.jsonArray.orEmpty()
    val route = listOf("Прага, Чехия") + data["lodging"]?.jsonArray.orEmpty().mapNotNull { it.jsonObject["city"]?.jsonPrimitive?.content }
    return route.distinct().mapNotNull { city -> coords[city]?.let { point ->
        val short = city.substringBefore(',')
        val iso = days.firstOrNull { it.jsonObject["city"]?.jsonPrimitive?.content?.contains(short) == true }?.jsonObject?.get("iso")?.jsonPrimitive?.content
        WeatherCity(city, point.first, point.second, point.third, iso)
    } }
}

private fun loadWeather(city: WeatherCity, tripMode: Boolean): WeatherValue? = runCatching {
    val url = if (tripMode && city.iso != null) {
        val historical = "2025-${city.iso.substring(5)}"
        "https://archive-api.open-meteo.com/v1/archive?latitude=${city.lat}&longitude=${city.lng}&start_date=$historical&end_date=$historical&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"
    } else "https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1"
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 10_000
    connection.readTimeout = 10_000
    val daily = connection.inputStream.bufferedReader().use { Json.parseToJsonElement(it.readText()).jsonObject["daily"]?.jsonObject } ?: return null
    WeatherValue(
        daily["temperature_2m_max"]?.jsonArray?.firstOrNull()?.jsonPrimitive?.doubleOrNull ?: return null,
        daily["temperature_2m_min"]?.jsonArray?.firstOrNull()?.jsonPrimitive?.doubleOrNull ?: return null,
        daily["weather_code"]?.jsonArray?.firstOrNull()?.jsonPrimitive?.intOrNull ?: return null,
    )
}.getOrNull()

private fun weatherLabel(code: Int): String = when (code) {
    0 -> "Ясно"
    1, 2 -> "Малооблачно"
    3 -> "Пасмурно"
    in 45..48 -> "Туман"
    in 51..67, in 80..82 -> "Дождь"
    in 71..86 -> "Снег"
    else -> "Переменная погода"
}
