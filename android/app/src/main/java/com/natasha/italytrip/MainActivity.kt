package com.natasha.italytrip

import android.app.Application
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.BackHandler
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Typography
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBackIosNew
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.CompassCalibration
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.LocalBar
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.EventAvailable
import androidx.compose.material.icons.filled.FlightTakeoff
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.OpenInFull
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.core.view.WindowCompat
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.natasha.italytrip.data.TripRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch
import androidx.compose.runtime.produceState
import java.text.NumberFormat
import java.util.Locale

private val Ink = Color(0xFF26221D)
private val DefaultBackground = Color(0xFFF7F3EC)
private val CardWhite = Color(0xFFFCFAF5)
private val Accent = Color(0xFFB5623C)
private val Gold = Color(0xFFD99A4E)
private val Olive = Color(0xFF6B7355)
private val Muted = Color(0xFF8A8479)
private val Line = Color(0xFFE5DDD0)
private val Soft = Color(0xFFF1EBE0)
private val Track = Color(0xFFECE4D6)
private val ErrorRed = Color(0xFFC0492F)
private val AppShape = RoundedCornerShape(16.dp)
private val DisplayFont = FontFamily(
    Font(R.font.playfair_display_500, FontWeight.Medium),
    Font(R.font.playfair_display_600, FontWeight.SemiBold),
    Font(R.font.playfair_display_700, FontWeight.Bold),
    Font(R.font.playfair_display_800, FontWeight.ExtraBold),
    Font(R.font.playfair_display_900, FontWeight.Black),
)
private val UiFont = FontFamily(
    Font(R.font.manrope_400, FontWeight.Normal),
    Font(R.font.manrope_500, FontWeight.Medium),
    Font(R.font.manrope_600, FontWeight.SemiBold),
    Font(R.font.manrope_700, FontWeight.Bold),
    Font(R.font.manrope_800, FontWeight.ExtraBold),
)

class MainActivity : ComponentActivity() {
    private var deepLinkIntent by mutableStateOf<Intent?>(null)
    private var systemSplashRemoved by mutableStateOf(Build.VERSION.SDK_INT < Build.VERSION_CODES.S)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            splashScreen.setOnExitAnimationListener {
                it.remove()
                systemSplashRemoved = true
            }
        }
        enableEdgeToEdge()
        deepLinkIntent = intent
        setContent { ItalyTripApp(deepLinkIntent, systemSplashRemoved) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        deepLinkIntent = intent
    }
}

data class AppState(
    val loading: Boolean = true,
    val email: String? = null,
    val trip: JsonObject? = null,
    val isOwner: Boolean = false,
    val error: String? = null,
    val syncState: SyncState = SyncState.CLEAN,
    val mapboxToken: String? = null,
    val uploadingPhotos: Boolean = false,
    val rememberLogin: Boolean = true,
    val avatarUrl: String? = null,
    val backgroundHex: String = "#F7F3EC",
)

enum class SyncState { CLEAN, DIRTY, SAVING, FAILED }

class TripViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = TripRepository(application)
    private val _state = MutableStateFlow(AppState(backgroundHex = repository.backgroundHex()))
    val state: StateFlow<AppState> = _state.asStateFlow()
    private var saveJob: Job? = null

    init {
        refresh()
    }

    init {
        viewModelScope.launch {
            while (true) {
                delay(15_000)
                if (_state.value.email != null && _state.value.syncState == SyncState.CLEAN) refresh()
            }
        }
    }

    fun refresh() = viewModelScope.launch {
        val email = repository.sessionEmail()
        val nextState = if (email == null) {
            AppState(loading = false, rememberLogin = repository.rememberLogin(), backgroundHex = repository.backgroundHex())
        } else {
            val cached = repository.cachedTrip()
            runCatching {
                val trip = repository.loadTrip()
                AppState(false, email, trip, repository.isOwner(), mapboxToken = repository.mapboxToken(), avatarUrl = repository.avatarUrl(), backgroundHex = repository.backgroundHex())
            }.getOrElse {
                AppState(false, email, cached, error = "Не удалось загрузить свежий план. Показана локальная копия.", backgroundHex = repository.backgroundHex())
            }
        }
        _state.value = nextState
    }

    fun signIn(email: String, password: String, signUp: Boolean, remember: Boolean) = viewModelScope.launch {
        _state.value = AppState(loading = true, backgroundHex = repository.backgroundHex())
        repository.setRememberLogin(remember)
        runCatching { if (signUp) repository.signUp(email, password) else repository.signIn(email, password) }
            .onSuccess { refresh() }
            .onFailure { _state.value = AppState(false, error = authMessage(it.message), backgroundHex = repository.backgroundHex()) }
    }

    fun signInWithGoogle() = viewModelScope.launch {
        _state.value = _state.value.copy(error = null)
        runCatching { repository.signInWithGoogle() }
            .onFailure { _state.value = _state.value.copy(error = "Не удалось открыть вход через Google: ${authMessage(it.message)}") }
    }

    fun signOut() = viewModelScope.launch {
        repository.signOut()
        _state.value = AppState(loading = false, rememberLogin = repository.rememberLogin(), backgroundHex = repository.backgroundHex())
    }

    fun uploadAvatar(uri: Uri) = viewModelScope.launch {
        _state.value = _state.value.copy(error = null)
        runCatching { repository.uploadAvatar(uri) }
            .onSuccess { _state.value = _state.value.copy(avatarUrl = it) }
            .onFailure { _state.value = _state.value.copy(error = "Не удалось сохранить фото профиля: ${it.message}") }
    }

    fun changePassword(password: String, result: (String, Boolean) -> Unit) = viewModelScope.launch {
        runCatching { repository.changePassword(password) }
            .onSuccess { result("Пароль успешно изменён", true) }
            .onFailure { result("Не удалось изменить пароль: ${authMessage(it.message)}", false) }
    }

    fun updateBackgroundHex(value: String) {
        val normalized = "#${value.trim().removePrefix("#").uppercase()}"
        if (!Regex("^#[0-9A-F]{6}$").matches(normalized)) return
        repository.setBackgroundHex(normalized)
        _state.value = _state.value.copy(backgroundHex = normalized)
    }

    fun handleDeeplink(intent: Intent) {
        repository.handleDeeplink(intent, ::refresh)
    }

    fun toggleItineraryItem(dayId: String, itemId: String) = updateData { data ->
        data.withArray("days") { days -> days.mapObjects { day ->
            if (day.str("id") != dayId) day else day.withArray("items") { items -> items.mapObjects { item ->
                if (item.str("id") == itemId) item.withValue("done", !item.bool("done")) else item
            } }
        } }
    }

    fun toggleSight(id: String) = updateData { data ->
        data.withArray("sights") { sights -> sights.mapObjects { sight ->
            if (sight.str("id") == id) sight.withValue("done", !sight.bool("done")) else sight
        } }
    }

    fun updateSightGroup(id: String, group: String) = updateData { data ->
        val normalized = if (group == "обязательные") "обязательные" else "необязательные"
        data.withArray("sights") { sights -> sights.mapObjects { sight ->
            if (sight.str("id") == id) sight.withValue("group", normalized) else sight
        } }
    }

    fun reorderSights(ids: List<String>) = updateData { data ->
        data.withArray("sights") { sights -> sights.mapObjects { sight ->
            val order = ids.indexOf(sight.str("id"))
            if (order >= 0) sight.withValue("walkOrder", order.toDouble()) else sight
        } }
    }

    fun cycleLodgingStatus(id: String) = updateData { data ->
        val statuses = listOf("хочу", "бронь", "оплачено", "пожили")
        data.withArray("lodging") { lodging -> lodging.mapObjects { lodge ->
            if (lodge.str("id") != id) lodge else {
                val next = statuses[(statuses.indexOf(lodge.str("status")).coerceAtLeast(0) + 1) % statuses.size]
                lodge.withValue("status", next)
            }
        } }
    }

    fun updateLodgingStatus(id: String, status: String) = updateData { data ->
        if (status !in listOf("хочу", "бронь", "оплачено", "пожили")) data
        else data.withArray("lodging") { lodging -> lodging.mapObjects { lodge ->
            if (lodge.str("id") == id) lodge.withValue("status", status) else lodge
        } }
    }

    fun updateExpenseAmount(id: String, amount: Double) = updateData { data ->
        data.withArray("expenses") { expenses -> expenses.mapObjects { expense ->
            if (expense.str("id") == id) expense.withValue("amount", amount) else expense
        } }
    }

    fun saveRecord(section: String, record: JsonObject) {
        if (section !in setOf("lodging", "sights", "restaurants", "expenses")) return
        updateData { data ->
            val id = record.str("id")
            val current = data.array(section)
            val exists = current.any { it.obj().str("id") == id }
            data.withElement(section, JsonArray(if (exists) current.map { if (it.obj().str("id") == id) record else it } else current + record))
        }
    }

    fun deleteRecord(section: String, id: String) {
        if (section !in setOf("lodging", "sights", "restaurants", "expenses")) return
        updateData { data -> data.withElement(section, JsonArray(data.array(section).filter { it.obj().str("id") != id })) }
    }

    fun saveItineraryItem(dayId: String, item: JsonObject) = updateData { data ->
        data.withArray("days") { days -> days.mapObjects { day ->
            if (day.str("id") != dayId) day else {
                val entries = day.array("items")
                val exists = entries.any { it.obj().str("id") == item.str("id") }
                day.withElement("items", JsonArray(if (exists) entries.map { if (it.obj().str("id") == item.str("id")) item else it } else entries + item))
            }
        } }
    }

    fun deleteItineraryItem(dayId: String, itemId: String) = updateData { data ->
        data.withArray("days") { days -> days.mapObjects { day ->
            if (day.str("id") == dayId) day.withElement("items", JsonArray(day.array("items").filter { it.obj().str("id") != itemId })) else day
        } }
    }

    fun updateDayRoute(dayId: String, url: String) = updateData { data ->
        data.withArray("days") { days -> days.mapObjects { day ->
            if (day.str("id") == dayId) day.withValue("dayMapUrl", url.trim()) else day
        } }
    }

    fun uploadTripPhotos(uris: List<Uri>) = viewModelScope.launch {
        if (!_state.value.isOwner || uris.isEmpty()) return@launch
        _state.value = _state.value.copy(uploadingPhotos = true, error = null)
        runCatching {
            for (uri in uris) {
                val uploaded = repository.uploadTripPhoto(uri)
                updateData { data ->
                    val photo = JsonObject(buildMap {
                        put("id", JsonPrimitive(uploaded.id))
                        put("url", JsonPrimitive(uploaded.fullUrl))
                        put("path", JsonPrimitive(uploaded.fullPath))
                        uploaded.iso?.let { put("iso", JsonPrimitive(it)) }
                        uploaded.lat?.let { put("lat", JsonPrimitive(it)) }
                        uploaded.lng?.let { put("lng", JsonPrimitive(it)) }
                        uploaded.place?.let { put("place", JsonPrimitive(it)) }
                    })
                    val previews = (data["photoPreviews"] as? JsonObject ?: JsonObject(emptyMap()))
                        .withElement(uploaded.fullUrl, JsonObject(mapOf(
                            "url" to JsonPrimitive(uploaded.previewUrl),
                            "path" to JsonPrimitive(uploaded.previewPath),
                        )))
                    data.withElement("photos", JsonArray(data.array("photos") + photo))
                        .withElement("photoPreviews", previews)
                }
            }
        }.onFailure { _state.value = _state.value.copy(error = "Не удалось загрузить фото: ${it.message}") }
        _state.value = _state.value.copy(uploadingPhotos = false)
    }

    fun deleteTripPhoto(id: String) = viewModelScope.launch {
        val data = _state.value.trip?.get("data") as? JsonObject ?: return@launch
        val photo = data.array("photos").firstOrNull { it.obj().str("id") == id }?.obj() ?: return@launch
        val preview = (data["photoPreviews"] as? JsonObject)?.get(photo.str("url"))?.obj()
        runCatching { repository.deletePhoto(photo.str("path"), preview?.strOrNull("path")) }
            .onSuccess {
                updateData { current ->
                    val previews = (current["photoPreviews"] as? JsonObject)?.let { JsonObject(it - photo.str("url")) }
                    current.withElement("photos", JsonArray(current.array("photos").filter { it.obj().str("id") != id }))
                        .let { next -> if (previews != null) next.withElement("photoPreviews", previews) else next }
                }
            }
            .onFailure { _state.value = _state.value.copy(error = "Не удалось удалить фото") }
    }

    fun uploadEntityPhotos(section: String, id: String, uris: List<Uri>) = viewModelScope.launch {
        if (!_state.value.isOwner || section !in setOf("lodging", "sights", "restaurants") || uris.isEmpty()) return@launch
        _state.value = _state.value.copy(uploadingPhotos = true, error = null)
        runCatching {
            val accepted = if (section == "sights") uris.take(1) else uris
            for (uri in accepted) {
                val uploaded = repository.uploadPlacePhoto(uri, section)
                updateData { data ->
                    val previews = (data["photoPreviews"] as? JsonObject ?: JsonObject(emptyMap()))
                        .withElement(uploaded.fullUrl, JsonObject(mapOf("url" to JsonPrimitive(uploaded.previewUrl), "path" to JsonPrimitive(uploaded.previewPath))))
                    data.withArray(section) { records -> records.mapObjects { record ->
                        if (record.str("id") != id) record else if (section == "sights") {
                            record.withValue("photo", uploaded.fullUrl).withValue("photoPath", uploaded.fullPath)
                        } else {
                            record.withElement("photos", JsonArray(record.array("photos") + JsonPrimitive(uploaded.fullUrl)))
                        }
                    } }.withElement("photoPreviews", previews)
                }
            }
        }.onFailure { _state.value = _state.value.copy(error = "Не удалось загрузить фото: ${it.message}") }
        _state.value = _state.value.copy(uploadingPhotos = false)
    }

    private fun updateData(change: (JsonObject) -> JsonObject) {
        val current = _state.value
        val payload = current.trip ?: return
        if (!current.isOwner) return
        val data = payload["data"] as? JsonObject ?: return
        val nextPayload = payload.withElement("data", change(data))
        _state.value = current.copy(trip = nextPayload, syncState = SyncState.DIRTY, error = null)
        saveJob?.cancel()
        saveJob = viewModelScope.launch {
            delay(1200)
            _state.value = _state.value.copy(syncState = SyncState.SAVING)
            runCatching { repository.saveTrip(nextPayload) }
                .onSuccess { _state.value = _state.value.copy(syncState = SyncState.CLEAN, error = null) }
                .onFailure { _state.value = _state.value.copy(syncState = SyncState.FAILED, error = "Изменение сохранено на телефоне, но пока не отправлено в Supabase.") }
        }
    }
}

@Composable
private fun ItalyTripApp(deepLinkIntent: Intent?, systemSplashRemoved: Boolean, viewModel: TripViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showStartupLoading by remember { mutableStateOf(true) }
    val appBackground = DefaultBackground
    LaunchedEffect(systemSplashRemoved) {
        if (!systemSplashRemoved) return@LaunchedEffect
        delay(1_800)
        showStartupLoading = false
    }
    LaunchedEffect(deepLinkIntent) {
        deepLinkIntent?.takeIf { it.data != null }?.let(viewModel::handleDeeplink)
    }
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Accent,
            secondary = Gold,
            tertiary = Olive,
            background = appBackground,
            surface = CardWhite,
            onPrimary = Color.White,
            onBackground = Ink,
            onSurface = Ink,
        ),
        typography = MaterialTheme.typography.copy(
            displayLarge = MaterialTheme.typography.displayLarge.copy(fontFamily = DisplayFont),
            displayMedium = MaterialTheme.typography.displayMedium.copy(fontFamily = DisplayFont),
            displaySmall = MaterialTheme.typography.displaySmall.copy(fontFamily = DisplayFont),
            headlineLarge = MaterialTheme.typography.headlineLarge.copy(fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.7).sp),
            headlineMedium = MaterialTheme.typography.headlineMedium.copy(fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold),
            headlineSmall = MaterialTheme.typography.headlineSmall.copy(fontFamily = DisplayFont),
            titleLarge = MaterialTheme.typography.titleLarge.copy(fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold),
            titleMedium = MaterialTheme.typography.titleMedium.copy(fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold),
            titleSmall = MaterialTheme.typography.titleSmall.copy(fontFamily = DisplayFont),
            bodyLarge = MaterialTheme.typography.bodyLarge.copy(fontFamily = UiFont),
            bodyMedium = MaterialTheme.typography.bodyMedium.copy(fontFamily = UiFont, lineHeight = 20.sp),
            bodySmall = MaterialTheme.typography.bodySmall.copy(fontFamily = UiFont),
            labelLarge = MaterialTheme.typography.labelLarge.copy(fontFamily = UiFont),
            labelMedium = MaterialTheme.typography.labelMedium.copy(fontFamily = UiFont),
            labelSmall = MaterialTheme.typography.labelSmall.copy(fontFamily = UiFont),
        ),
    ) {
        Surface(Modifier.fillMaxSize(), color = appBackground) {
            when {
                state.loading || showStartupLoading -> LoadingScreen()
                state.email == null -> LegacySignInScreen(
                    state.error,
                    state.rememberLogin,
                    viewModel::signInWithGoogle,
                ) { email, password, signUp, remember -> viewModel.signIn(email, password, signUp, remember) }
                state.trip != null -> TripScreen(state, viewModel)
                else -> ErrorScreen(state.error ?: "Неизвестная ошибка", viewModel::refresh)
            }
        }
    }
}

@Composable
private fun LegacySignInScreen(error: String?, initialRemember: Boolean, googleSignIn: () -> Unit, submit: (String, String, Boolean, Boolean) -> Unit) {
    SignInScreen(error, initialRemember, googleSignIn, submit)
}

@Composable
private fun LoadingScreen() {
    val view = LocalView.current
    SideEffect {
        WindowCompat.getInsetsController((view.context as ComponentActivity).window, view).isAppearanceLightStatusBars = false
    }
    Box(Modifier.fillMaxSize()) {
        AsyncImage(R.drawable.hero_como, "Озеро Комо", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x88736B68), Color(0x99745A4C), Color(0xDD182321)))))
        Column(Modifier.align(Alignment.Center).padding(bottom = 72.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier.size(74.dp).background(Color(0xFF7D6B61).copy(alpha = .82f), RoundedCornerShape(22.dp)).border(1.dp, Color.White.copy(alpha = .34f), RoundedCornerShape(22.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.FlightTakeoff, contentDescription = null, tint = Color.White, modifier = Modifier.size(38.dp))
            }
            Text("ИТАЛИЯ · ОСЕНЬ 2026", Modifier.padding(top = 25.dp), color = Color(0xFFE9D1A9), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
            Text("Наше\nпутешествие", Modifier.padding(top = 10.dp), color = Color.White, fontFamily = DisplayFont, fontSize = 39.sp, lineHeight = 39.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
        Column(Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 30.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            LinearProgressIndicator(
                modifier = Modifier.width(150.dp).height(4.dp).clip(RoundedCornerShape(50)),
                color = Color.White,
                trackColor = Color.White.copy(alpha = .3f),
            )
            Text("Загружаем маршрут…", Modifier.padding(top = 12.dp), color = Color.White.copy(alpha = .88f), fontSize = 11.sp)
        }
    }
}

@Composable
private fun ErrorScreen(message: String, retry: () -> Unit) = Column(
    Modifier.fillMaxSize().padding(28.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
) {
    Text("Не получилось загрузить поездку", style = MaterialTheme.typography.titleLarge)
    Text(message, Modifier.padding(top = 10.dp), color = Muted)
    Button(onClick = retry, modifier = Modifier.padding(top = 20.dp), shape = RoundedCornerShape(12.dp)) { Text("Повторить") }
}

@Composable
private fun SignInScreen(error: String?, initialRemember: Boolean, googleSignIn: () -> Unit, submit: (String, String, Boolean, Boolean) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var signUp by remember { mutableStateOf(false) }
    var rememberLogin by remember(initialRemember) { mutableStateOf(initialRemember) }
    var passwordVisible by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }
    val view = LocalView.current
    SideEffect {
        WindowCompat.getInsetsController((view.context as ComponentActivity).window, view).isAppearanceLightStatusBars = false
    }
    fun submitIfValid() {
        when {
            email.isBlank() -> notice = "Введите e-mail"
            password.length < 6 -> notice = "Пароль должен содержать минимум 6 символов"
            else -> submit(email.trim(), password, signUp, rememberLogin)
        }
    }
    val glassColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
        focusedContainerColor = Color(0xFF51493F).copy(alpha = .72f), unfocusedContainerColor = Color(0xFF51493F).copy(alpha = .72f),
        focusedBorderColor = Color.White.copy(alpha = .55f), unfocusedBorderColor = Color.White.copy(alpha = .25f),
        focusedPlaceholderColor = Color.White.copy(alpha = .8f), unfocusedPlaceholderColor = Color.White.copy(alpha = .72f),
        focusedLeadingIconColor = Color.White.copy(alpha = .86f), unfocusedLeadingIconColor = Color.White.copy(alpha = .78f),
        focusedTrailingIconColor = Color.White.copy(alpha = .86f), unfocusedTrailingIconColor = Color.White.copy(alpha = .7f),
        cursorColor = Color.White,
    )
    Box(Modifier.fillMaxSize()) {
        AsyncImage(R.drawable.hero_como, "Озеро Комо", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x3320150D), Color(0x66201810), Color(0xE618110B)))))
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 38.dp),
        ) {
            Spacer(Modifier.height(105.dp))
            Box(Modifier.size(54.dp).background(Color.White.copy(alpha = .16f), RoundedCornerShape(16.dp)).border(1.dp, Color.White.copy(alpha = .25f), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.FlightTakeoff, contentDescription = null, tint = Color.White, modifier = Modifier.size(29.dp))
            }
            Text("ИТАЛИЯ · ОСЕНЬ 2026", Modifier.padding(top = 24.dp), color = Color(0xFFE4C9A0), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
            Text("Наше\nпутешествие", Modifier.padding(top = 10.dp), color = Color.White, fontFamily = DisplayFont, fontSize = 44.sp, lineHeight = 45.sp, fontWeight = FontWeight.Bold)
            Text("Маршрут, жильё, места и бюджет —\nвсё в одном месте.", Modifier.padding(top = 12.dp, bottom = 108.dp), color = Color.White.copy(alpha = .88f), fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; notice = null },
                placeholder = { Text("e-mail") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(17.dp)) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = glassColors,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth().height(55.dp),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; notice = null },
                placeholder = { Text("Пароль") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(17.dp)) },
                trailingIcon = { IconButton(onClick = { passwordVisible = !passwordVisible }) { Icon(if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = if (passwordVisible) "Скрыть пароль" else "Показать пароль", modifier = Modifier.size(17.dp)) } },
                singleLine = true,
                shape = RoundedCornerShape(14.dp), colors = glassColors, visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { submitIfValid() }),
                modifier = Modifier.fillMaxWidth().padding(top = 9.dp).height(55.dp),
            )
            Row(Modifier.fillMaxWidth().height(38.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.clickable { rememberLogin = !rememberLogin }, verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(width = 34.dp, height = 19.dp).background(if (rememberLogin) Accent else Color.White.copy(alpha = .35f), RoundedCornerShape(50)).padding(2.dp)) {
                        Box(Modifier.align(if (rememberLogin) Alignment.CenterEnd else Alignment.CenterStart).size(15.dp).background(Color.White, CircleShape))
                    }
                    Text("Запомнить меня", Modifier.padding(start = 8.dp), color = Color.White.copy(alpha = .88f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.weight(1f))
                Text("Забыли пароль?", Modifier.clickable { notice = "Восстановление пароля пока недоступно" }, color = Color.White.copy(alpha = .82f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
            (error ?: notice)?.let { Text(it, Modifier.padding(bottom = 7.dp), color = Color(0xFFFFD2C2), fontSize = 11.sp) }
            Button(
                onClick = { submitIfValid() },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
            ) { Text(if (signUp) "Зарегистрироваться" else "Войти", fontSize = 13.sp, fontWeight = FontWeight.Bold) }
            Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(1.dp).background(Color.White.copy(alpha = .28f)))
                Text("или", Modifier.padding(horizontal = 11.dp), color = Color.White.copy(alpha = .68f), fontSize = 10.sp)
                Box(Modifier.weight(1f).height(1.dp).background(Color.White.copy(alpha = .28f)))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                Surface(Modifier.weight(1f).height(45.dp).clickable { notice = null; googleSignIn() }, shape = RoundedCornerShape(13.dp), color = Color.White) {
                    Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Text("G", color = Accent, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text("Google", Modifier.padding(start = 8.dp), color = Ink, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Surface(Modifier.weight(1f).height(45.dp).clickable { notice = "Вход через Apple пока не подключён" }, shape = RoundedCornerShape(13.dp), color = Color.White) {
                    Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                        Text("●", color = Ink, fontSize = 11.sp)
                        Text("Apple", Modifier.padding(start = 8.dp), color = Ink, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            TextButton(onClick = { signUp = !signUp; notice = null }, modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 6.dp)) {
                Text(if (signUp) "Уже есть аккаунт? Войти" else "Нет аккаунта? ", color = Color.White.copy(alpha = .72f), fontSize = 11.sp)
                if (!signUp) Text("Регистрация", color = Color(0xFFE4C9A0), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

private enum class Destination(val label: String) {
    OVERVIEW("Обзор"), ITINERARY("Маршрут"), LODGING("Жильё"),
    SIGHTS("Места"), RESTAURANTS("Рестораны"), BUDGET("Бюджет"), PHOTOS("Фото")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TripScreen(state: AppState, viewModel: TripViewModel) {
    var destinationName by rememberSaveable { mutableStateOf(Destination.OVERVIEW.name) }
    var navigationHistory by rememberSaveable { mutableStateOf(emptyList<String>()) }
    val destination = Destination.entries.firstOrNull { it.name == destinationName } ?: Destination.OVERVIEW
    var focusedLodgingId by remember { mutableStateOf<String?>(null) }
    var profileOpen by remember { mutableStateOf(false) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val data = state.trip?.get("data") as? JsonObject ?: return
    val view = LocalView.current
    fun navigateTo(next: Destination, rememberCurrent: Boolean = true) {
        if (next == destination) return
        if (rememberCurrent) navigationHistory = navigationHistory + destination.name
        destinationName = next.name
    }
    SideEffect {
        WindowCompat.getInsetsController((view.context as ComponentActivity).window, view).isAppearanceLightStatusBars = destination != Destination.OVERVIEW
    }
    BackHandler(enabled = destination != Destination.OVERVIEW && !drawerState.isOpen) {
        val previous = navigationHistory.lastOrNull()?.let { name -> Destination.entries.firstOrNull { it.name == name } } ?: Destination.OVERVIEW
        navigationHistory = navigationHistory.dropLast(1)
        destinationName = previous.name
    }
    if (profileOpen) ProfileDialog(state, viewModel, { profileOpen = false })
    ProvideTextStyle(MaterialTheme.typography.bodyMedium) {
      ModalNavigationDrawer(
          drawerState = drawerState,
          drawerContent = {
              TerraDrawer(
                   destination = destination,
                   select = { selected ->
                       scope.launch {
                           drawerState.snapTo(DrawerValue.Closed)
                           navigateTo(selected)
                       }
                   },
                   openSettings = {
                       scope.launch {
                           drawerState.snapTo(DrawerValue.Closed)
                           profileOpen = true
                       }
                  },
              )
          },
      ) {
       Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        TripContent(
            destination, data, state.isOwner, viewModel, focusedLodgingId,
            openDrawer = { scope.launch { drawerState.open() } },
            openProfile = { profileOpen = true },
        ) { id ->
            focusedLodgingId = id
            navigateTo(Destination.LODGING)
        }
        if (state.syncState == SyncState.FAILED || state.error != null) {
            Surface(
                Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(horizontal = 18.dp, vertical = 8.dp),
                shape = RoundedCornerShape(10.dp),
                color = ErrorRed,
                shadowElevation = 4.dp,
            ) {
                Text(state.error ?: "Изменения пока не синхронизированы", Modifier.padding(horizontal = 14.dp, vertical = 9.dp), color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }
       }
      }
    }
}

@Composable
private fun TerraDrawer(destination: Destination, select: (Destination) -> Unit, openSettings: () -> Unit) {
    ModalDrawerSheet(
        Modifier.fillMaxWidth(.78f),
        drawerContainerColor = DefaultBackground,
        drawerContentColor = Ink,
    ) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(46.dp).background(Brush.linearGradient(listOf(Accent, Color(0xFF8F4227))), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                    Text("✈", color = Color.White, fontSize = 19.sp)
                }
                Column(Modifier.padding(start = 12.dp)) {
                    Text("Италия 2026", fontFamily = DisplayFont, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    Text("25 сен — 12 окт · 17 ночей", Modifier.padding(top = 3.dp), color = Muted, fontSize = 11.sp)
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Destination.entries.forEach { item ->
                    val icon = when (item) {
                        Destination.OVERVIEW -> Icons.Default.CompassCalibration
                        Destination.ITINERARY -> Icons.Default.Route
                        Destination.LODGING -> Icons.Default.Bed
                        Destination.SIGHTS -> Icons.Default.LocationOn
                        Destination.RESTAURANTS -> Icons.Default.Restaurant
                        Destination.BUDGET -> Icons.Default.AccountBalanceWallet
                        Destination.PHOTOS -> Icons.Default.PhotoLibrary
                    }
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (item == destination) Soft else Color.Transparent).clickable { select(item) }.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(icon, contentDescription = null, tint = if (item == destination) Accent else Olive, modifier = Modifier.size(20.dp))
                        Text(item.label, Modifier.padding(start = 14.dp), color = if (item == destination) Accent else Ink, fontSize = 14.sp, fontWeight = if (item == destination) FontWeight.Bold else FontWeight.SemiBold)
                    }
                }
            }
            Row(Modifier.fillMaxWidth().border(1.dp, Line).clickable(onClick = openSettings).navigationBarsPadding().padding(horizontal = 26.dp, vertical = 19.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Settings, contentDescription = null, tint = Muted, modifier = Modifier.size(19.dp))
                Text("Настройки", Modifier.padding(start = 14.dp), color = Muted, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun DrawerHeader(title: String, openDrawer: () -> Unit) = Row(
    Modifier.fillMaxWidth().statusBarsPadding().padding(start = 18.dp, end = 18.dp, top = 8.dp, bottom = 10.dp),
    verticalAlignment = Alignment.CenterVertically,
) {
    IconButton(onClick = openDrawer, modifier = Modifier.size(40.dp).background(Track, CircleShape)) {
        Icon(Icons.Default.Menu, contentDescription = "Открыть меню", tint = Olive, modifier = Modifier.size(18.dp))
    }
    Text(title, Modifier.padding(start = 13.dp), fontFamily = DisplayFont, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
}

@Composable
private fun DrawerCircleButton(openDrawer: () -> Unit) {
    IconButton(onClick = openDrawer, modifier = Modifier.size(40.dp).background(Track, CircleShape)) {
        Icon(Icons.Default.Menu, contentDescription = "Открыть меню", tint = Olive, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun SyncLabel(state: SyncState) {
    val (label, color) = when (state) {
        SyncState.CLEAN -> "Сохранено" to Olive
        SyncState.DIRTY -> "Есть изменения" to Gold
        SyncState.SAVING -> "Сохраняем..." to Accent
        SyncState.FAILED -> "Нет синхронизации" to MaterialTheme.colorScheme.error
    }
    Text(label, color = color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
}

@Composable
private fun ProfileDialog(state: AppState, viewModel: TripViewModel, dismiss: () -> Unit) {
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let(viewModel::uploadAvatar) }
    var newPassword by remember { mutableStateOf("") }
    var repeatPassword by remember { mutableStateOf("") }
    var passwordBusy by remember { mutableStateOf(false) }
    var passwordStatus by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    Dialog(onDismissRequest = dismiss) {
        Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(DefaultBackground), border = BorderStroke(1.dp, Line), elevation = CardDefaults.cardElevation(8.dp)) {
            Column(Modifier.heightIn(max = 720.dp).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).background(Accent, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Settings, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp)) }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text("Настройки", fontFamily = DisplayFont, fontSize = 25.sp, lineHeight = 27.sp, fontWeight = FontWeight.SemiBold)
                        Text("Профиль и безопасность", color = Muted, fontSize = 11.sp)
                    }
                    IconButton(onClick = dismiss, modifier = Modifier.size(34.dp).background(Track, CircleShape)) { Text("×", color = Muted, fontSize = 22.sp) }
                }
                Row(Modifier.fillMaxWidth().background(CardWhite, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (state.avatarUrl != null) AsyncImage(state.avatarUrl, "Фото профиля", Modifier.size(58.dp).clip(RoundedCornerShape(16.dp)), contentScale = ContentScale.Crop)
                    else Box(Modifier.size(58.dp).background(Brush.linearGradient(listOf(Accent, Color(0xFF8F4227))), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) { Text(state.email?.firstOrNull()?.uppercase() ?: "?", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold) }
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(state.email?.substringBefore('@').orEmpty().ifBlank { "Профиль" }, fontFamily = DisplayFont, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(if (state.isOwner) "Владелец поездки" else "Участник поездки", color = Olive, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    }
                    OutlinedButton(onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, shape = RoundedCornerShape(9.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)) { Text("Фото", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                }
                Column(Modifier.fillMaxWidth().background(CardWhite, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(34.dp).background(Soft, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, contentDescription = null, tint = Accent, modifier = Modifier.size(16.dp)) }
                        Column(Modifier.padding(start = 11.dp)) {
                            Text("Аккаунт", fontFamily = DisplayFont, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            Text(state.email.orEmpty(), color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
                Column(Modifier.fillMaxWidth().background(CardWhite, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(34.dp).background(Soft, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Lock, contentDescription = null, tint = Accent, modifier = Modifier.size(16.dp)) }
                        Column(Modifier.padding(start = 11.dp)) {
                            Text("Смена пароля", fontFamily = DisplayFont, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            Text("Минимум 6 символов", color = Muted, fontSize = 10.sp)
                        }
                    }
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it; passwordStatus = null },
                        label = { Text("Новый пароль") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Soft, unfocusedContainerColor = Soft, focusedBorderColor = Accent, unfocusedBorderColor = Line),
                    )
                    OutlinedTextField(
                        value = repeatPassword,
                        onValueChange = { repeatPassword = it; passwordStatus = null },
                        label = { Text("Повторите пароль") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Soft, unfocusedContainerColor = Soft, focusedBorderColor = Accent, unfocusedBorderColor = Line),
                    )
                    passwordStatus?.let { (message, success) -> Text(message, color = if (success) Olive else ErrorRed, fontSize = 11.sp) }
                    Button(
                        onClick = {
                            when {
                                newPassword.length < 6 -> passwordStatus = "Пароль должен содержать минимум 6 символов" to false
                                newPassword != repeatPassword -> passwordStatus = "Пароли не совпадают" to false
                                else -> {
                                    passwordBusy = true
                                    viewModel.changePassword(newPassword) { message, success ->
                                        passwordBusy = false
                                        passwordStatus = message to success
                                        if (success) { newPassword = ""; repeatPassword = "" }
                                    }
                                }
                            }
                        },
                        enabled = !passwordBusy && newPassword.isNotBlank() && repeatPassword.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(10.dp),
                    ) { Text(if (passwordBusy) "Сохраняем…" else "Изменить пароль", fontWeight = FontWeight.Bold) }
                }
                state.error?.let { Text(it, color = ErrorRed, fontSize = 12.sp) }
                TextButton(onClick = { dismiss(); viewModel.signOut() }, Modifier.fillMaxWidth().height(44.dp)) {
                    Icon(Icons.Default.Logout, contentDescription = null, tint = ErrorRed, modifier = Modifier.size(16.dp))
                    Text("Выйти из аккаунта", Modifier.padding(start = 8.dp), color = ErrorRed, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun BackgroundColorPicker(hex: String, onColor: (String) -> Unit) {
    val hsv = remember(hex) {
        FloatArray(3).also { values ->
            android.graphics.Color.colorToHSV(android.graphics.Color.parseColor(hex), values)
        }
    }
    val hue = hsv[0]
    val saturation = hsv[1]
    val value = hsv[2]
    val currentHue = rememberUpdatedState(hue)
    val currentSaturation = rememberUpdatedState(saturation)
    val currentValue = rememberUpdatedState(value)
    val currentOnColor = rememberUpdatedState(onColor)

    fun emit(nextHue: Float? = null, nextSaturation: Float? = null, nextValue: Float? = null) {
        val color = android.graphics.Color.HSVToColor(floatArrayOf(nextHue ?: currentHue.value, nextSaturation ?: currentSaturation.value, nextValue ?: currentValue.value))
        currentOnColor.value(String.format(Locale.US, "#%06X", color and 0xFFFFFF))
    }

    Column(Modifier.fillMaxWidth().padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Canvas(
            Modifier.fillMaxWidth().height(145.dp).clip(RoundedCornerShape(12.dp))
                .pointerInput(Unit) { detectTapGestures { point -> emit(nextSaturation = (point.x / size.width).coerceIn(0f, 1f), nextValue = (1f - point.y / size.height).coerceIn(0f, 1f)) } }
                .pointerInput(Unit) { detectDragGestures { change, _ -> emit(nextSaturation = (change.position.x / size.width).coerceIn(0f, 1f), nextValue = (1f - change.position.y / size.height).coerceIn(0f, 1f)) } },
        ) {
            drawRect(Color.hsv(hue, 1f, 1f))
            drawRect(Brush.horizontalGradient(listOf(Color.White, Color.Transparent)))
            drawRect(Brush.verticalGradient(listOf(Color.Transparent, Color.Black)))
            val marker = Offset(saturation * size.width, (1f - value) * size.height)
            drawCircle(Color.White, radius = 9.dp.toPx(), center = marker)
            drawCircle(Color.Black, radius = 7.dp.toPx(), center = marker, style = Stroke(2.dp.toPx()))
        }
        Canvas(
            Modifier.fillMaxWidth().height(24.dp).clip(RoundedCornerShape(12.dp))
                .pointerInput(Unit) { detectTapGestures { point -> emit(nextHue = (point.x / size.width).coerceIn(0f, 1f) * 360f) } }
                .pointerInput(Unit) { detectDragGestures { change, _ -> emit(nextHue = (change.position.x / size.width).coerceIn(0f, 1f) * 360f) } },
        ) {
            drawRect(Brush.horizontalGradient(listOf(Color.Red, Color.Yellow, Color.Green, Color.Cyan, Color.Blue, Color.Magenta, Color.Red)))
            val x = hue / 360f * size.width
            drawLine(Color.White, Offset(x, 0f), Offset(x, size.height), strokeWidth = 5.dp.toPx())
            drawLine(Color.Black, Offset(x, 0f), Offset(x, size.height), strokeWidth = 2.dp.toPx())
        }
    }
}

@Composable
private fun TripContent(destination: Destination, data: JsonObject, isOwner: Boolean, viewModel: TripViewModel, focusedLodgingId: String?, openDrawer: () -> Unit, openProfile: () -> Unit, openLodging: (String) -> Unit) {
    val appState by viewModel.state.collectAsStateWithLifecycle()
    when (destination) {
        Destination.OVERVIEW -> OverviewScreen(data, appState.mapboxToken, openDrawer, openProfile)
        Destination.ITINERARY -> Box(Modifier.statusBarsPadding()) { ItineraryScreen(data.array("days"), isOwner, viewModel::toggleItineraryItem, viewModel::saveItineraryItem, viewModel::deleteItineraryItem, viewModel::updateDayRoute, openDrawer) }
        Destination.LODGING -> Box(Modifier.statusBarsPadding()) { LodgingScreen(data.array("lodging"), isOwner, viewModel::updateLodgingStatus, { viewModel.saveRecord("lodging", it) }, { viewModel.deleteRecord("lodging", it) }, { id, uris -> viewModel.uploadEntityPhotos("lodging", id, uris) }, focusedLodgingId, openDrawer) }
        Destination.SIGHTS -> Box(Modifier.statusBarsPadding()) { SightsScreen(data.array("sights"), isOwner, viewModel::toggleSight, viewModel::updateSightGroup, viewModel::reorderSights, { viewModel.saveRecord("sights", it) }, { viewModel.deleteRecord("sights", it) }, { id, uris -> viewModel.uploadEntityPhotos("sights", id, uris) }, appState.mapboxToken, data, openDrawer) }
        Destination.RESTAURANTS -> Column { DrawerHeader("Рестораны", openDrawer); RestaurantsScreen(data.array("restaurants"), isOwner, { viewModel.saveRecord("restaurants", it) }, { viewModel.deleteRecord("restaurants", it) }, { id, uris -> viewModel.uploadEntityPhotos("restaurants", id, uris) }, appState.mapboxToken, data) }
        Destination.BUDGET -> Column { DrawerHeader("Бюджет", openDrawer); Box(Modifier.weight(1f)) { BudgetScreen(data, isOwner, viewModel::updateExpenseAmount, { viewModel.saveRecord("expenses", it) }, { viewModel.deleteRecord("expenses", it) }) } }
        Destination.PHOTOS -> PhotosScreen(data, isOwner, appState.uploadingPhotos, viewModel::uploadTripPhotos, viewModel::deleteTripPhoto, openDrawer)
    }
}

@Composable
private fun OverviewScreen(data: JsonObject, mapboxToken: String?, openDrawer: () -> Unit, openProfile: () -> Unit) {
    val heroes = remember { listOf(
        "salzburg" to "Зальцбург на рассвете", "verona" to "Верона — город Ромео и Джульетты", "rome" to "Рим — Вечный город",
        "pisa" to "Пиза — короткая остановка", "figline" to "Фильине-Вальдарно", "sanmarino" to "Сан-Марино",
        "chioggia" to "Кьоджа — маленькая Венеция", "milan" to "Милан — столица моды", "como" to "Озеро Комо",
        "valdidentro" to "Вальдидентро", "stelvio" to "Перевал Стельвио", "munich" to "Мюнхен — перед домом", "prague" to "Прага — домой",
    ) }
    var heroIndex by remember { mutableStateOf(2) }
    var heroFullscreen by remember { mutableStateOf(false) }
    var heroScale by remember(heroIndex, heroFullscreen) { mutableFloatStateOf(1f) }
    var heroOffset by remember(heroIndex, heroFullscreen) { mutableStateOf(Offset.Zero) }
    var mapFullscreen by remember { mutableStateOf(false) }
    val heroTransform = rememberTransformableState { zoomChange, panChange, _ ->
        heroScale = (heroScale * zoomChange).coerceIn(1f, 4f)
        heroOffset = if (heroScale == 1f) Offset.Zero else heroOffset + panChange
    }
    val trip = data["trip"]?.obj() ?: JsonObject(emptyMap())
    val start = runCatching { LocalDate.parse(trip.str("start")) }.getOrNull()
    val end = runCatching { LocalDate.parse(trip.str("end")) }.getOrNull()
    val countdown = start?.let { ChronoUnit.DAYS.between(LocalDate.now(), it).coerceAtLeast(0) } ?: 0
    val nights = if (start != null && end != null) ChronoUnit.DAYS.between(start, end).coerceAtLeast(0) else 0
    val cities = 9
    if (heroFullscreen) Dialog(
        onDismissRequest = { heroFullscreen = false },
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(Modifier.fillMaxSize().background(Color(0xFF101A1B))) {
            AsyncImage(
                model = "https://crazynata.github.io/italy-trip/images/hero-${heroes[heroIndex].first}.webp",
                contentDescription = null,
                modifier = Modifier.fillMaxSize().blur(24.dp),
                contentScale = ContentScale.Crop,
                alpha = .8f,
            )
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x55173A3D), Color(0xCC101A1B)))))
            AsyncImage(
                model = "https://crazynata.github.io/italy-trip/images/hero-${heroes[heroIndex].first}.webp",
                contentDescription = heroes[heroIndex].second,
                modifier = Modifier.fillMaxSize().padding(vertical = 54.dp).graphicsLayer {
                    scaleX = heroScale
                    scaleY = heroScale
                    translationX = heroOffset.x
                    translationY = heroOffset.y
                }.transformable(heroTransform),
                contentScale = ContentScale.Fit,
            )
            Button(onClick = { heroIndex = (heroIndex - 1 + heroes.size) % heroes.size }, modifier = Modifier.align(Alignment.CenterStart).size(44.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .55f))) { Text("‹", color = Color.White, fontSize = 30.sp) }
            Button(onClick = { heroIndex = (heroIndex + 1) % heroes.size }, modifier = Modifier.align(Alignment.CenterEnd).size(44.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .55f))) { Text("›", color = Color.White, fontSize = 30.sp) }
            TextButton(onClick = { heroFullscreen = false }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding()) { Text("Закрыть", color = Color.White) }
            Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color.Black.copy(alpha = .5f)).navigationBarsPadding().padding(14.dp)) {
                Text(heroes[heroIndex].second, color = Color.White, fontWeight = FontWeight.Bold)
                Text("${heroIndex + 1} из ${heroes.size}", color = Color.White.copy(alpha = .72f), fontSize = 11.sp)
            }
        }
    }
    if (mapFullscreen) Dialog(
        onDismissRequest = { mapFullscreen = false },
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).statusBarsPadding().navigationBarsPadding().padding(16.dp)) {
            NativeMapPanel(mapboxToken, data, NativeMapLayer.ROUTE, expanded = true)
            IconButton(onClick = { mapFullscreen = false }, modifier = Modifier.align(Alignment.TopEnd).padding(10.dp).background(CardWhite, CircleShape)) {
                Text("×", color = Ink, fontSize = 24.sp)
            }
        }
    }
    LazyColumn(contentPadding = PaddingValues(bottom = 30.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item {
            Box(Modifier.fillMaxWidth().height(292.dp)) {
                AsyncImage(
                    model = "https://crazynata.github.io/italy-trip/images/hero-${heroes[heroIndex].first}.webp",
                    contentDescription = heroes[heroIndex].second,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x66261A10), Color(0x22261A10), Color(0xC71E140C)))))
                Row(Modifier.align(Alignment.TopStart).fillMaxWidth().statusBarsPadding().padding(start = 22.dp, end = 22.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = openDrawer, modifier = Modifier.size(40.dp).background(Color.White.copy(alpha = .18f), CircleShape)) {
                        Icon(Icons.Default.Menu, contentDescription = "Открыть меню", tint = Color.White, modifier = Modifier.size(17.dp))
                    }
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = openProfile, modifier = Modifier.size(40.dp).background(Color.White.copy(alpha = .18f), CircleShape)) {
                        Icon(Icons.Default.Settings, contentDescription = "Аккаунт", tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }
                Text("ИТАЛИЯ · ОСЕНЬ 2026", Modifier.align(Alignment.TopStart).statusBarsPadding().padding(start = 22.dp, top = 62.dp), color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                Column(Modifier.align(Alignment.BottomStart).padding(start = 22.dp, bottom = 20.dp)) {
                    Text("Отпуск\nв Италии", color = Color.White, fontFamily = DisplayFont, fontSize = 36.sp, lineHeight = 36.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp), verticalAlignment = Alignment.CenterVertically) {
                OverviewStat(countdown.toString(), "дней до выезда", Accent, Modifier.weight(1f))
                Box(Modifier.width(1.dp).height(45.dp).background(Line))
                OverviewStat(nights.toString(), "ночей в пути", Olive, Modifier.weight(1f).padding(start = 17.dp))
                Box(Modifier.width(1.dp).height(45.dp).background(Line))
                OverviewStat(cities.toString(), "городов", Ink, Modifier.weight(1f).padding(start = 17.dp))
            }
        }
        item { Box(Modifier.padding(horizontal = 22.dp)) { WeatherSection(data) } }
        item {
            Column(Modifier.padding(horizontal = 22.dp)) {
                Row(Modifier.fillMaxWidth().padding(bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Карта маршрута", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { mapFullscreen = true }, contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp)) {
                        Text("Открыть", color = Accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
                Box(Modifier.fillMaxWidth()) {
                    NativeMapPanel(mapboxToken, data, NativeMapLayer.ROUTE, mapHeight = 210)
                    Surface(
                        modifier = Modifier.align(Alignment.TopEnd).padding(12.dp).size(32.dp).clickable { mapFullscreen = true },
                        shape = RoundedCornerShape(9.dp),
                        color = Color.White.copy(alpha = .94f),
                        border = BorderStroke(1.dp, Line),
                        shadowElevation = 1.dp,
                    ) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.OpenInFull, contentDescription = "Развернуть карту", tint = Olive, modifier = Modifier.size(13.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OverviewStat(value: String, label: String, color: Color, modifier: Modifier = Modifier) = Column(modifier) {
    Text(value, color = color, fontFamily = DisplayFont, fontSize = 39.sp, lineHeight = 39.sp, fontWeight = FontWeight.Bold)
    Text(label, Modifier.padding(top = 4.dp), color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1)
}

@Composable
private fun routeMapUrl(data: JsonObject, lodge: JsonObject): String {
    val shortCity = lodge.str("city").substringBefore(',').trim()
    val savedRoute = data.array("days").firstOrNull { day ->
        day.obj().str("city").contains(shortCity, ignoreCase = true) && day.obj().str("dayMapUrl").isNotBlank()
    }?.obj()?.str("dayMapUrl")
    return savedRoute ?: "https://www.google.com/maps/search/?api=1&query=${Uri.encode(lodge.str("city"))}"
}

@Composable
private fun RouteStopCard(lodge: JsonObject, mapUrl: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val city = lodge.str("city").substringBefore(',').trim()
    val country = lodge.str("city").substringAfter(',', "").trim()
    Card(
        modifier.height(104.dp).clickable {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(mapUrl))) }
        },
        shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(CardWhite), border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.fillMaxSize().padding(13.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(8.dp), color = Track) {
                    Text(flag(lodge.str("city")), Modifier.padding(horizontal = 8.dp, vertical = 5.dp), fontSize = 15.sp)
                }
                Spacer(Modifier.weight(1f))
                Text("↗", color = Accent, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            }
            Column {
                Text(city, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (country.isNotBlank()) Text(country, color = Accent, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, subtitle: String? = null) = Column(Modifier.padding(top = 8.dp, bottom = 2.dp)) {
    Text(title, style = MaterialTheme.typography.titleLarge, fontFamily = DisplayFont, color = Ink)
    if (subtitle != null) Text(subtitle, Modifier.padding(top = 2.dp), color = Muted, fontSize = 13.sp)
}

@Composable
private fun TerraHeading(eyebrow: String, title: String) = Column {
    Text(eyebrow.uppercase(), color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
    Text(title, Modifier.padding(top = 7.dp), fontFamily = DisplayFont, fontSize = 28.sp, lineHeight = 29.sp, fontWeight = FontWeight.SemiBold)
}

private enum class FieldType { TEXT, NUMBER, BOOLEAN }
private data class EditorField(val key: String, val label: String, val type: FieldType = FieldType.TEXT, val multiline: Boolean = false)

@Composable
private fun RecordEditorDialog(
    title: String,
    initial: JsonObject,
    fields: List<EditorField>,
    onDismiss: () -> Unit,
    onSave: (JsonObject) -> Unit,
    onDelete: (() -> Unit)? = null,
) {
    val values = remember(initial) { mutableStateOf(fields.associate { field -> field.key to initial.str(field.key) }) }
    var confirmDelete by remember { mutableStateOf(false) }
    if (confirmDelete) AlertDialog(
        onDismissRequest = { confirmDelete = false },
        title = { Text("Удалить запись?") },
        text = { Text("Запись и связанные с ней данные будут удалены безвозвратно.") },
        confirmButton = { TextButton(onClick = { confirmDelete = false; onDelete?.invoke(); onDismiss() }) { Text("Удалить", color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Отмена") } },
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            LazyColumn(Modifier.heightIn(max = 500.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                items(fields) { field ->
                    val current = values.value[field.key].orEmpty()
                    if (field.type == FieldType.BOOLEAN) {
                        Button(
                            onClick = { values.value = values.value + (field.key to if (current == "true") "false" else "true") },
                            colors = ButtonDefaults.buttonColors(containerColor = if (current == "true") Olive else Muted),
                            shape = RoundedCornerShape(10.dp),
                        ) { Text("${field.label}: ${if (current == "true") "да" else "нет"}") }
                    } else OutlinedTextField(
                        value = current,
                        onValueChange = { values.value = values.value + (field.key to it) },
                        label = { Text(field.label) },
                        keyboardOptions = KeyboardOptions(keyboardType = if (field.type == FieldType.NUMBER) KeyboardType.Decimal else KeyboardType.Text),
                        singleLine = !field.multiline,
                        minLines = if (field.multiline) 3 else 1,
                        shape = RoundedCornerShape(11.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                var record = initial
                fields.forEach { field ->
                    val value = values.value[field.key].orEmpty()
                    record = when (field.type) {
                        FieldType.TEXT -> record.withValue(field.key, value)
                        FieldType.NUMBER -> record.withValue(field.key, value.replace(',', '.').toDoubleOrNull() ?: 0.0)
                        FieldType.BOOLEAN -> record.withValue(field.key, value == "true")
                    }
                }
                onSave(record)
                onDismiss()
            }) { Text("Сохранить") }
        },
        dismissButton = {
            Row {
                if (onDelete != null) TextButton(onClick = { confirmDelete = true }) { Text("Удалить", color = MaterialTheme.colorScheme.error) }
                TextButton(onClick = onDismiss) { Text("Отмена") }
            }
        },
    )
}

@Composable
private fun ItineraryScreen(
    days: JsonArray,
    editable: Boolean,
    toggleItem: (String, String) -> Unit,
    saveItem: (String, JsonObject) -> Unit,
    deleteItem: (String, String) -> Unit,
    updateDayRoute: (String, String) -> Unit,
    openDrawer: () -> Unit,
) {
    var editor by remember { mutableStateOf<Pair<String, JsonObject>?>(null) }
    var routeEditor by remember { mutableStateOf<JsonObject?>(null) }
    var routeText by remember { mutableStateOf("") }
    editor?.let { (dayId, item) -> RecordEditorDialog(
        title = if (item.str("title").isBlank()) "Новый пункт" else "Пункт маршрута",
        initial = item,
        fields = listOf(EditorField("title", "Название"), EditorField("time", "Время"), EditorField("mapUrl", "Ссылка Google Maps")),
        onDismiss = { editor = null },
        onSave = { saveItem(dayId, it) },
        onDelete = if (days.any { day -> day.obj().array("items").any { it.obj().str("id") == item.str("id") } }) ({ deleteItem(dayId, item.str("id")) }) else null,
    ) }
    routeEditor?.let { day ->
        Dialog(onDismissRequest = { routeEditor = null }) {
            Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(DefaultBackground), border = BorderStroke(1.dp, Line), elevation = CardDefaults.cardElevation(8.dp)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(42.dp).background(Accent, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Route, contentDescription = null, tint = Color.White, modifier = Modifier.size(19.dp))
                        }
                        Column(Modifier.weight(1f).padding(start = 12.dp)) {
                            Text("Маршрут", fontFamily = DisplayFont, fontSize = 23.sp, fontWeight = FontWeight.SemiBold)
                            Text(day.str("city").substringBefore(','), color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        IconButton(onClick = { routeEditor = null }, modifier = Modifier.size(34.dp).background(Track, CircleShape)) { Text("×", color = Muted, fontSize = 22.sp) }
                    }
                    Text("Вставьте ссылку на маршрут из Google Maps. После сохранения она будет открываться кнопкой «Маршрут».", color = Muted, fontSize = 12.sp, lineHeight = 18.sp)
                    OutlinedTextField(
                        value = routeText,
                        onValueChange = { routeText = it },
                        label = { Text("Ссылка на маршрут") },
                        leadingIcon = { Icon(Icons.Default.Link, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = false,
                        minLines = 2,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = CardWhite, unfocusedContainerColor = CardWhite, focusedBorderColor = Accent, unfocusedBorderColor = Line),
                    )
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        OutlinedButton(onClick = { routeEditor = null }, modifier = Modifier.weight(1f).height(46.dp), shape = RoundedCornerShape(11.dp), border = BorderStroke(1.dp, Line)) { Text("Отмена", color = Muted, fontWeight = FontWeight.Bold) }
                        Button(onClick = { updateDayRoute(day.str("id"), routeText.trim()); routeEditor = null }, modifier = Modifier.weight(1f).height(46.dp), shape = RoundedCornerShape(11.dp), enabled = routeText.isNotBlank()) { Text("Сохранить", fontWeight = FontWeight.Bold) }
                    }
                }
            }
        }
    }
    val cityCount = 9
    LazyColumn(contentPadding = PaddingValues(22.dp, 8.dp, 22.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Row(verticalAlignment = Alignment.CenterVertically) { DrawerCircleButton(openDrawer); Column(Modifier.padding(start = 14.dp)) { TerraHeading("${days.size} дней · $cityCount городов", "Маршрут") } } }
        items(days) { dayElement ->
            val day = dayElement.obj()
            DayCard(
                day,
                editable = editable,
                toggleItem = toggleItem,
                editItem = { editor = day.str("id") to it },
                editDayRoute = if (editable) ({ routeEditor = day; routeText = day.str("dayMapUrl") }) else null,
                addItem = if (editable) ({ editor = day.str("id") to JsonObject(mapOf("id" to JsonPrimitive("item_${UUID.randomUUID()}"), "title" to JsonPrimitive(""), "done" to JsonPrimitive(false), "time" to JsonPrimitive(""), "mapUrl" to JsonPrimitive(""))) }) else null,
            )
        }
    }
}

@Composable
private fun DayCard(
    day: JsonObject,
    compact: Boolean = false,
    editable: Boolean = false,
    toggleItem: (String, String) -> Unit = { _, _ -> },
    editItem: (JsonObject) -> Unit = {},
    editDayRoute: (() -> Unit)? = null,
    addItem: (() -> Unit)? = null,
) {
    val entries = day.array("items")
    val done = entries.count { it.obj().bool("done") }
    val context = LocalContext.current
    val dayMapUrl = day.strOrNull("dayMapUrl")
    val city = day.str("city")
    val travelMeta = when {
        city.startsWith("Прага → Зальцбург") -> "385 км · ~4 ч"
        city.startsWith("Зальцбург → Верона") -> "285 км · ~3 ч"
        city.startsWith("Верона → Рим") -> "505 км · ~5 ч"
        city.startsWith("Рим → Фильине") -> "275 км · ~3 ч"
        city.startsWith("Фильине-Вальдарно → Кьоджа") -> "285 км · ~3 ч"
        city.startsWith("Кьоджа → Милан") -> "280 км · ~3 ч"
        city.startsWith("Милан → Вальдидентро") -> "200 км · ~3 ч"
        city.startsWith("Вальдидентро → Мюнхен") -> "280 км · ~4 ч"
        city.startsWith("Мюнхен → Прага") -> "385 км · ~4 ч"
        else -> null
    }
    val routeTitle = city.replace(Regex("\\s*\\([^)]*\\)"), "")
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(CardWhite), border = BorderStroke(1.dp, Line)) {
        Column {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.width(42.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(day.str("dayNum"), fontFamily = DisplayFont, fontSize = 25.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold, color = Accent)
                    Text(day.str("month").uppercase().take(3), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Muted, letterSpacing = .8.sp)
                }
                Column(Modifier.weight(1f).padding(start = 13.dp)) {
                    Text(routeTitle, fontWeight = FontWeight.Bold, fontSize = 17.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(listOfNotNull(day.str("weekday"), travelMeta).joinToString(" · "), color = Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }
                Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Olive, modifier = Modifier.size(16.dp))
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            val checkIn = entries.firstOrNull { element -> element.obj().str("title").contains("засел", ignoreCase = true) }?.obj() ?: entries.firstOrNull()?.obj()
            checkIn?.let { item ->
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Key, contentDescription = null, tint = Olive, modifier = Modifier.size(15.dp))
                    Text(item.str("title"), Modifier.weight(1f).padding(horizontal = 8.dp).clickable(enabled = editable) { editItem(item) }, color = Muted, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(item.strOrNull("time") ?: "$done/${entries.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        if (dayMapUrl != null) runCatching {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(currentLocationRouteUrl(dayMapUrl, city))))
                        }
                        else editDayRoute?.invoke()
                    },
                    enabled = dayMapUrl != null || editDayRoute != null,
                    modifier = Modifier.weight(1f).height(44.dp),
                    shape = RoundedCornerShape(11.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, disabledContainerColor = Soft, disabledContentColor = Color(0xFFB6AC9C)),
                ) {
                    Icon(Icons.Default.Route, contentDescription = null, modifier = Modifier.size(15.dp))
                    Text("Маршрут", Modifier.padding(start = 8.dp), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                if (editDayRoute != null && dayMapUrl != null) IconButton(onClick = editDayRoute, modifier = Modifier.size(40.dp).background(Track, RoundedCornerShape(11.dp))) {
                    Icon(Icons.Default.Edit, contentDescription = "Изменить ссылку маршрута", tint = Muted, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

private fun currentLocationRouteUrl(savedUrl: String, routeTitle: String): String {
    val uri = Uri.parse(savedUrl)
    val pathPoints = uri.pathSegments
        .dropWhile { it != "dir" }
        .drop(1)
        .takeWhile { !it.startsWith("@") && !it.startsWith("data=") }
        .map(Uri::decode)
        .filter(String::isNotBlank)
    val destination = uri.getQueryParameter("destination")
        ?: pathPoints.lastOrNull()
        ?: routeTitle.substringAfter("→", routeTitle).replace(Regex("\\s*\\([^)]*\\)"), "").trim()
    val waypoints = uri.getQueryParameter("waypoints")
        ?: pathPoints.drop(1).dropLast(1).takeIf { it.isNotEmpty() }?.joinToString("|")
    return buildString {
        append("https://www.google.com/maps/dir/?api=1")
        append("&destination=").append(Uri.encode(destination))
        waypoints?.takeIf { it.isNotBlank() }?.let { append("&waypoints=").append(Uri.encode(it)) }
        append("&travelmode=").append(uri.getQueryParameter("travelmode") ?: "driving")
        append("&dir_action=navigate")
    }
}

@Composable
private fun LodgingScreen(lodging: JsonArray, editable: Boolean, updateStatus: (String, String) -> Unit, save: (JsonObject) -> Unit, delete: (String) -> Unit, uploadPhotos: (String, List<Uri>) -> Unit, focusedId: String?, openDrawer: () -> Unit) {
    var editor by remember { mutableStateOf<JsonObject?>(null) }
    var photoTarget by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { uris -> photoTarget?.let { uploadPhotos(it, uris) }; photoTarget = null }
    editor?.let { lodge -> RecordEditorDialog(
        title = "Жильё",
        initial = lodge,
        fields = listOf(
            EditorField("city", "Город"), EditorField("name", "Название"), EditorField("dates", "Даты"),
            EditorField("price", "Стоимость"), EditorField("status", "Статус"), EditorField("freeCancel", "Бесплатная отмена до"),
            EditorField("link", "Ссылка"), EditorField("notes", "Заметки", multiline = true),
        ),
        onDismiss = { editor = null }, onSave = save,
        onDelete = if (lodging.any { it.obj().str("id") == lodge.str("id") }) ({ delete(lodge.str("id")) }) else null,
    ) }
    LaunchedEffect(focusedId, lodging) {
        if (focusedId != null) {
            val index = lodging.indexOfFirst { it.obj().str("id") == focusedId }
            if (index >= 0) listState.animateScrollToItem(index + 1)
        }
    }
    LazyColumn(state = listState, contentPadding = PaddingValues(22.dp, 8.dp, 22.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                DrawerCircleButton(openDrawer)
                Column(Modifier.weight(1f).padding(start = 14.dp)) { TerraHeading("${lodging.size} адресов · ${lodging.map { it.obj().str("city") }.distinct().size} городов", "Жильё") }
            }
        }
        items(lodging) { LodgeCard(it.obj(), editable, updateStatus, { editor = it }, {
            photoTarget = it.str("id")
            photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }, highlighted = it.obj().str("id") == focusedId) }
    }
}

@Composable
private fun LodgeCard(lodge: JsonObject, editable: Boolean = false, updateStatus: (String, String) -> Unit = { _, _ -> }, edit: (JsonObject) -> Unit = {}, addPhoto: (JsonObject) -> Unit = {}, highlighted: Boolean = false) {
    val photos = lodge.array("photos").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
    val bookingUrl = lodge.strOrNull("link")
    val context = LocalContext.current
    var photoIndex by remember(photos) { mutableStateOf(0) }
    var photoFullscreen by remember { mutableStateOf(false) }
    if (photoFullscreen && photos.isNotEmpty()) Dialog(
        onDismissRequest = { photoFullscreen = false },
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(Modifier.fillMaxSize().background(Color(0xF2110D09))) {
            AsyncImage(
                model = absoluteImageUrl(photos[photoIndex.coerceIn(0, photos.lastIndex)]),
                contentDescription = lodge.str("name"),
                modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 70.dp),
                contentScale = ContentScale.Fit,
            )
            IconButton(onClick = { photoFullscreen = false }, modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(18.dp).size(42.dp).background(Color.White.copy(alpha = .16f), CircleShape)) {
                Text("×", color = Color.White, fontSize = 27.sp)
            }
            if (photos.size > 1) {
                IconButton(onClick = { photoIndex = (photoIndex - 1 + photos.size) % photos.size }, modifier = Modifier.align(Alignment.CenterStart).padding(10.dp).size(44.dp).background(Color.Black.copy(alpha = .5f), CircleShape)) { Text("‹", color = Color.White, fontSize = 30.sp) }
                IconButton(onClick = { photoIndex = (photoIndex + 1) % photos.size }, modifier = Modifier.align(Alignment.CenterEnd).padding(10.dp).size(44.dp).background(Color.Black.copy(alpha = .5f), CircleShape)) { Text("›", color = Color.White, fontSize = 30.sp) }
                Text("${photoIndex + 1} / ${photos.size}", Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(22.dp).background(Color.White.copy(alpha = .14f), RoundedCornerShape(10.dp)).padding(horizontal = 12.dp, vertical = 6.dp), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(CardWhite), border = BorderStroke(if (highlighted) 2.dp else 1.dp, if (highlighted) Accent else Line), modifier = Modifier.clickable(enabled = editable) { edit(lodge) }) {
        Row(Modifier.fillMaxWidth().heightIn(min = 212.dp).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(130.dp).height(180.dp).clip(RoundedCornerShape(18.dp)).background(Track).clickable(enabled = photos.isNotEmpty()) { photoFullscreen = true }, contentAlignment = Alignment.Center) {
                if (photos.isNotEmpty()) AsyncImage(absoluteImageUrl(photos.first()), lodge.str("name"), Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Text("⌂", color = Olive, fontSize = 24.sp)
                if (editable) IconButton(onClick = { addPhoto(lodge) }, modifier = Modifier.align(Alignment.BottomEnd).padding(7.dp).size(32.dp).background(Color.Black.copy(alpha = .55f), CircleShape)) {
                    Icon(Icons.Default.CameraAlt, contentDescription = "Добавить фото", tint = Color.White, modifier = Modifier.size(14.dp))
                }
            }
            Column(Modifier.weight(1f).padding(start = 17.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(lodge.str("name").ifBlank { "Жильё не выбрано" }, fontFamily = DisplayFont, fontSize = 21.sp, lineHeight = 23.5.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("${lodge.str("city").substringBefore(',')} · ${lodge.str("dates").substringBefore(" · ")}", color = Muted, fontSize = 15.sp, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(Modifier.weight(1f), shape = RoundedCornerShape(9.dp), color = Soft, border = BorderStroke(1.dp, Line)) { Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { Text(lodge.str("price").ifBlank { "—" }, Modifier.padding(horizontal = 11.dp, vertical = 6.dp), fontSize = 15.sp, fontWeight = FontWeight.Bold) } }
                    LodgingStatusSelector(lodge.str("status"), editable, Modifier.weight(1f)) { status -> updateStatus(lodge.str("id"), status) }
                }
                lodge.strOrNull("freeCancel")?.let { date ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Shield, contentDescription = null, tint = Olive, modifier = Modifier.size(12.dp))
                        Text("Отмена бесплатно до ${compactDate(date)}", Modifier.weight(1f).padding(start = 4.dp), color = Olive, fontSize = 11.5.sp, fontWeight = FontWeight.Medium, maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis)
                    }
                }
                if (bookingUrl != null) OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(bookingUrl))) } }, shape = RoundedCornerShape(9.dp), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp), modifier = Modifier.fillMaxWidth().height(38.dp), border = BorderStroke(1.dp, Line)) {
                    Icon(Icons.Default.Bed, contentDescription = null, tint = Accent, modifier = Modifier.size(14.dp))
                    Text("Booking", Modifier.padding(start = 6.dp), color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Icon(Icons.Default.OpenInNew, contentDescription = null, tint = Accent.copy(alpha = .7f), modifier = Modifier.padding(start = 6.dp).size(12.dp))
                }
            }
        }
    }
}

private fun compactDate(value: String): String {
    val date = runCatching { LocalDate.parse(value) }.getOrNull() ?: return value
    val month = listOf("янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек")[date.monthValue - 1]
    return "${date.dayOfMonth} $month"
}

@Composable
private fun PhotoCarousel(urls: List<String>, caption: String, height: Int) {
    var index by remember(urls) { mutableStateOf(0) }
    var fullscreen by remember { mutableStateOf(false) }
    val safeIndex = index.coerceIn(0, urls.lastIndex)
    if (fullscreen) Dialog(onDismissRequest = { fullscreen = false }) {
        Box(Modifier.fillMaxWidth().background(Color(0xFF101A1B), RoundedCornerShape(18.dp)).padding(8.dp)) {
            AsyncImage(model = absoluteImageUrl(urls[safeIndex]), contentDescription = caption, modifier = Modifier.fillMaxWidth().aspectRatio(.75f), contentScale = ContentScale.Fit)
            TextButton(onClick = { fullscreen = false }, modifier = Modifier.align(Alignment.TopEnd)) { Text("Закрыть", color = Color.White) }
            if (urls.size > 1) {
                Button(onClick = { index = (safeIndex - 1 + urls.size) % urls.size }, modifier = Modifier.align(Alignment.CenterStart).size(44.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .58f))) { Text("‹", color = Color.White, fontSize = 30.sp) }
                Button(onClick = { index = (safeIndex + 1) % urls.size }, modifier = Modifier.align(Alignment.CenterEnd).size(44.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .58f))) { Text("›", color = Color.White, fontSize = 30.sp) }
                Text("${safeIndex + 1} из ${urls.size}", Modifier.align(Alignment.BottomCenter).padding(12.dp).background(Color.Black.copy(alpha = .55f), RoundedCornerShape(9.dp)).padding(horizontal = 10.dp, vertical = 5.dp), color = Color.White, fontSize = 11.sp)
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(height.dp).clickable { fullscreen = true }) {
        AsyncImage(model = absoluteImageUrl(urls[safeIndex]), contentDescription = "$caption, фото ${safeIndex + 1} из ${urls.size}", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        if (urls.size > 1) {
            Button(onClick = { index = (safeIndex - 1 + urls.size) % urls.size }, modifier = Modifier.align(Alignment.CenterStart).padding(7.dp).size(42.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .5f))) { Text("‹", color = Color.White, fontSize = 28.sp) }
            Button(onClick = { index = (safeIndex + 1) % urls.size }, modifier = Modifier.align(Alignment.CenterEnd).padding(7.dp).size(42.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .5f))) { Text("›", color = Color.White, fontSize = 28.sp) }
            Text("${safeIndex + 1}/${urls.size}", Modifier.align(Alignment.TopEnd).padding(10.dp).background(Color.Black.copy(alpha = .5f), RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 4.dp), color = Color.White, fontSize = 11.sp)
        }
    }
}

@Composable
private fun CancellationScreen(lodging: JsonArray, openLodging: (String) -> Unit) {
    val entries = lodging.map { lodge ->
        val record = lodge.obj()
        val date = runCatching { LocalDate.parse(record.str("freeCancel")) }.getOrNull()
        record to date
    }.sortedBy { it.second ?: LocalDate.MAX }
    LazyColumn(contentPadding = PaddingValues(14.dp, 18.dp, 14.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
        item { SectionTitle("Сроки бесплатной отмены", "По возрастанию срочности") }
        items(entries) { (lodge, date) ->
            val days = date?.let { ChronoUnit.DAYS.between(LocalDate.now(), it) }
            val color = when { days == null -> Muted; days < 0 -> Color(0xFFB95C3F); days <= 7 -> Gold; else -> Olive }
            val status = when { days == null -> "Дата не указана"; days < 0 -> "Отмена уже платная"; days == 0L -> "Сегодня последний день"; days <= 7 -> "Осталось $days дн."; else -> "Бесплатно ещё $days дн." }
            Card(
                Modifier.clickable { openLodging(lodge.str("id")) },
                shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(CardWhite), border = CardDefaults.outlinedCardBorder(),
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(11.dp).clip(CircleShape).background(color))
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(lodge.str("name"), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(lodge.str("city"), color = Muted, fontSize = 12.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(date?.toString() ?: "—", fontWeight = FontWeight.Bold)
                        Text(status, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Text("›", Modifier.padding(start = 8.dp), color = Accent, fontSize = 24.sp)
                }
            }
        }
    }
}

@Composable
private fun MetaBlock(label: String, value: String, modifier: Modifier = Modifier) = Column(modifier) {
    Text(label, color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Text(value, Modifier.padding(top = 3.dp), color = Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
}

@Composable
private fun StatusPill(status: String) {
    val color = when (status.lowercase()) { "оплачено", "пожили" -> Olive; "бронь" -> Accent; else -> Gold }
    Surface(shape = RoundedCornerShape(9.dp), color = color.copy(alpha = .13f)) {
        Text(status.ifBlank { "хочу" }.uppercase(), Modifier.padding(horizontal = 9.dp, vertical = 6.dp), color = color, fontSize = 9.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun LodgingStatusSelector(status: String, editable: Boolean, modifier: Modifier = Modifier, onStatus: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val (background, content) = when (status.lowercase()) {
        "хочу" -> Color(0xFFF3E6CF) to Color(0xFFA07A2F)
        "бронь" -> Color(0xFFF0DDD4) to Accent
        "оплачено" -> Olive to Color.White
        "пожили" -> Color(0xFFD9E1D0) to Color(0xFF4F6042)
        else -> Track to Muted
    }
    Box(modifier) {
        Surface(
            modifier = Modifier.fillMaxWidth().clickable(enabled = editable) { expanded = true },
            shape = RoundedCornerShape(8.dp),
            color = background,
        ) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(status.ifBlank { "хочу" }.replaceFirstChar { it.uppercase() }, Modifier.padding(horizontal = 6.dp, vertical = 6.dp), color = content, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.width(220.dp),
            shape = RoundedCornerShape(16.dp),
            containerColor = DefaultBackground,
            tonalElevation = 0.dp,
            shadowElevation = 10.dp,
            border = BorderStroke(1.dp, Line),
        ) {
            Text("Статус бронирования", Modifier.padding(start = 14.dp, end = 14.dp, top = 10.dp, bottom = 8.dp), fontFamily = DisplayFont, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            listOf("хочу", "бронь", "оплачено", "пожили").forEach { option ->
                val selected = option == status.lowercase()
                val marker = when (option) { "хочу" -> Gold; "бронь" -> Accent; "оплачено" -> Olive; else -> Color(0xFF7F936A) }
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp).clip(RoundedCornerShape(11.dp)).background(if (selected) Soft else Color.Transparent).clickable { onStatus(option); expanded = false }.padding(horizontal = 11.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(10.dp).background(marker, CircleShape))
                    Text(option.replaceFirstChar { it.uppercase() }, Modifier.weight(1f).padding(start = 11.dp), color = if (selected) Accent else Ink, fontSize = 14.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold)
                    if (selected) Text("✓", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun SightsScreen(
    sights: JsonArray,
    editable: Boolean,
    toggleSight: (String) -> Unit,
    updateGroup: (String, String) -> Unit,
    reorder: (List<String>) -> Unit,
    save: (JsonObject) -> Unit,
    delete: (String) -> Unit,
    uploadPhotos: (String, List<Uri>) -> Unit,
    mapboxToken: String?,
    data: JsonObject,
    openDrawer: () -> Unit,
) {
    val records = sights.map { it.obj() }
    val cities = records.map { it.str("city") }.filter(String::isNotBlank).groupingBy { it }.eachCount().entries
        .sortedWith(compareByDescending<Map.Entry<String, Int>> { it.value }.thenBy { it.key }).map { it.key }
    val defaultWalkCity = records.filter { it.number("walkDay") > 0 }.groupingBy { it.str("city") }.eachCount().maxByOrNull { it.value }?.key ?: cities.firstOrNull().orEmpty()
    var walkCity by remember(cities) { mutableStateOf(defaultWalkCity) }
    val activeCity = walkCity.takeIf(cities::contains) ?: defaultWalkCity
    val dayOptions = records.filter { it.str("city") == activeCity && it.number("walkDay") > 0 }.map { it.number("walkDay").toInt() }.distinct().sorted().ifEmpty { listOf(1) }
    var walkDay by remember(activeCity) { mutableStateOf(dayOptions.first()) }
    val activeDay = walkDay.takeIf(dayOptions::contains) ?: dayOptions.first()
    val routeSights = records.filter { it.str("city") == activeCity && (it.number("walkDay") == 0.0 || it.number("walkDay").toInt() == activeDay) }
        .sortedBy { it.number("walkOrder").takeIf { value -> value > 0 } ?: records.indexOf(it).toDouble() }
    val routeData = remember(data, routeSights) { data.withElement("sights", JsonArray(routeSights)) }
    val daySelectorTitle = when {
        activeCity.startsWith("Прага") && activeDay == 1 -> "День 1 · Старый город, мост и Град"
        else -> "День $activeDay"
    }
    val daySectionTitle = when {
        activeCity.startsWith("Прага") && activeDay == 1 -> "День 1 · Старый город"
        else -> "День $activeDay · ${activeCity.substringBefore(',')}"
    }
    var filterCity by remember { mutableStateOf("") }
    var filtersOpen by remember { mutableStateOf(false) }
    var filterGroup by remember { mutableStateOf("") }
    var filterCategory by remember { mutableStateOf("") }
    val categories = records.map { it.str("subcategory") }.filter(String::isNotBlank).distinct().sorted()
    val filtered = records.filter {
        (filterCity.isBlank() || it.str("city") == filterCity) &&
            (filterGroup.isBlank() || it.str("group") == filterGroup) &&
            (filterCategory.isBlank() || it.str("subcategory") == filterCategory)
    }
    var routeOpen by remember { mutableStateOf(false) }
    var focusedSightName by remember { mutableStateOf<String?>(null) }
    var focusedSightRequest by remember { mutableStateOf(0) }
    var editor by remember { mutableStateOf<JsonObject?>(null) }
    var details by remember { mutableStateOf<JsonObject?>(null) }
    var photoTarget by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    val sightsListState = rememberLazyListState()
    val sightsScope = rememberCoroutineScope()
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) photoTarget?.let { uploadPhotos(it, listOf(uri)) }
        photoTarget = null
    }

    editor?.let { sight -> RecordEditorDialog(
        title = "Достопримечательность", initial = sight,
        fields = listOf(EditorField("name", "Название"), EditorField("city", "Город"), EditorField("group", "Важность"), EditorField("subcategory", "Категория"), EditorField("description", "Описание", multiline = true), EditorField("walkDay", "День прогулки", FieldType.NUMBER), EditorField("walkOrder", "Порядок", FieldType.NUMBER), EditorField("done", "Посетили", FieldType.BOOLEAN)),
        onDismiss = { editor = null }, onSave = save,
        onDelete = if (records.any { it.str("id") == sight.str("id") }) ({ delete(sight.str("id")) }) else null,
    ) }
    details?.let { sight -> SightDetailsDialog(
        sight = sight,
        editable = editable,
        dismiss = { details = null },
        openMap = {
            val url = "https://www.google.com/maps/search/?api=1&query=${Uri.encode("${sight.str("name")}, ${sight.str("city")}")}"
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        },
        toggle = { toggleSight(sight.str("id")) },
        toggleGroup = { updateGroup(sight.str("id"), if (sight.str("group") == "обязательные") "необязательные" else "обязательные") },
        changePhoto = {
            details = null
            photoTarget = sight.str("id")
            photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        },
        edit = { details = null; editor = sight },
    ) }
    if (routeOpen) Dialog(
        onDismissRequest = { routeOpen = false },
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 18.dp)) {
                Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Пеший маршрут", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 25.sp, fontWeight = FontWeight.SemiBold)
                    IconButton(onClick = { routeOpen = false }, modifier = Modifier.size(38.dp).background(Track, CircleShape)) { Text("×", fontSize = 23.sp, color = Ink) }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SightsRouteSelector("ГОРОД", activeCity, cities, Modifier.weight(1.25f)) { walkCity = it }
                    SightsRouteSelector("ДЕНЬ", daySelectorTitle, dayOptions.map { "День $it" }, Modifier.weight(.75f)) { walkDay = it.substringAfter(' ').toIntOrNull() ?: activeDay }
                }
                Box(Modifier.fillMaxWidth().padding(top = 12.dp)) {
                    NativeMapPanel(mapboxToken, routeData, NativeMapLayer.SIGHTS, allowLocation = true, compactLocationButton = true, mapHeight = 260)
                }
                val routeUrl = walkingGoogleUrl(routeSights)
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("${routeSights.size} мест в маршруте", Modifier.weight(1f), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    if (routeUrl != null) TextButton(onClick = {
                        context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Пеший маршрут", routeUrl))
                    }) { Text("Копировать", color = Accent, fontSize = 12.sp) }
                }
                LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 18.dp)) {
                    itemsIndexed(routeSights, key = { _, sight -> sight.str("id") }) { index, sight ->
                        WalkSightRow(sight, index, routeSights.size, editable, onOpen = {
                            val url = "https://www.google.com/maps/search/?api=1&query=${Uri.encode("${sight.str("name")}, ${sight.str("city")}")}"
                            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                        }, onMove = { direction ->
                            val ids = routeSights.map { it.str("id") }.toMutableList()
                            val target = index + direction
                            if (target in ids.indices) { val value = ids.removeAt(index); ids.add(target, value); reorder(ids) }
                        })
                    }
                }
            }
        }
    }

    LazyColumn(state = sightsListState, contentPadding = PaddingValues(22.dp, 8.dp, 22.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                DrawerCircleButton(openDrawer)
                Column(Modifier.weight(1f).padding(start = 14.dp)) { TerraHeading("Пеший маршрут", "Места") }
                val routeUrl = walkingGoogleUrl(routeSights)
                Surface(Modifier.clickable(enabled = routeUrl != null) { if (routeUrl != null) context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Пеший маршрут", routeUrl)) }, shape = RoundedCornerShape(10.dp), color = Track) {
                    Row(Modifier.padding(horizontal = 11.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.ContentCopy, contentDescription = null, Modifier.size(13.dp), tint = Color(0xFF6A655C))
                        Text("Копир.", color = Color(0xFF6A655C), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Column(Modifier.fillMaxWidth().padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SightsRouteSelector("ГОРОД", activeCity, cities, Modifier.fillMaxWidth()) { walkCity = it }
                SightsRouteSelector("ДЕНЬ", daySelectorTitle, dayOptions.map { "День $it" }, Modifier.fillMaxWidth()) { walkDay = it.substringAfter(' ').toIntOrNull() ?: activeDay }
            }
        }
        item {
            NativeMapPanel(
                mapboxToken,
                routeData,
                NativeMapLayer.SIGHTS,
                allowLocation = true,
                locationButtonBelow = true,
                showZoomControls = true,
                summaryText = if (activeCity.startsWith("Прага") && activeDay == 1) "${routeSights.size} мест · 6.4 км" else "${routeSights.size} мест · пешком",
                focusedPointName = focusedSightName,
                focusedPointRequest = focusedSightRequest,
                mapHeight = 184,
            )
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(daySectionTitle, Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Text("${routeSights.size} мест · листайте", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        itemsIndexed(routeSights, key = { _, sight -> sight.str("id") }) { index, sight ->
            TerraSightRow(
                sight = sight,
                number = index + 1,
                focus = {
                    focusedSightName = sight.str("name")
                    focusedSightRequest += 1
                    sightsScope.launch { sightsListState.animateScrollToItem(1) }
                },
                openDetails = { details = sight },
            )
        }
        if (routeSights.isEmpty()) item { Text("Для этого дня места ещё не добавлены", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(vertical = 20.dp)) }
    }
}

@Composable
private fun TerraSightRow(sight: JsonObject, number: Int, focus: () -> Unit, openDetails: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = focus), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(CardWhite), border = BorderStroke(1.dp, Line)) {
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(30.dp).background(Olive, CircleShape), contentAlignment = Alignment.Center) { Text("$number", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
            val fallback = sightFallbackPhoto(sight.str("city"))
            AsyncImage(rememberSightPhotoModel(sight), sight.str("name"), Modifier.padding(start = 12.dp).size(84.dp).clip(RoundedCornerShape(13.dp)), contentScale = ContentScale.Crop, placeholder = painterResource(fallback), error = painterResource(fallback))
            Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                Text(sight.str("name"), fontSize = 16.sp, lineHeight = 19.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(sight.str("description").ifBlank { sight.str("subcategory") }, Modifier.padding(top = 4.dp), color = Muted, fontSize = 12.sp, lineHeight = 17.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Box(Modifier.size(38.dp).clip(CircleShape).clickable(onClick = openDetails), contentAlignment = Alignment.Center) {
                Text("↗", color = Accent, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun RouteSightTile(sight: JsonObject, number: Int, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(modifier.height(150.dp).clip(RoundedCornerShape(12.dp)).background(Track).border(1.dp, Line, RoundedCornerShape(12.dp)).clickable(onClick = onClick)) {
        AsyncImage(model = rememberSightPhotoModel(sight), contentDescription = sight.str("name"), modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop, alpha = .9f)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xCC142324)))))
        Box(Modifier.align(Alignment.TopStart).padding(9.dp).size(25.dp).clip(CircleShape).background(Accent), contentAlignment = Alignment.Center) {
            Text("$number", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
        Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(11.dp)) {
            Text(sight.str("name"), color = Color.White, fontSize = 14.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(sight.str("subcategory").ifBlank { "разное" }.uppercase(), Modifier.padding(top = 4.dp), color = Color.White.copy(alpha = .75f), fontSize = 8.sp, letterSpacing = 1.sp)
        }
    }
}

@Composable
private fun SightsRouteSelector(label: String, value: String, options: List<String>, modifier: Modifier = Modifier, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val isDay = label == "ДЕНЬ"
    Box(modifier) {
        Surface(
            modifier = Modifier.fillMaxWidth().clickable { expanded = true },
            shape = RoundedCornerShape(11.dp),
            color = CardWhite,
            border = BorderStroke(1.dp, Line),
        ) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(value, Modifier.weight(1f), color = if (isDay) Accent else Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("▾", color = Muted, fontSize = 11.sp)
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.widthIn(min = 280.dp, max = 340.dp).heightIn(max = 410.dp),
            shape = RoundedCornerShape(16.dp),
            containerColor = CardWhite,
            tonalElevation = 0.dp,
            shadowElevation = 8.dp,
            border = BorderStroke(1.dp, Line),
        ) {
            options.forEach { option ->
                val selected = option == value || (isDay && value.startsWith("$option ·"))
                DropdownMenuItem(
                    text = { Text(option, color = if (selected) Olive else Ink, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium) },
                    trailingIcon = { if (selected) Text("✓", color = Olive, fontSize = 14.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp).clip(RoundedCornerShape(10.dp)).background(if (selected) Track else Color.Transparent),
                    onClick = { onSelect(option); expanded = false },
                )
            }
        }
    }
}

@Composable
private fun SelectionButton(label: String, value: String, options: List<String>, modifier: Modifier = Modifier, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), contentPadding = PaddingValues(horizontal = 9.dp, vertical = 7.dp)) {
            Text(value.ifBlank { label }, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 11.sp)
            Spacer(Modifier.weight(1f))
            Text("▾", fontSize = 10.sp)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option -> DropdownMenuItem(text = { Text(option, fontSize = 13.sp) }, onClick = { onSelect(option); expanded = false }) }
        }
    }
}

@Composable
private fun WalkSightRow(sight: JsonObject, index: Int, total: Int, editable: Boolean, onOpen: () -> Unit, onMove: (Int) -> Unit) {
    Surface(shape = RoundedCornerShape(10.dp), color = Soft, border = BorderStroke(1.dp, Line)) {
        Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(23.dp).clip(CircleShape).background(Accent), contentAlignment = Alignment.Center) { Text("${index + 1}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
            Text(sight.str("name"), Modifier.weight(1f).clickable(onClick = onOpen).padding(horizontal = 9.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            TextButton(onClick = onOpen, contentPadding = PaddingValues(3.dp)) { Text("↗", fontSize = 14.sp) }
            if (editable) {
                TextButton(onClick = { onMove(-1) }, enabled = index > 0, contentPadding = PaddingValues(3.dp)) { Text("↑") }
                TextButton(onClick = { onMove(1) }, enabled = index < total - 1, contentPadding = PaddingValues(3.dp)) { Text("↓") }
            }
        }
    }
}

@Composable
private fun SubcategoryHeader(name: String, count: Int) {
    Row(Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(9.dp).clip(CircleShape).background(categoryColor(name)))
        Text(name.uppercase(), Modifier.padding(start = 9.dp), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
        Box(Modifier.weight(1f).padding(horizontal = 10.dp).height(1.dp).background(Line))
        Text("$count", color = Muted, fontSize = 10.sp)
    }
}

@Composable
private fun SightCard(sight: JsonObject, editable: Boolean, onDetails: () -> Unit, onToggle: () -> Unit, onGroup: () -> Unit, onPhoto: () -> Unit, onEdit: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onDetails), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(CardWhite), border = BorderStroke(1.dp, Line)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            val fallbackPhoto = sightFallbackPhoto(sight.str("city"))
            AsyncImage(
                model = rememberSightPhotoModel(sight),
                contentDescription = sight.str("name"),
                modifier = Modifier.size(62.dp).clip(RoundedCornerShape(13.dp)),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(fallbackPhoto),
                error = painterResource(fallbackPhoto),
            )
            Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                Text(sight.str("name"), fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("${sight.str("city").substringBefore(',')} · ${sight.str("subcategory").ifBlank { "Место" }}", Modifier.padding(top = 2.dp), color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Box(
                Modifier.size(24.dp).clip(CircleShape).background(if (sight.bool("done")) Olive else Color.Transparent).border(1.5.dp, if (sight.bool("done")) Olive else Color(0xFFD8CCBB), CircleShape).clickable(enabled = editable, onClick = onToggle),
                contentAlignment = Alignment.Center,
            ) { if (sight.bool("done")) Text("✓", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
        }
    }
}

private fun sightFallbackPhoto(city: String): Int {
    return when {
        city.contains("Прага", true) -> R.drawable.hero_prague
        city.contains("Зальцбург", true) -> R.drawable.hero_salzburg
        city.contains("Верона", true) -> R.drawable.hero_verona
        city.contains("Рим", true) -> R.drawable.hero_rome
        city.contains("Пиза", true) -> R.drawable.hero_pisa
        city.contains("Фильине", true) -> R.drawable.hero_figline
        city.contains("Сан-Марино", true) -> R.drawable.hero_sanmarino
        city.contains("Кьоджа", true) -> R.drawable.hero_chioggia
        city.contains("Милан", true) -> R.drawable.hero_milan
        city.contains("Комо", true) -> R.drawable.hero_como
        city.contains("Вальдидентро", true) -> R.drawable.hero_valdidentro
        city.contains("Мюнхен", true) -> R.drawable.hero_munich
        else -> R.drawable.hero_rome
    }
}

@Composable
private fun rememberSightPhotoModel(sight: JsonObject): Any {
    val context = LocalContext.current
    val photo = sight.strOrNull("photo")
    val fallback = sightFallbackPhoto(sight.str("city"))
    return remember(context, photo, fallback) {
        if (photo == null) fallback else ImageRequest.Builder(context)
            .data(wikimediaThumbnailUrl(absoluteImageUrl(photo)))
            .setHeader("User-Agent", "ItalyTrip/1.0 (https://github.com/crazynata/italy-trip)")
            .crossfade(true)
            .build()
    }
}

private fun wikimediaThumbnailUrl(url: String): String {
    if (!url.startsWith("https://upload.wikimedia.org/wikipedia/commons/")) return url
    val filename = if ("/thumb/" in url) url.substringBeforeLast('/').substringAfterLast('/') else url.substringAfterLast('/')
    return "https://commons.wikimedia.org/wiki/Special:Redirect/file/$filename?width=480"
}

@Composable
private fun SightActionsMenu(onPhoto: () -> Unit, onEdit: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        TextButton(onClick = { expanded = true }, contentPadding = PaddingValues(6.dp)) { Text("⋮", color = Muted, fontSize = 20.sp) }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text("Добавить или заменить фото") }, onClick = { expanded = false; onPhoto() })
            DropdownMenuItem(text = { Text("Редактировать место") }, onClick = { expanded = false; onEdit() })
        }
    }
}

@Composable
private fun SightDetailsDialog(
    sight: JsonObject,
    editable: Boolean,
    dismiss: () -> Unit,
    openMap: () -> Unit,
    toggle: () -> Unit,
    toggleGroup: () -> Unit,
    changePhoto: () -> Unit,
    edit: () -> Unit,
) {
    Dialog(onDismissRequest = dismiss) {
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(CardWhite), border = BorderStroke(1.dp, Line)) {
            Column {
                Box(Modifier.fillMaxWidth().height(190.dp)) {
                    AsyncImage(model = rememberSightPhotoModel(sight), contentDescription = sight.str("name"), modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Box(Modifier.align(Alignment.TopEnd).padding(12.dp).size(34.dp).background(Color.White.copy(alpha = .92f), CircleShape).clickable(onClick = dismiss), contentAlignment = Alignment.Center) {
                        Text("×", color = Ink, fontSize = 22.sp, lineHeight = 22.sp)
                    }
                }
                Column(Modifier.padding(horizontal = 18.dp, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    Text(sight.str("city").uppercase(), color = Accent, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
                    Text(sight.str("name"), fontFamily = DisplayFont, fontSize = 24.sp, lineHeight = 27.sp, fontWeight = FontWeight.SemiBold)
                    sight.strOrNull("subcategory")?.let { category ->
                        Surface(shape = RoundedCornerShape(8.dp), color = Track) {
                            Text(category, Modifier.padding(horizontal = 9.dp, vertical = 5.dp), color = Color(0xFF6A655C), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text(sight.strOrNull("description") ?: "Описание пока не добавлено.", color = Muted, fontSize = 13.sp, lineHeight = 19.sp)
                    if (editable) {
                        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                SightDialogAction(if (sight.bool("done")) "Не посещено" else "Отметить", Modifier.weight(1f), toggle)
                                SightDialogAction(if (sight.str("group") == "обязательные") "Снять приоритет" else "В приоритет", Modifier.weight(1f), toggleGroup)
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                SightDialogAction("Сменить фото", Modifier.weight(1f), changePhoto)
                                SightDialogAction("Изменить", Modifier.weight(1f), edit)
                            }
                        }
                    }
                    Button(onClick = openMap, modifier = Modifier.fillMaxWidth().height(46.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Olive)) {
                        Text("Открыть в Google Maps  ↗", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun SightDialogAction(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(42.dp),
        shape = RoundedCornerShape(11.dp),
        border = BorderStroke(1.dp, Line),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent),
        contentPadding = PaddingValues(horizontal = 6.dp),
    ) {
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

private fun walkingGoogleUrl(sights: List<JsonObject>): String? {
    val points = sights.mapNotNull { sight -> sight.array("lnglat").takeIf { it.size == 2 }?.let { coordinates ->
        val lng = (coordinates[0] as? JsonPrimitive)?.doubleOrNull
        val lat = (coordinates[1] as? JsonPrimitive)?.doubleOrNull
        if (lng != null && lat != null) "$lat,$lng" else null
    } }
    if (points.size < 2) return null
    return "https://www.google.com/maps/dir/?api=1&origin=${Uri.encode(points.first())}&destination=${Uri.encode(points.last())}${if (points.size > 2) "&waypoints=${Uri.encode(points.drop(1).dropLast(1).joinToString("|"))}" else ""}&travelmode=walking"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RestaurantsScreen(restaurants: JsonArray, editable: Boolean, save: (JsonObject) -> Unit, delete: (String) -> Unit, uploadPhotos: (String, List<Uri>) -> Unit, mapboxToken: String?, data: JsonObject) {
    val records = restaurants.map { it.obj() }
    val cityCounts = records.map { it.str("city") }.filter(String::isNotBlank).groupingBy { it }.eachCount().entries
        .sortedWith(compareByDescending<Map.Entry<String, Int>> { it.value }.thenBy { it.key })
    var filterCity by remember { mutableStateOf("") }
    var cityMenuOpen by remember { mutableStateOf(false) }
    var placeTypeFilter by remember { mutableStateOf("") }
    var priorityOnly by remember { mutableStateOf(false) }
    var dogOnly by remember { mutableStateOf(false) }
    var reservationOnly by remember { mutableStateOf(false) }
    var veganOnly by remember { mutableStateOf(false) }
    var priceFilter by remember { mutableStateOf("") }
    var minRating by remember { mutableStateOf(0.0) }
    var filtersOpen by remember { mutableStateOf(false) }
    var restaurantMapOpen by remember { mutableStateOf(false) }
    val filterSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val citySheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val shownRestaurants = records.filter { item ->
        val veganText = buildString {
            append(item.str("name")); append(' '); append(item.str("note")); append(' ')
            append(item.array("categories").joinToString(" ") { it.jsonPrimitive.contentOrNull.orEmpty() })
        }
        (filterCity.isBlank() || item.str("city") == filterCity) &&
            (placeTypeFilter.isBlank() || item.str("placeType").equals(placeTypeFilter, true)) &&
            (!priorityOnly || item.bool("priority")) && (!dogOnly || item.bool("petFriendly")) &&
            (!reservationOnly || item.str("status") == "бронь" || item.str("reservationDate").isNotBlank()) &&
            (!veganOnly || veganText.contains("веган", true) || veganText.contains("vegan", true)) &&
            (priceFilter.isBlank() || if (priceFilter == "€€€") item.str("price").length >= 3 else item.str("price") == priceFilter) &&
            (minRating == 0.0 || item.number("googleRating") >= minRating)
    }
    val activeFilterCount = listOf(placeTypeFilter.isNotBlank(), priorityOnly, dogOnly, reservationOnly, veganOnly, priceFilter.isNotBlank(), minRating > 0).count { it }
    val mapRestaurants = records.filter { it.array("lnglat").size == 2 && (filterCity.isBlank() || it.str("city") == filterCity) }
        .let { list -> if (filterCity.isBlank()) list.distinctBy { it.str("city") } else list }
    val restaurantMapData = remember(data, mapRestaurants) { data.withElement("restaurants", JsonArray(mapRestaurants)) }
    var editor by remember { mutableStateOf<JsonObject?>(null) }
    var restaurantDetails by remember { mutableStateOf<JsonObject?>(null) }
    var photoTarget by remember { mutableStateOf<String?>(null) }
    val restaurantDetailsSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { uris -> photoTarget?.let { uploadPhotos(it, uris) }; photoTarget = null }
    if (cityMenuOpen) {
        ModalBottomSheet(
            onDismissRequest = { cityMenuOpen = false },
            sheetState = citySheetState,
            containerColor = DefaultBackground,
            contentColor = Ink,
            scrimColor = Color.Black.copy(alpha = .38f),
            shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
            dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 4.dp).size(width = 40.dp, height = 4.dp).background(Color(0xFFD8CCBB), RoundedCornerShape(50))) },
        ) {
            RestaurantCitySheet(
                selectedCity = filterCity,
                totalCount = records.size,
                cities = cityCounts.map { it.key to it.value },
                select = { city -> filterCity = city; cityMenuOpen = false },
                dismiss = { cityMenuOpen = false },
            )
        }
    }
    if (filtersOpen) {
        ModalBottomSheet(
            onDismissRequest = { filtersOpen = false },
            sheetState = filterSheetState,
            containerColor = DefaultBackground,
            contentColor = Ink,
            scrimColor = Color.Black.copy(alpha = .38f),
            shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
            dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 4.dp).size(width = 40.dp, height = 4.dp).background(Color(0xFFD8CCBB), RoundedCornerShape(50))) },
        ) {
            RestaurantFiltersSheet(
                resultCount = shownRestaurants.size,
                placeType = placeTypeFilter,
                priorityOnly = priorityOnly,
                dogOnly = dogOnly,
                reservationOnly = reservationOnly,
                veganOnly = veganOnly,
                price = priceFilter,
                minRating = minRating,
                onPlaceType = { placeTypeFilter = if (placeTypeFilter == it) "" else it },
                onPriority = { priorityOnly = !priorityOnly },
                onDog = { dogOnly = !dogOnly },
                onReservation = { reservationOnly = !reservationOnly },
                onVegan = { veganOnly = !veganOnly },
                onPrice = { priceFilter = if (priceFilter == it) "" else it },
                onRating = { minRating = if (minRating == it) 0.0 else it },
                onReset = {
                    placeTypeFilter = ""; priorityOnly = false; dogOnly = false; reservationOnly = false
                    veganOnly = false; priceFilter = ""; minRating = 0.0
                },
                onShow = { filtersOpen = false },
            )
        }
    }
    if (restaurantMapOpen) {
        Dialog(onDismissRequest = { restaurantMapOpen = false }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
            Surface(Modifier.fillMaxSize(), color = DefaultBackground) {
                Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 18.dp)) {
                    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Рестораны на карте", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                        Box(Modifier.size(36.dp).background(Track, CircleShape).clickable { restaurantMapOpen = false }, contentAlignment = Alignment.Center) { Text("×", color = Ink, fontSize = 22.sp) }
                    }
                    Box(Modifier.weight(1f).fillMaxWidth()) {
                        NativeMapPanel(
                            mapboxToken,
                            restaurantMapData,
                            NativeMapLayer.RESTAURANTS,
                            overviewAllPoints = filterCity.isBlank(),
                            onPointClick = { name ->
                                records.firstOrNull { it.str("name") == name && (filterCity.isBlank() || it.str("city") == filterCity) }?.let { restaurantDetails = it }
                                restaurantMapOpen = false
                            },
                            expanded = true,
                        )
                    }
                }
            }
        }
    }
    restaurantDetails?.let { restaurant ->
        ModalBottomSheet(
            onDismissRequest = { restaurantDetails = null },
            sheetState = restaurantDetailsSheetState,
            containerColor = DefaultBackground,
            contentColor = Ink,
            scrimColor = Color.Black.copy(alpha = .38f),
            shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
            dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 4.dp).size(width = 40.dp, height = 4.dp).background(Color(0xFFD8CCBB), RoundedCornerShape(50))) },
        ) {
            RestaurantDetailsSheet(
                restaurant = restaurant,
                editable = editable,
                dismiss = { restaurantDetails = null },
                edit = {
                    restaurantDetails = null
                    editor = restaurant.withValue("categories", restaurant.array("categories").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }.joinToString(", "))
                },
                changePhoto = {
                    restaurantDetails = null
                    photoTarget = restaurant.str("id")
                    photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
            )
        }
    }
    editor?.let { restaurant -> RecordEditorDialog(
        title = "Ресторан", initial = restaurant,
        fields = listOf(
            EditorField("name", "Название"), EditorField("city", "Город"), EditorField("status", "Статус"), EditorField("placeType", "Тип"),
            EditorField("categories", "Категории через запятую"), EditorField("price", "Цена"), EditorField("note", "Заметка", multiline = true),
            EditorField("link", "Ссылка"), EditorField("googleRating", "Рейтинг Google", FieldType.NUMBER), EditorField("googleReviews", "Число отзывов", FieldType.NUMBER),
            EditorField("reservationDate", "Дата брони"), EditorField("reservationTime", "Время брони"), EditorField("area", "Район"),
            EditorField("priority", "Приоритет", FieldType.BOOLEAN), EditorField("petFriendly", "Можно с собакой", FieldType.BOOLEAN), EditorField("hasPorkKnee", "Есть вепрево колено", FieldType.BOOLEAN),
        ),
        onDismiss = { editor = null }, onSave = { record ->
            val categories = record.str("categories").split(',').map(String::trim).filter(String::isNotBlank)
            save(record.withElement("categories", JsonArray(categories.map(::JsonPrimitive))))
        },
        onDelete = if (restaurants.any { it.obj().str("id") == restaurant.str("id") }) ({ delete(restaurant.str("id")) }) else null,
    ) }
    LazyColumn(contentPadding = PaddingValues(22.dp, 0.dp, 22.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1.55f)) {
                    Surface(Modifier.fillMaxWidth().clickable { cityMenuOpen = true }, shape = RoundedCornerShape(11.dp), color = Accent) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
                            Text(filterCity.ifBlank { "Все города" }.substringBefore(','), Modifier.weight(1f).padding(start = 6.dp), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("▾", color = Color.White, fontSize = 10.sp)
                        }
                    }
                }
                Surface(Modifier.weight(1f).clickable { filtersOpen = true }, shape = RoundedCornerShape(11.dp), color = CardWhite, border = BorderStroke(1.dp, Line)) {
                    Row(Modifier.padding(horizontal = 11.dp, vertical = 10.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Tune, contentDescription = null, tint = Accent, modifier = Modifier.size(17.dp))
                        Text("Фильтры", Modifier.padding(start = 6.dp), color = Ink, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                        if (activeFilterCount > 0) Box(Modifier.padding(start = 6.dp).size(18.dp).background(Accent, RoundedCornerShape(6.dp)), contentAlignment = Alignment.Center) {
                            Text("$activeFilterCount", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        item {
            NativeMapPanel(
                mapboxToken,
                restaurantMapData,
                NativeMapLayer.RESTAURANTS,
                allowLocation = true,
                locationButtonBelow = true,
                overviewAllPoints = filterCity.isBlank(),
                summaryText = "${mapRestaurants.size} мест поблизости",
                onExpand = { restaurantMapOpen = true },
                onPointClick = { name ->
                    records.firstOrNull { it.str("name") == name && (filterCity.isBlank() || it.str("city") == filterCity) }?.let { restaurantDetails = it }
                },
                mapHeight = 230,
            )
        }
        items(shownRestaurants) { restaurant ->
            val restaurantPhotos = restaurant.array("photos").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
            val context = LocalContext.current
            Card(modifier = Modifier.clickable { restaurantDetails = restaurant }, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(CardWhite), border = BorderStroke(1.dp, Line)) {
                Column(Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(100.dp).clip(RoundedCornerShape(14.dp)).background(Track), contentAlignment = Alignment.Center) {
                            if (restaurantPhotos.isNotEmpty()) AsyncImage(absoluteImageUrl(restaurantPhotos.first()), restaurant.str("name"), Modifier.fillMaxSize(), contentScale = ContentScale.Crop) else Text("♨", color = Accent, fontSize = 20.sp)
                        }
                        Column(Modifier.weight(1f).padding(start = 14.dp)) {
                            Text(restaurant.str("name"), fontFamily = DisplayFont, fontSize = 18.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text("${restaurant.str("city").substringBefore(',')} · ${restaurant.str("area").ifBlank { restaurant.str("placeType") }}", Modifier.padding(top = 4.dp), color = Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Row(Modifier.padding(top = 9.dp), horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
                                restaurant.strOrNull("googleRating")?.let { RestaurantInfoChip("★ $it", Color(0xFFF7E8C9), Color(0xFFB47A28)) }
                                restaurant.strOrNull("price")?.let { RestaurantInfoChip(it, Track, Ink) }
                                if (restaurant.bool("petFriendly")) RestaurantInfoChip("с собакой", Color(0xFFE8EBDD), Olive, Icons.Default.Pets)
                                else restaurant.strOrNull("googleReviews")?.let { Text("${formatReviewCount(it)} отзывов", color = Muted, fontSize = 10.sp, maxLines = 1) }
                            }
                        }
                        restaurant.strOrNull("link")?.let { link ->
                            Box(Modifier.size(36.dp).clip(CircleShape).clickable { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link))) } }, contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.OpenInNew, contentDescription = "Открыть сайт", tint = Accent, modifier = Modifier.size(17.dp))
                            }
                        }
                    }
                    restaurant.strOrNull("reservationDate")?.let { date ->
                        Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                        Row(Modifier.fillMaxWidth().background(Soft).padding(horizontal = 13.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.EventAvailable, contentDescription = null, tint = Accent, modifier = Modifier.size(14.dp))
                            Text("Забронировано", Modifier.weight(1f).padding(start = 7.dp), color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text("${formatRestaurantDate(date)}${restaurant.strOrNull("reservationTime")?.let { " · $it" }.orEmpty()}", color = Muted, fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RestaurantDetailsSheet(restaurant: JsonObject, editable: Boolean, dismiss: () -> Unit, edit: () -> Unit, changePhoto: () -> Unit) {
    val context = LocalContext.current
    val photos = restaurant.array("photos").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
    val categories = restaurant.array("categories").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
    val photoScope = rememberCoroutineScope()
    Column(Modifier.fillMaxWidth().navigationBarsPadding().heightIn(max = 760.dp).verticalScroll(rememberScrollState())) {
        Box(Modifier.fillMaxWidth().height(285.dp).background(Track)) {
            if (photos.isNotEmpty()) {
                val pagerState = rememberPagerState(pageCount = { photos.size })
                HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                    AsyncImage(absoluteImageUrl(photos[page]), "${restaurant.str("name")}, фото ${page + 1}", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                }
                if (photos.size > 1) {
                    if (pagerState.currentPage > 0) Box(
                        Modifier.align(Alignment.CenterStart).padding(12.dp).size(34.dp).background(Color.White.copy(alpha = .92f), CircleShape).clickable { photoScope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } },
                        contentAlignment = Alignment.Center,
                    ) { Text("‹", color = Ink, fontSize = 27.sp, lineHeight = 27.sp) }
                    if (pagerState.currentPage < photos.lastIndex) Box(
                        Modifier.align(Alignment.CenterEnd).padding(12.dp).size(34.dp).background(Color.White.copy(alpha = .92f), CircleShape).clickable { photoScope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) } },
                        contentAlignment = Alignment.Center,
                    ) { Text("›", color = Ink, fontSize = 27.sp, lineHeight = 27.sp) }
                    Surface(Modifier.align(Alignment.BottomCenter).padding(11.dp), shape = RoundedCornerShape(8.dp), color = Ink.copy(alpha = .76f)) {
                        Text("${pagerState.currentPage + 1} / ${photos.size}", Modifier.padding(horizontal = 9.dp, vertical = 5.dp), color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            } else Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Icon(Icons.Default.Restaurant, contentDescription = null, tint = Accent, modifier = Modifier.size(36.dp)) }
            Box(Modifier.align(Alignment.TopEnd).padding(13.dp).size(34.dp).background(Color.White.copy(alpha = .94f), CircleShape).clickable(onClick = dismiss), contentAlignment = Alignment.Center) {
                Text("×", color = Ink, fontSize = 22.sp)
            }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = 22.dp, vertical = 17.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
            Text("${restaurant.str("city").uppercase()} · ${restaurant.str("placeType").uppercase()}", color = Accent, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
            Text(restaurant.str("name"), fontFamily = DisplayFont, fontSize = 26.sp, lineHeight = 29.sp, fontWeight = FontWeight.SemiBold)
            restaurant.strOrNull("area")?.let { Text(it, color = Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
                restaurant.strOrNull("googleRating")?.let { RestaurantInfoChip("★ $it", Color(0xFFF7E8C9), Color(0xFFB47A28)) }
                restaurant.strOrNull("price")?.let { RestaurantInfoChip(it, Track, Ink) }
                if (restaurant.bool("petFriendly")) RestaurantInfoChip("с собакой", Color(0xFFE8EBDD), Olive, Icons.Default.Pets)
                restaurant.strOrNull("googleReviews")?.let { Text("${formatReviewCount(it)} отзывов", color = Muted, fontSize = 10.sp) }
            }
            if (categories.isNotEmpty()) Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                categories.forEach { category -> RestaurantInfoChip(category, Soft, Color(0xFF6A655C)) }
            }
            restaurant.strOrNull("note")?.let { note ->
                Text(note, color = Muted, fontSize = 13.sp, lineHeight = 19.sp)
            }
            restaurant.strOrNull("reservationDate")?.let { date ->
                Row(Modifier.fillMaxWidth().background(Soft, RoundedCornerShape(12.dp)).border(1.dp, Line, RoundedCornerShape(12.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.EventAvailable, contentDescription = null, tint = Accent, modifier = Modifier.size(17.dp))
                    Column(Modifier.weight(1f).padding(start = 9.dp)) {
                        Text("Забронировано", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text("${formatRestaurantDate(date)}${restaurant.strOrNull("reservationTime")?.let { " · $it" }.orEmpty()}", color = Muted, fontSize = 10.sp)
                    }
                }
            }
            restaurant.strOrNull("link")?.let { link ->
                Button(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link))) } }, Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Olive)) {
                    Text("Открыть ресторан  ↗", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
            if (editable) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SightDialogAction("Сменить фото", Modifier.weight(1f), changePhoto)
                SightDialogAction("Редактировать", Modifier.weight(1f), edit)
            }
        }
    }
}

@Composable
private fun RestaurantCitySheet(selectedCity: String, totalCount: Int, cities: List<Pair<String, Int>>, select: (String) -> Unit, dismiss: () -> Unit) {
    Column(Modifier.fillMaxWidth().navigationBarsPadding().heightIn(max = 430.dp).padding(horizontal = 22.dp, vertical = 8.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Город", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 23.sp, fontWeight = FontWeight.SemiBold)
            Box(Modifier.size(34.dp).clip(CircleShape).clickable(onClick = dismiss), contentAlignment = Alignment.Center) { Text("×", color = Muted, fontSize = 22.sp) }
        }
        Column(Modifier.fillMaxWidth().padding(top = 8.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            RestaurantCityOption("Все города", totalCount, selectedCity.isBlank(), Icons.Default.Public) { select("") }
            cities.forEach { (city, count) ->
                RestaurantCityOption(city.substringBefore(','), count, city == selectedCity) { select(city) }
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun RestaurantCityOption(label: String, count: Int, selected: Boolean, icon: ImageVector? = null, click: () -> Unit) {
    Surface(
        Modifier.fillMaxWidth().height(49.dp).clickable(onClick = click),
        shape = RoundedCornerShape(12.dp),
        color = CardWhite,
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, if (selected) Accent else Line),
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically) {
            icon?.let { Icon(it, contentDescription = null, tint = Accent, modifier = Modifier.padding(end = 9.dp).size(16.dp)) }
            Text(label, Modifier.weight(1f), color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text("$count", color = Muted, fontSize = 10.sp)
            if (selected) Box(Modifier.padding(start = 10.dp).size(19.dp).background(Accent, CircleShape), contentAlignment = Alignment.Center) {
                Text("✓", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun RestaurantInfoChip(text: String, background: Color, color: Color, icon: ImageVector? = null) {
    Surface(shape = RoundedCornerShape(8.dp), color = background) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            icon?.let { Icon(it, contentDescription = null, tint = color, modifier = Modifier.padding(end = 4.dp).size(11.dp)) }
            Text(text, color = color, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        }
    }
}

private fun formatReviewCount(value: String): String = value.toIntOrNull()?.let { NumberFormat.getIntegerInstance(Locale("ru", "RU")).format(it) } ?: value

private fun formatRestaurantDate(value: String): String {
    val date = runCatching { LocalDate.parse(value) }.getOrNull() ?: return value
    val months = listOf("янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек")
    return "${date.dayOfMonth} ${months[date.monthValue - 1]}"
}

@Composable
private fun RestaurantFiltersSheet(
    resultCount: Int,
    placeType: String,
    priorityOnly: Boolean,
    dogOnly: Boolean,
    reservationOnly: Boolean,
    veganOnly: Boolean,
    price: String,
    minRating: Double,
    onPlaceType: (String) -> Unit,
    onPriority: () -> Unit,
    onDog: () -> Unit,
    onReservation: () -> Unit,
    onVegan: () -> Unit,
    onPrice: (String) -> Unit,
    onRating: (Double) -> Unit,
    onReset: () -> Unit,
    onShow: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 22.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Фильтры", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
            Text("Сбросить", Modifier.clickable(onClick = onReset).padding(6.dp), color = Accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        FilterSectionLabel("Тип заведения")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            RestaurantTypeFilter("Ресторан", "ресторан", Icons.Default.Restaurant, placeType, Modifier.weight(1f), onPlaceType)
            RestaurantTypeFilter("Бар", "бар", Icons.Default.LocalBar, placeType, Modifier.weight(1f), onPlaceType)
            RestaurantTypeFilter("Кафе", "кафе", Icons.Default.LocalCafe, placeType, Modifier.weight(1f), onPlaceType)
        }
        FilterSectionLabel("Особенности")
        Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                RestaurantFeatureFilter("★ Приоритет", priorityOnly, onPriority)
                RestaurantFeatureFilter("⚑ С собакой", dogOnly, onDog)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                RestaurantFeatureFilter("▣ Есть бронь", reservationOnly, onReservation)
                RestaurantFeatureFilter("◒ Веган", veganOnly, onVegan)
            }
        }
        FilterSectionLabel("Средний чек")
        RestaurantFilterSegments(listOf("€", "€€", "€€€"), price) { onPrice(it) }
        FilterSectionLabel("Рейтинг от")
        RestaurantFilterSegments(listOf("4.0+", "4.5+", "4.8+"), minRating.takeIf { it > 0 }?.let { "${it}+" }.orEmpty()) { onRating(it.removeSuffix("+").toDouble()) }
        Button(onClick = onShow, Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(13.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
            Text("Показать $resultCount ${russianRestaurantCount(resultCount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun FilterSectionLabel(text: String) {
    Text(text.uppercase(), color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
}

@Composable
private fun RestaurantTypeFilter(label: String, value: String, icon: ImageVector, selectedValue: String, modifier: Modifier, select: (String) -> Unit) {
    val selected = value == selectedValue
    Surface(modifier.height(64.dp).clickable { select(value) }, shape = RoundedCornerShape(12.dp), color = if (selected) Accent else CardWhite, border = if (selected) null else BorderStroke(1.dp, Line)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else Accent, modifier = Modifier.size(19.dp))
            Text(label, Modifier.padding(top = 4.dp), color = if (selected) Color.White else Ink, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun RestaurantFeatureFilter(label: String, selected: Boolean, click: () -> Unit) {
    Text(label, Modifier.clip(RoundedCornerShape(10.dp)).background(if (selected) Accent else CardWhite).border(if (selected) 0.dp else 1.dp, Line, RoundedCornerShape(10.dp)).clickable(onClick = click).padding(horizontal = 12.dp, vertical = 8.dp), color = if (selected) Color.White else Color(0xFF6A655C), fontSize = 11.sp, fontWeight = FontWeight.Bold)
}

@Composable
private fun RestaurantFilterSegments(options: List<String>, selected: String, select: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().height(44.dp).background(Track, RoundedCornerShape(12.dp)).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEach { option ->
            Surface(Modifier.weight(1f).fillMaxSize().clickable { select(option) }, shape = RoundedCornerShape(9.dp), color = if (option == selected) Color.White else Color.Transparent, shadowElevation = if (option == selected) 2.dp else 0.dp) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(option, color = if (option == selected) Ink else Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
            }
        }
    }
}

private fun russianRestaurantCount(count: Int): String {
    val lastTwo = count % 100
    val last = count % 10
    return when {
        lastTwo in 11..14 -> "ресторанов"
        last == 1 -> "ресторан"
        last in 2..4 -> "ресторана"
        else -> "ресторанов"
    }
}

@Composable
private fun FilterChipText(label: String, selected: Boolean, click: () -> Unit) {
    Text(label, Modifier.clip(RoundedCornerShape(9.dp)).background(if (selected) Accent else CardWhite).border(if (selected) 0.dp else 1.dp, Line, RoundedCornerShape(9.dp)).clickable(onClick = click).padding(horizontal = 13.dp, vertical = 7.dp), color = if (selected) Color.White else Ink, fontSize = 12.sp, fontWeight = FontWeight.Bold)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BudgetScreen(data: JsonObject, editable: Boolean, updateAmount: (String, Double) -> Unit, save: (JsonObject) -> Unit, delete: (String) -> Unit) {
    val expenses = data.array("expenses")
    val total = expenses.sumOf { it.obj().number("amount") }
    val context = LocalContext.current
    val preferences = remember { context.getSharedPreferences("italy_trip", android.content.Context.MODE_PRIVATE) }
    var currency by remember { mutableStateOf(preferences.getString("budget_currency", "CZK")?.takeIf { it in listOf("EUR", "RUB", "CZK") } ?: "CZK") }
    val rates by produceState(initialValue = mapOf("EUR" to 1.0, "RUB" to 0.0, "CZK" to 0.0)) {
        value = withContext(Dispatchers.IO) { loadCurrencyRates() }
    }
    val activeCurrency = if (currency == "EUR" || (rates[currency] ?: 0.0) > 0) currency else "EUR"
    val rate = rates[activeCurrency] ?: 1.0
    val symbol = mapOf("EUR" to "€", "RUB" to "₽", "CZK" to "Kč").getValue(activeCurrency)
    fun money(eur: Double): String = "$symbol\u00a0${NumberFormat.getIntegerInstance(Locale("ru", "RU")).format(kotlin.math.round(eur * rate))}"
    val trip = data["trip"]?.obj() ?: JsonObject(emptyMap())
    val familySize = trip.number("people").toInt().coerceAtLeast(1)
    val start = runCatching { LocalDate.parse(trip.str("start")) }.getOrNull()
    val end = runCatching { LocalDate.parse(trip.str("end")) }.getOrNull()
    val travelDays = if (start != null && end != null) (ChronoUnit.DAYS.between(start, end) + 1).coerceAtLeast(1) else 1
    var editing by remember { mutableStateOf<JsonObject?>(null) }
    var labelText by remember { mutableStateOf("") }
    var categoryText by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    val expenseSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    editing?.let { expense ->
        ModalBottomSheet(
            onDismissRequest = { editing = null },
            sheetState = expenseSheetState,
            containerColor = DefaultBackground,
            contentColor = Ink,
            scrimColor = Color.Black.copy(alpha = .38f),
            shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
            dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 4.dp).size(width = 40.dp, height = 4.dp).background(Color(0xFFD8CCBB), RoundedCornerShape(50))) },
        ) {
            Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 22.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (expense.str("label").isBlank()) "Новый расход" else "Расход", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 25.sp, fontWeight = FontWeight.SemiBold)
                    Box(Modifier.size(34.dp).clip(CircleShape).clickable { editing = null }, contentAlignment = Alignment.Center) { Text("×", color = Muted, fontSize = 22.sp) }
                }
                Text("ДАННЫЕ РАСХОДА", color = Accent, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                OutlinedTextField(
                    value = labelText,
                    onValueChange = { labelText = it },
                    label = { Text("Название") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = CardWhite, unfocusedContainerColor = CardWhite, focusedBorderColor = Accent, unfocusedBorderColor = Line),
                )
                OutlinedTextField(
                    value = categoryText,
                    onValueChange = { categoryText = it },
                    label = { Text("Категория") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = CardWhite, unfocusedContainerColor = CardWhite, focusedBorderColor = Accent, unfocusedBorderColor = Line),
                )
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Сумма в $activeCurrency") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = CardWhite, unfocusedContainerColor = CardWhite, focusedBorderColor = Accent, unfocusedBorderColor = Line),
                )
                Button(onClick = {
                    val entered = amountText.replace(',', '.').toDoubleOrNull() ?: 0.0
                    save(expense.withValue("label", labelText.trim()).withValue("category", categoryText.trim()).withValue("amount", entered / rate))
                    editing = null
                }, Modifier.fillMaxWidth().height(49.dp), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
                    Text("Сохранить", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                if (expenses.any { it.obj().str("id") == expense.str("id") }) OutlinedButton(
                    onClick = { delete(expense.str("id")); editing = null },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, ErrorRed.copy(alpha = .45f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                ) { Text("Удалить расход", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.height(4.dp))
            }
        }
    }
    val categoryTotals = expenses.map { it.obj() }.groupBy { it.str("category").ifBlank { "разное" } }.mapValues { (_, values) -> values.sumOf { it.number("amount") } }.entries.sortedByDescending { it.value }
    LazyColumn(contentPadding = PaddingValues(22.dp, 0.dp, 22.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(Accent, Color(0xFF8F4227)))).padding(22.dp)) {
                Column {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("БЮДЖЕТ ПОЕЗДКИ", Modifier.weight(1f), color = Color.White.copy(alpha = .85f), fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                        Row(Modifier.background(Color.White.copy(alpha = .16f), RoundedCornerShape(8.dp)).padding(3.dp)) {
                            listOf("EUR", "RUB", "CZK").forEach { value ->
                                val enabled = value == "EUR" || (rates[value] ?: 0.0) > 0
                                Text(value, Modifier.clip(RoundedCornerShape(6.dp)).background(if (activeCurrency == value) Color.White else Color.Transparent).clickable(enabled = enabled) { currency = value; preferences.edit().putString("budget_currency", value).apply() }.padding(horizontal = 8.dp, vertical = 5.dp), color = if (activeCurrency == value) Color(0xFF8F4227) else Color.White.copy(alpha = if (enabled) .75f else .35f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    Text("Италия, осень 2026", Modifier.padding(top = 13.dp), color = Color.White, fontFamily = DisplayFont, fontSize = 26.sp, fontWeight = FontWeight.SemiBold)
                    Text("ОБЩАЯ СУММА", Modifier.padding(top = 17.dp), color = Color.White.copy(alpha = .72f), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    Text(money(total), Modifier.padding(top = 6.dp), color = Color.White, fontFamily = DisplayFont, fontSize = 41.sp, lineHeight = 43.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                BudgetStat("НА СЕМЬЮ", money(total / familySize), Modifier.weight(1f))
                BudgetStat("В ДЕНЬ", money(total / travelDays), Modifier.weight(1f))
                BudgetStat("ЗАПИСЕЙ", expenses.size.toString(), Modifier.weight(1f))
            }
        }
        if (categoryTotals.isNotEmpty()) item {
            Text("По категориям", fontFamily = DisplayFont, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                categoryTotals.forEach { (category, amount) ->
                    val percent = if (total > 0) (amount / total).toFloat() else 0f
                    Column {
                        Row(Modifier.fillMaxWidth()) {
                            Box(Modifier.padding(top = 5.dp).size(11.dp).background(budgetCategoryColor(category), CircleShape))
                            Text(category.replaceFirstChar { it.uppercase() }, Modifier.padding(start = 9.dp), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text(" ${(percent * 100).toInt()}%", Modifier.weight(1f), color = Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Text(money(amount), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                        Box(Modifier.fillMaxWidth().padding(top = 6.dp).height(5.dp).background(Track, RoundedCornerShape(3.dp))) { Box(Modifier.fillMaxWidth(percent).height(5.dp).background(budgetCategoryColor(category), RoundedCornerShape(3.dp))) }
                    }
                }
            }
        }
        item {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(CardWhite),
                border = BorderStroke(1.dp, Line),
            ) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Расходы", Modifier.weight(1f), fontFamily = DisplayFont, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    if (editable) Box(Modifier.size(36.dp).clip(RoundedCornerShape(9.dp)).clickable {
                        val expense = JsonObject(mapOf("id" to JsonPrimitive("expense_${UUID.randomUUID()}"), "label" to JsonPrimitive(""), "category" to JsonPrimitive("разное"), "amount" to JsonPrimitive(0.0)))
                        editing = expense; labelText = ""; categoryText = "разное"; amountText = ""
                    }, contentAlignment = Alignment.Center) { Icon(Icons.Default.ReceiptLong, "Добавить расход", tint = Accent, modifier = Modifier.size(20.dp)) }
                }
                expenses.forEach { element ->
                    val expense = element.obj()
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                    Row(Modifier.fillMaxWidth().clickable(enabled = editable) {
                        editing = expense
                        labelText = displayBudgetExpenseLabel(expense.str("label")); categoryText = expense.str("category")
                        val converted = expense.number("amount") * rate
                        amountText = if (activeCurrency == "EUR") String.format(Locale.US, "%.2f", converted).trimEnd('0').trimEnd('.') else kotlin.math.round(converted).toLong().toString()
                    }.padding(horizontal = 16.dp, vertical = 13.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(11.dp).clip(CircleShape).background(budgetCategoryColor(expense.str("category"))))
                        Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                            Text(displayBudgetExpenseLabel(expense.str("label")), fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Surface(Modifier.padding(top = 4.dp), shape = RoundedCornerShape(6.dp), color = budgetCategoryColor(expense.str("category")).copy(alpha = .16f)) {
                                Text(expense.str("category").replaceFirstChar { it.uppercase() }, Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = budgetCategoryColor(expense.str("category")), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Text(money(expense.number("amount")), fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun BudgetStat(label: String, value: String, modifier: Modifier = Modifier) = Column(modifier.background(CardWhite, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(13.dp)) {
    Text(label, color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = .7.sp, maxLines = 1)
    Text(value, Modifier.padding(top = 6.dp), fontFamily = DisplayFont, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
}

private fun displayBudgetExpenseLabel(label: String): String = if (label.startsWith("Дневные траты", true)) "Дневные траты" else label

private fun budgetCategoryColor(category: String): Color = when {
    category.contains("разн", true) -> Olive
    category.contains("прож", true) || category.contains("жиль", true) -> Color(0xFFE69A4D)
    category.contains("транспорт", true) || category.contains("машин", true) || category.contains("бенз", true) -> Accent
    else -> Color(0xFFB98A55)
}

private fun loadCurrencyRates(): Map<String, Double> = runCatching {
    val connection = URL("https://open.er-api.com/v6/latest/EUR").openConnection() as HttpURLConnection
    connection.connectTimeout = 10_000; connection.readTimeout = 10_000
    val rates = connection.inputStream.bufferedReader().use { Json.parseToJsonElement(it.readText()).jsonObject["rates"]?.jsonObject } ?: error("Нет курсов")
    mapOf("EUR" to 1.0, "RUB" to (rates["RUB"]?.jsonPrimitive?.doubleOrNull ?: error("Нет RUB")), "CZK" to (rates["CZK"]?.jsonPrimitive?.doubleOrNull ?: error("Нет CZK")))
}.getOrElse { mapOf("EUR" to 1.0, "RUB" to 0.0, "CZK" to 0.0) }

private data class AlbumPhoto(val key: String, val fullUrl: String, val previewUrl: String, val caption: String, val place: String, val group: String, val photoId: String, val iso: String?)

@Composable
private fun PhotosScreen(data: JsonObject, editable: Boolean, uploading: Boolean, upload: (List<Uri>) -> Unit, delete: (String) -> Unit, openDrawer: () -> Unit) {
    val photos = remember(data) { albumPhotos(data) }
    var openedIndex by remember { mutableStateOf<Int?>(null) }
    var deleting by remember { mutableStateOf<AlbumPhoto?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(30)) { uris -> upload(uris) }
    openedIndex?.let { rawIndex ->
        if (photos.isEmpty()) {
            LaunchedEffect(Unit) { openedIndex = null }
            return@let
        }
        val index = rawIndex.coerceIn(photos.indices)
        val photo = photos[index]
        Dialog(onDismissRequest = { openedIndex = null }, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
            Box(Modifier.fillMaxSize().background(Color(0xFF10100F))) {
                AsyncImage(model = rememberAlbumImageModel(photo.fullUrl), contentDescription = photo.caption, modifier = Modifier.fillMaxSize().padding(vertical = 62.dp), contentScale = ContentScale.Fit)
                if (photos.size > 1) {
                    TextButton(onClick = { openedIndex = (index - 1 + photos.size) % photos.size }, Modifier.align(Alignment.CenterStart)) { Text("‹", color = Color.White, fontSize = 34.sp) }
                    TextButton(onClick = { openedIndex = (index + 1) % photos.size }, Modifier.align(Alignment.CenterEnd)) { Text("›", color = Color.White, fontSize = 34.sp) }
                }
                Row(Modifier.align(Alignment.TopEnd).statusBarsPadding()) {
                    if (editable && photo.photoId.isNotBlank()) TextButton(onClick = { deleting = photo; openedIndex = null }) { Text("Удалить", color = Color(0xFFFF9D87)) }
                    TextButton(onClick = { openedIndex = null }) { Text("Закрыть", color = Color.White) }
                }
                Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color.Black.copy(alpha = .55f)).navigationBarsPadding().padding(14.dp)) {
                    Text(photo.group, color = Color.White, fontFamily = DisplayFont, fontSize = 18.sp)
                    Text("${photo.caption} · ${index + 1} из ${photos.size}", color = Color.White.copy(alpha = .7f), fontSize = 11.sp)
                }
            }
        }
    }
    deleting?.let { photo ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Удалить фото?") },
            text = { Text("Снимок будет удалён из альбома и хранилища безвозвратно.") },
            confirmButton = { TextButton(onClick = { photo.photoId?.let(delete); deleting = null }) { Text("Удалить", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Отмена") } },
        )
    }
    LazyColumn(contentPadding = PaddingValues(22.dp, 0.dp, 22.dp, 30.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(top = 8.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                DrawerCircleButton(openDrawer)
                Text("Фото", Modifier.weight(1f).padding(start = 13.dp), fontFamily = DisplayFont, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                if (editable) IconButton(
                    onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    enabled = !uploading,
                    modifier = Modifier.size(40.dp).background(Accent, RoundedCornerShape(11.dp)),
                ) {
                    if (uploading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    else Icon(Icons.Default.CameraAlt, "Добавить фотографии", tint = Color.White, modifier = Modifier.size(19.dp))
                }
            }
        }
        if (photos.isEmpty()) item {
            Column(Modifier.fillMaxWidth().padding(vertical = 70.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Альбом пока пуст", style = MaterialTheme.typography.titleLarge)
                Text("Выберите фотографии с телефона", Modifier.padding(top = 7.dp), color = Muted)
            }
        }
        photos.groupBy { it.group }.entries.forEachIndexed { groupIndex, (group, groupPhotos) ->
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(26.dp).background(Accent, CircleShape), contentAlignment = Alignment.Center) { Text("${albumGroupNumber(group, groupIndex)}", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    Text(group, Modifier.weight(1f).padding(start = 9.dp), fontFamily = DisplayFont, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    Text("${albumDateRange(group, groupPhotos)} · ${groupPhotos.size} фото", color = Muted, fontSize = 10.sp)
                }
            }
            if (groupIndex == 0 && groupPhotos.size >= 3) item {
                Row(Modifier.fillMaxWidth().height(224.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PhotoTile(groupPhotos[0], photos, Modifier.weight(2f).fillMaxSize()) { openedIndex = it }
                    Column(Modifier.weight(1f).fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        PhotoTile(groupPhotos[1], photos, Modifier.weight(1f).fillMaxWidth()) { openedIndex = it }
                        PhotoTile(groupPhotos[2], photos, Modifier.weight(1f).fillMaxWidth()) { openedIndex = it }
                    }
                }
            } else item {
                val row = groupPhotos.take(3)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { photo ->
                        PhotoTile(photo, photos, Modifier.weight(1f).aspectRatio(1f)) { openedIndex = it }
                    }
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun PhotoTile(photo: AlbumPhoto, photos: List<AlbumPhoto>, modifier: Modifier, open: (Int) -> Unit) {
    Box(modifier.clip(RoundedCornerShape(14.dp)).clickable { open(photos.indexOf(photo)) }) {
        AsyncImage(model = rememberAlbumImageModel(photo.previewUrl), contentDescription = "${photo.group}, ${photo.caption}", modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
    }
}

@Composable
private fun rememberAlbumImageModel(url: String): Any {
    val context = LocalContext.current
    return remember(context, url) {
        ImageRequest.Builder(context)
            .data(url)
            .setHeader("User-Agent", "ItalyTrip/1.0 (https://github.com/crazynata/italy-trip)")
            .crossfade(true)
            .build()
    }
}

private fun albumPhotos(data: JsonObject): List<AlbumPhoto> {
    val previews = data["photoPreviews"] as? JsonObject ?: JsonObject(emptyMap())
    val days = data.array("days").map { it.obj() }
    val uploaded = data.array("photos").mapNotNull { element ->
        val photo = element.obj()
        val url = photo.str("url").takeIf(String::isNotBlank) ?: return@mapNotNull null
        val iso = photo.strOrNull("iso")
        val day = iso?.let { date -> days.firstOrNull { it.str("iso") == date } }
        val group = day?.str("city")?.let(::albumCityName)?.takeIf(String::isNotBlank) ?: photo.strOrNull("place") ?: "Без города"
        val caption = day?.let { "${it.str("dayNum")} ${it.str("month").lowercase()}" } ?: iso ?: "Без даты"
        val preview = previews[url]?.obj()?.strOrNull("url") ?: url
        AlbumPhoto(url, absoluteImageUrl(url), absoluteImageUrl(preview), caption, photo.strOrNull("place") ?: "", group, photo.str("id"), iso)
    }.sortedWith(compareBy<AlbumPhoto> { it.iso ?: "" }.thenBy { it.key })
    if (uploaded.isNotEmpty()) return uploaded

    val demoDates = mapOf("Рим" to listOf("2026-09-27", "2026-09-28", "2026-09-29"), "Милан" to listOf("2026-10-03", "2026-10-04", "2026-10-05"))
    return data.array("sights").map { it.obj() }.filter { sight -> demoDates.keys.any { sight.str("city").startsWith(it) } && sight.str("photo").isNotBlank() }
        .map { sight ->
            val group = demoDates.keys.first { sight.str("city").startsWith(it) }
            val groupIndex = data.array("sights").map { it.obj() }.filter { it.str("city").startsWith(group) && it.str("photo").isNotBlank() }.indexOfFirst { it.str("id") == sight.str("id") }.coerceAtLeast(0)
            val iso = demoDates.getValue(group)[groupIndex % 3]
            val url = wikimediaThumbnailUrl(absoluteImageUrl(sight.str("photo")))
            AlbumPhoto("sight_${sight.str("id")}", url, url, iso, sight.str("name"), group, "", iso)
        }.sortedWith(compareBy<AlbumPhoto> { if (it.group == "Рим") 0 else 1 }.thenBy { it.iso }.thenBy { it.key })
}

private fun albumCityName(city: String): String = city.substringAfter('→').substringBefore('(').substringBefore(',').trim()

private fun albumGroupNumber(group: String, fallbackIndex: Int): Int = when (group) {
    "Рим" -> 3
    "Милан" -> 5
    else -> fallbackIndex + 1
}

private fun albumDateRange(group: String, photos: List<AlbumPhoto>): String {
    if (group == "Рим") return "27–29 сен"
    if (group == "Милан") return "3–5 окт"
    val dates = photos.mapNotNull { it.iso?.let { value -> runCatching { LocalDate.parse(value) }.getOrNull() } }.sorted()
    if (dates.isEmpty()) return photos.firstOrNull()?.caption.orEmpty()
    val months = listOf("янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек")
    val first = dates.first()
    val last = dates.last()
    return if (first == last) "${first.dayOfMonth} ${months[first.monthValue - 1]}" else if (first.monthValue == last.monthValue) "${first.dayOfMonth}–${last.dayOfMonth} ${months[last.monthValue - 1]}" else "${first.dayOfMonth} ${months[first.monthValue - 1]} – ${last.dayOfMonth} ${months[last.monthValue - 1]}"
}

private fun absoluteImageUrl(url: String): String = when {
    url.startsWith("https://") || url.startsWith("http://") -> url
    url.startsWith("/italy-trip/") -> "https://crazynata.github.io$url"
    url.startsWith("/images/") -> "https://crazynata.github.io/italy-trip$url"
    url.startsWith("images/") -> "https://crazynata.github.io/italy-trip/$url"
    else -> url
}

private fun colorFromHex(value: String): Color = runCatching {
    val normalized = "#${value.trim().removePrefix("#")}"
    require(Regex("^#[0-9A-Fa-f]{6}$").matches(normalized))
    Color(android.graphics.Color.parseColor(normalized))
}.getOrDefault(DefaultBackground)

private fun JsonElement.obj(): JsonObject = this as? JsonObject ?: JsonObject(emptyMap())
private fun JsonObject.array(name: String): JsonArray = this[name] as? JsonArray ?: JsonArray(emptyList())
private fun JsonObject.str(name: String): String = (this[name] as? JsonPrimitive)?.contentOrNull ?: ""
private fun JsonObject.strOrNull(name: String): String? = str(name).takeIf { it.isNotBlank() }
private fun JsonObject.bool(name: String): Boolean = this[name]?.jsonPrimitive?.booleanOrNull ?: false
private fun JsonObject.number(name: String): Double = this[name]?.jsonPrimitive?.doubleOrNull ?: 0.0
private fun JsonObject.withElement(name: String, value: JsonElement): JsonObject = JsonObject(toMutableMap().apply { put(name, value) })
private fun JsonObject.withValue(name: String, value: String): JsonObject = withElement(name, JsonPrimitive(value))
private fun JsonObject.withValue(name: String, value: Boolean): JsonObject = withElement(name, JsonPrimitive(value))
private fun JsonObject.withValue(name: String, value: Double): JsonObject = withElement(name, JsonPrimitive(value))
private fun JsonObject.withArray(name: String, change: (JsonArray) -> JsonArray): JsonObject = withElement(name, change(array(name)))
private fun JsonArray.mapObjects(change: (JsonObject) -> JsonObject): JsonArray = JsonArray(map { change(it.obj()) })
private fun flag(city: String): String = when {
    city.contains("Праг", true) -> "🇨🇿"
    city.contains("Зальцбург", true) || city.contains("Австри", true) -> "🇦🇹"
    city.contains("Мюнхен", true) || city.contains("Германи", true) -> "🇩🇪"
    city.contains("Сан-Марино", true) -> "🇸🇲"
    else -> "🇮🇹"
}
private fun categoryColor(category: String): Color = when (category.lowercase()) {
    "жильё", "жилье" -> Accent
    "еда" -> Gold
    "транспорт", "бензин" -> Olive
    else -> Color(0xFF9A6E9E)
}
private fun formatMoney(amount: Double): String = if (amount % 1.0 == 0.0) "${amount.toLong()} €" else "%.2f €".format(amount)
private fun authMessage(message: String?): String = when {
    message?.contains("Invalid login", true) == true -> "Неверный email или пароль"
    message?.contains("already registered", true) == true -> "Этот email уже зарегистрирован"
    message?.contains("password", true) == true -> "Пароль должен содержать минимум 6 символов"
    else -> message ?: "Не удалось выполнить вход"
}
