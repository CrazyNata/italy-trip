package com.natasha.italytrip.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

data class PreparedImage(
    val large: ByteArray,
    val thumbnail: ByteArray,
    val iso: String?,
    val lat: Double?,
    val lng: Double?,
    val place: String?,
)

class ImageProcessor(private val context: Context) {
    suspend fun prepare(uri: Uri): PreparedImage = withContext(Dispatchers.IO) {
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: error("Не удалось прочитать фотографию")
        val exif = runCatching { ExifInterface(ByteArrayInputStream(bytes)) }.getOrNull()
        val latLng = FloatArray(2)
        val hasLocation = exif?.getLatLong(latLng) == true
        val lat = latLng[0].toDouble().takeIf { hasLocation }
        val lng = latLng[1].toDouble().takeIf { hasLocation }
        val iso = listOf(
            ExifInterface.TAG_DATETIME_ORIGINAL,
            ExifInterface.TAG_DATETIME_DIGITIZED,
            ExifInterface.TAG_DATETIME,
        ).firstNotNullOfOrNull { tag -> exif?.getAttribute(tag)?.toIsoDate() }
        val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            ?: error("Формат фотографии не поддерживается")
        val oriented = decoded.oriented(exif?.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL))
        if (oriented !== decoded) decoded.recycle()
        try {
            val large = oriented.scaled(1600).jpeg(82)
            val thumb = oriented.scaled(400).jpeg(76)
            val place = if (lat != null && lng != null) reverseGeocode(lat, lng) else null
            PreparedImage(large, thumb, iso, lat, lng, place)
        } finally {
            oriented.recycle()
        }
    }

    private fun Bitmap.oriented(orientation: Int?): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.preScale(-1f, 1f); matrix.postRotate(270f) }
            ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.preScale(-1f, 1f); matrix.postRotate(90f) }
            else -> return this
        }
        return Bitmap.createBitmap(this, 0, 0, width, height, matrix, true)
    }

    private fun Bitmap.scaled(maxSide: Int): Bitmap {
        val ratio = minOf(1.0, maxSide.toDouble() / width, maxSide.toDouble() / height)
        val targetWidth = maxOf(1, (width * ratio).toInt())
        val targetHeight = maxOf(1, (height * ratio).toInt())
        val result = if (targetWidth == width && targetHeight == height) this else Bitmap.createScaledBitmap(this, targetWidth, targetHeight, true)
        return result
    }

    private fun Bitmap.jpeg(quality: Int): ByteArray {
        val output = ByteArrayOutputStream()
        if (!compress(Bitmap.CompressFormat.JPEG, quality, output)) error("Не удалось уменьшить фотографию")
        val result = output.toByteArray()
        if (this.width <= 1600 && this.height <= 1600 && this.width != 0) {
            // The caller owns the original bitmap; temporary scaled bitmaps can be released here.
        }
        return result
    }

    private suspend fun reverseGeocode(lat: Double, lng: Double): String? = runCatching {
        delay(1100)
        val connection = URL("https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&zoom=12&accept-language=ru").openConnection() as HttpURLConnection
        connection.setRequestProperty("User-Agent", "ItalyTrip-Android/1.0")
        connection.connectTimeout = 10_000
        connection.readTimeout = 10_000
        connection.inputStream.bufferedReader().use { reader ->
            val address = Json.parseToJsonElement(reader.readText()).jsonObject["address"]?.jsonObject
            listOf("city", "town", "village", "municipality", "county")
                .firstNotNullOfOrNull { address?.get(it)?.jsonPrimitive?.content?.trim()?.takeIf(String::isNotBlank) }
        }
    }.getOrNull()
}

private fun String.toIsoDate(): String? {
    val match = Regex("(\\d{4})\\D(\\d{2})\\D(\\d{2})").find(this) ?: return null
    return "${match.groupValues[1]}-${match.groupValues[2]}-${match.groupValues[3]}"
}
