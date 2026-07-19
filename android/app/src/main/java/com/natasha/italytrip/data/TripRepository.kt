package com.natasha.italytrip.data

import android.content.Intent
import android.content.Context
import android.net.Uri
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.FlowType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.handleDeeplinks
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.util.UUID

private const val SUPABASE_URL = "https://hxcavgtlucyoqudbrgse.supabase.co"
private const val SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IyGTMYZyxWXr0GoctL83YA_wSgoSj1-"

@Serializable
data class TripStateRow(val payload: JsonObject)

@Serializable
private data class TripStateWrite(
    val id: String,
    val payload: JsonObject,
    val updated_at: String,
)

@Serializable
private data class AdminRow(val email: String)

@Serializable
private data class ConfigRow(val value: String)

data class UploadedPhoto(
    val id: String,
    val fullUrl: String,
    val fullPath: String,
    val previewUrl: String,
    val previewPath: String,
    val iso: String?,
    val lat: Double?,
    val lng: Double?,
    val place: String?,
)

class TripRepository(context: Context) {
    private val preferences = context.getSharedPreferences("italy_trip", Context.MODE_PRIVATE)
    private val client = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) {
        install(Auth) {
            scheme = "italytrip"
            host = "login-callback"
            flowType = FlowType.PKCE
        }
        install(Postgrest)
        install(Storage)
    }

    suspend fun sessionEmail(): String? {
        val status = client.auth.sessionStatus.first { it !is SessionStatus.Initializing }
        return (status as? SessionStatus.Authenticated)?.session?.user?.email
    }

    fun rememberLogin(): Boolean = preferences.getBoolean("remember_login", true)

    fun setRememberLogin(remember: Boolean) {
        preferences.edit().putBoolean("remember_login", remember).apply()
    }

    fun backgroundHex(): String = preferences.getString("background_hex", "#F7F2EB") ?: "#F7F2EB"

    fun setBackgroundHex(hex: String) {
        preferences.edit().putString("background_hex", hex).apply()
    }

    suspend fun signIn(email: String, password: String) {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signUp(email: String, password: String) {
        client.auth.signUpWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signInWithGoogle() = client.auth.signInWith(Google)

    suspend fun signOut() = client.auth.signOut()

    suspend fun changePassword(password: String) {
        client.auth.updateUser { this.password = password }
    }

    fun avatarUrl(): String? = client.auth.currentUserOrNull()
        ?.userMetadata?.get("avatar_url")?.jsonPrimitive?.contentOrNull
        ?.takeIf { it.isNotBlank() }

    suspend fun uploadAvatar(uri: Uri): String {
        val user = client.auth.currentUserOrNull() ?: error("Пользователь не авторизован")
        val image = ImageProcessor(preferencesContext).prepare(uri)
        val path = "avatars/${user.id}_${System.currentTimeMillis()}.jpg"
        val bucket = client.storage["place-photos"]
        bucket.upload(path, image.thumbnail) { upsert = true }
        val publicUrl = bucket.publicUrl(path)
        client.auth.updateUser { data = JsonObject(mapOf("avatar_url" to JsonPrimitive(publicUrl))) }
        return publicUrl
    }

    fun handleDeeplink(intent: Intent, onSuccess: () -> Unit) {
        client.handleDeeplinks(intent) { onSuccess() }
    }

    fun cachedTrip(): JsonObject? = runCatching {
        preferences.getString("payload", null)?.let { Json.parseToJsonElement(it).jsonObject }
    }.getOrNull()

    suspend fun loadTrip(): JsonObject {
        val payload = client.from("trip_state")
            .select { filter { eq("id", "main") } }
            .decodeSingle<TripStateRow>()
            .payload
        cacheTrip(payload)
        return payload
    }

    suspend fun saveTrip(payload: JsonObject) {
        cacheTrip(payload)
        client.from("trip_state").upsert(
            TripStateWrite("main", payload, Instant.now().toString()),
        ) { onConflict = "id" }
    }

    private fun cacheTrip(payload: JsonObject) {
        preferences.edit().putString("payload", payload.toString()).apply()
    }

    // RLS exposes an admin row only to the owner, matching the web application.
    suspend fun isOwner(): Boolean = client.from("admins")
        .select()
        .decodeList<AdminRow>()
        .isNotEmpty()

    suspend fun mapboxToken(): String? = runCatching {
        client.from("app_config")
            .select { filter { eq("key", "mapbox_token") } }
            .decodeSingle<ConfigRow>()
            .value
            .takeIf { it.isNotBlank() }
    }.getOrNull()

    suspend fun uploadTripPhoto(uri: Uri): UploadedPhoto {
        return uploadPhoto(uri, "trip", "ph")
    }

    suspend fun uploadPlacePhoto(uri: Uri, family: String): UploadedPhoto {
        require(family in setOf("lodging", "sights", "restaurants"))
        return uploadPhoto(uri, family, "photo")
    }

    private suspend fun uploadPhoto(uri: Uri, family: String, idPrefix: String): UploadedPhoto {
        val image = ImageProcessor(preferencesContext).prepare(uri)
        val id = "${idPrefix}_${System.currentTimeMillis().toString(36)}_${UUID.randomUUID().toString().take(6)}"
        val fullPath = "$family/$id/large.jpg"
        val previewPath = "$family/$id/thumb.jpg"
        val bucket = client.storage["place-photos"]
        bucket.upload(fullPath, image.large) { upsert = false }
        try {
            bucket.upload(previewPath, image.thumbnail) { upsert = false }
        } catch (error: Throwable) {
            runCatching { bucket.delete(fullPath) }
            throw error
        }
        return UploadedPhoto(
            id = id,
            fullUrl = bucket.publicUrl(fullPath),
            fullPath = fullPath,
            previewUrl = bucket.publicUrl(previewPath),
            previewPath = previewPath,
            iso = image.iso,
            lat = image.lat,
            lng = image.lng,
            place = image.place,
        )
    }

    suspend fun deletePhoto(fullPath: String, previewPath: String?) {
        val paths = listOfNotNull(fullPath.takeIf { it.isNotBlank() }, previewPath?.takeIf { it.isNotBlank() })
        if (paths.isNotEmpty()) client.storage["place-photos"].delete(*paths.toTypedArray())
    }

    private val preferencesContext: Context = context.applicationContext
}
