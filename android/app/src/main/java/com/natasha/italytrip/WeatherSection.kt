package com.natasha.italytrip

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
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

@Composable
fun WeatherSection(data: JsonObject) {
    var tripMode by remember { mutableStateOf(false) }
    val cities = remember(data) { weatherCities(data) }
    val weather by produceState<Map<String, WeatherValue?>>(emptyMap(), cities, tripMode) {
        value = withContext(Dispatchers.IO) { cities.associate { city -> city.city to loadWeather(city, tripMode) } }
    }
    Column {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Погода", fontSize = 22.sp, color = Color(0xFF173A3D))
                Text(if (tripMode) "На даты поездки по прошлому году" else "Текущая погода в городах маршрута", color = Color(0xFF5F7C7E), fontSize = 12.sp)
            }
            Row {
                if (!tripMode) Button(onClick = { tripMode = false }, shape = RoundedCornerShape(9.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 11.dp, vertical = 5.dp)) { Text("Сейчас", fontSize = 11.sp) }
                else TextButton(onClick = { tripMode = false }) { Text("Сейчас", fontSize = 11.sp) }
                if (tripMode) Button(onClick = { tripMode = true }, shape = RoundedCornerShape(9.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 11.dp, vertical = 5.dp)) { Text("В поездке", fontSize = 11.sp) }
                else TextButton(onClick = { tripMode = true }) { Text("В поездке", fontSize = 11.sp) }
            }
        }
        cities.chunked(2).forEach { rowCities ->
            Row(Modifier.fillMaxWidth().padding(top = 9.dp), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                rowCities.forEach { city ->
                    val current = weather[city.city]
                    Box(Modifier.weight(1f).height(135.dp).clip(RoundedCornerShape(16.dp))) {
                        AsyncImage(model = "https://crazynata.github.io/italy-trip/images/hero-${city.image}.webp", contentDescription = city.city, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = .2f), Color.Black.copy(alpha = .75f)))))
                        Text(if (current == null) "…" else "${current.high.toInt()}° / ${current.low.toInt()}°", Modifier.align(Alignment.TopStart).padding(10.dp), color = Color.White, fontSize = 13.sp)
                        Column(Modifier.align(Alignment.BottomStart).padding(10.dp)) {
                            Text(city.city, color = Color.White, fontSize = 13.sp, maxLines = 1)
                            Text(current?.let { weatherLabel(it.code) } ?: "загрузка…", color = Color.White.copy(alpha = .78f), fontSize = 10.sp)
                        }
                    }
                }
                if (rowCities.size == 1) Box(Modifier.weight(1f))
            }
        }
    }
}

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
