package com.natasha.italytrip

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.mapbox.common.MapboxOptions
import com.mapbox.geojson.Point
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.animation.viewport.rememberMapViewportState
import com.mapbox.maps.extension.compose.annotation.generated.CircleAnnotation
import com.mapbox.maps.extension.compose.annotation.generated.PointAnnotation
import com.mapbox.maps.extension.compose.annotation.generated.PolylineAnnotation
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive

private val MapAccent = Color(0xFF2A7089)
private val MapRoute = Color(0xFFD99A4E)

enum class NativeMapLayer(val label: String) { ROUTE("Маршрут"), SIGHTS("Места"), RESTAURANTS("Рестораны") }
private data class NativeMapPoint(val name: String, val point: Point)

@Composable
fun NativeMapPanel(token: String?, data: JsonObject, initialLayer: NativeMapLayer, allowLocation: Boolean = false, compactLocationButton: Boolean = false) {
    val layer = initialLayer
    var location by remember { mutableStateOf<Point?>(null) }
    var locating by remember { mutableStateOf(false) }
    var locationError by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    fun hasPermission() = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission")
    fun locate() {
        if (!hasPermission()) return
        locating = true
        locationError = null
        val client = LocationServices.getFusedLocationProviderClient(context)
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, CancellationTokenSource().token)
            .addOnSuccessListener { value ->
                locating = false
                if (value != null) location = Point.fromLngLat(value.longitude, value.latitude)
                else locationError = "Не удалось определить местоположение"
            }
            .addOnFailureListener { locating = false; locationError = "Не удалось определить местоположение" }
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
        if (permissions.values.any { it }) locate() else locationError = "Доступ к геолокации не разрешён"
    }
    val points = remember(data, layer) { mapPoints(data, layer) }
    val routePoints = if (allowLocation && location != null) listOf(NativeMapPoint("Вы здесь", location!!)) + points else points

    Column(Modifier.fillMaxWidth()) {
        if (allowLocation) Row(Modifier.fillMaxWidth().padding(bottom = 10.dp), horizontalArrangement = Arrangement.End) {
            Button(
                onClick = {
                    if (hasPermission()) locate()
                    else permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                },
                enabled = !locating,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2F8A6A)),
                shape = if (compactLocationButton) RoundedCornerShape(50) else RoundedCornerShape(10.dp),
                contentPadding = if (compactLocationButton) androidx.compose.foundation.layout.PaddingValues(0.dp) else ButtonDefaults.ContentPadding,
                modifier = if (compactLocationButton) Modifier.size(48.dp) else Modifier,
            ) {
                if (locating) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
                else Text(if (compactLocationButton) if (location != null) "●" else "⌖" else if (location != null) "Вы здесь" else "Моё местоположение", fontSize = if (compactLocationButton) 22.sp else 14.sp)
            }
        }
        locationError?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp)) }
        if (token.isNullOrBlank()) {
            Card(Modifier.fillMaxWidth().height(420.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(Color(0xFFDBEAE8))) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Токен Mapbox недоступен", color = Color(0xFF5F7C7E)) }
            }
        } else {
            MapboxOptions.accessToken = token
            key(layer, location) {
            val center = location ?: if (layer == NativeMapLayer.ROUTE) Point.fromLngLat(12.1, 46.0) else points.firstOrNull()?.point ?: Point.fromLngLat(12.5, 41.9)
            val viewport = rememberMapViewportState {
                setCameraOptions { center(center); zoom(if (location != null) 14.5 else if (layer == NativeMapLayer.ROUTE) 4.35 else 11.5) }
            }
            Card(Modifier.fillMaxWidth().height(if (layer == NativeMapLayer.ROUTE) 390.dp else 350.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(Color(0xFFDBEAE8))) {
                MapboxMap(Modifier.fillMaxSize(), mapViewportState = viewport) {
                    if (routePoints.size > 1) PolylineAnnotation(points = routePoints.map { it.point }) {
                        lineColor = if (layer == NativeMapLayer.ROUTE) MapRoute else MapAccent
                        lineWidth = if (layer == NativeMapLayer.ROUTE) 4.0 else 3.0
                    }
                    points.forEachIndexed { index, entry ->
                        CircleAnnotation(point = entry.point) {
                            circleColor = MapAccent
                            circleRadius = 13.0
                            circleStrokeColor = Color.White
                            circleStrokeWidth = 2.0
                        }
                        PointAnnotation(point = entry.point) {
                            textField = if (layer == NativeMapLayer.ROUTE && index == 0) "⌂" else (index + 1).toString()
                            textColor = Color.White
                            textSize = 11.0
                        }
                    }
                    location?.let { current ->
                        CircleAnnotation(point = current) {
                            circleColor = Color(0xFF1565C0)
                            circleRadius = 10.0
                            circleStrokeColor = Color.White
                            circleStrokeWidth = 3.0
                        }
                    }
                }
            }
            }
        }
        Text("${points.size} точек${if (location != null) " · местоположение найдено" else ""}", Modifier.padding(top = 9.dp), color = Color(0xFF5F7C7E), fontSize = 12.sp)
    }
}

private fun mapPoints(data: JsonObject, layer: NativeMapLayer): List<NativeMapPoint> = when (layer) {
    NativeMapLayer.ROUTE -> {
        val cityPoints = mapOf(
            "Прага" to Point.fromLngLat(14.44, 50.08),
            "Зальцбург, Австрия" to Point.fromLngLat(13.04, 47.8),
            "Верона, Италия" to Point.fromLngLat(10.99, 45.44),
            "Рим, Италия" to Point.fromLngLat(12.5, 41.9),
            "Фильине-Вальдарно, Тоскана" to Point.fromLngLat(11.47, 43.62),
            "Кьоджа, Италия" to Point.fromLngLat(12.28, 45.22),
            "Милан, Италия" to Point.fromLngLat(9.19, 45.46),
            "Вальдидентро, Альпы" to Point.fromLngLat(10.28, 46.48),
            "Мюнхен, Германия" to Point.fromLngLat(11.6, 48.15),
        )
        buildList {
            add(NativeMapPoint("Прага", cityPoints.getValue("Прага")))
            data.arrayValue("lodging").forEach { element ->
                val city = element.objectValue().stringValue("city")
                cityPoints[city]?.let { add(NativeMapPoint(city, it)) }
            }
            add(NativeMapPoint("Прага", cityPoints.getValue("Прага")))
        }
    }
    NativeMapLayer.SIGHTS -> data.arrayValue("sights").mapNotNull { element -> element.objectValue().mapPoint("name") }
    NativeMapLayer.RESTAURANTS -> data.arrayValue("restaurants").mapNotNull { element -> element.objectValue().mapPoint("name") }
}

private fun JsonObject.mapPoint(label: String): NativeMapPoint? {
    val coordinates = this["lnglat"] as? JsonArray ?: return null
    if (coordinates.size != 2) return null
    val lng = coordinates[0].jsonPrimitive.doubleOrNull ?: return null
    val lat = coordinates[1].jsonPrimitive.doubleOrNull ?: return null
    if (lng !in -180.0..180.0 || lat !in -90.0..90.0) return null
    return NativeMapPoint(stringValue(label), Point.fromLngLat(lng, lat))
}

private fun JsonObject.arrayValue(name: String): JsonArray = this[name] as? JsonArray ?: JsonArray(emptyList())
private fun kotlinx.serialization.json.JsonElement.objectValue(): JsonObject = this as? JsonObject ?: JsonObject(emptyMap())
private fun JsonObject.stringValue(name: String): String = this[name]?.jsonPrimitive?.contentOrNull ?: ""
