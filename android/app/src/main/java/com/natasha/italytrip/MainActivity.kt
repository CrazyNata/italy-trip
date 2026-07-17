package com.natasha.italytrip

import android.app.Application
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
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
import coil.compose.AsyncImage
import com.natasha.italytrip.data.TripRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.util.UUID
import java.time.LocalDate
import java.time.temporal.ChronoUnit

private val Ink = Color(0xFF173A3D)
private val Background = Color(0xFFEAF1F1)
private val CardWhite = Color(0xFFFFFFFF)
private val Accent = Color(0xFF2A7089)
private val Gold = Color(0xFFD99A4E)
private val Olive = Color(0xFF2F8A6A)
private val Muted = Color(0xFF5F7C7E)
private val Line = Color(0xFFD5E2E1)
private val Soft = Color(0xFFF1F7F6)
private val Track = Color(0xFFDBEAE8)
private val AppShape = RoundedCornerShape(20.dp)

class MainActivity : ComponentActivity() {
    private var deepLinkIntent by mutableStateOf<Intent?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        deepLinkIntent = intent
        setContent { ItalyTripApp(deepLinkIntent) }
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
)

enum class SyncState { CLEAN, DIRTY, SAVING, FAILED }

class TripViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = TripRepository(application)
    private val _state = MutableStateFlow(AppState())
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
        if (email == null) {
            _state.value = AppState(loading = false, rememberLogin = repository.rememberLogin())
            return@launch
        }
        val cached = repository.cachedTrip()
        runCatching {
            val trip = repository.loadTrip()
            AppState(false, email, trip, repository.isOwner(), mapboxToken = repository.mapboxToken())
        }
            .onSuccess { _state.value = it }
            .onFailure { _state.value = AppState(false, email, cached, error = "Не удалось загрузить свежий план. Показана локальная копия.") }
    }

    fun signIn(email: String, password: String, signUp: Boolean, remember: Boolean) = viewModelScope.launch {
        _state.value = AppState(loading = true)
        repository.setRememberLogin(remember)
        runCatching { if (signUp) repository.signUp(email, password) else repository.signIn(email, password) }
            .onSuccess { refresh() }
            .onFailure { _state.value = AppState(false, error = authMessage(it.message)) }
    }

    fun signOut() = viewModelScope.launch {
        repository.signOut()
        _state.value = AppState(loading = false, rememberLogin = repository.rememberLogin())
    }

    fun handleDeeplink(intent: Intent) {
        repository.handleDeeplink(intent)
        refresh()
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
private fun ItalyTripApp(deepLinkIntent: Intent?, viewModel: TripViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(deepLinkIntent) {
        deepLinkIntent?.takeIf { it.data != null }?.let(viewModel::handleDeeplink)
    }
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Accent,
            secondary = Gold,
            tertiary = Olive,
            background = Background,
            surface = CardWhite,
            onPrimary = Color.White,
            onBackground = Ink,
            onSurface = Ink,
        ),
        typography = MaterialTheme.typography.copy(
            headlineLarge = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.SemiBold, letterSpacing = (-0.7).sp),
            headlineMedium = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
            titleLarge = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            titleMedium = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            bodyMedium = MaterialTheme.typography.bodyMedium.copy(lineHeight = 20.sp),
        ),
    ) {
        Surface(Modifier.fillMaxSize(), color = Background) {
            when {
                state.loading -> LoadingScreen()
                state.email == null -> SignInScreen(state.error, state.rememberLogin) { email, password, signUp, remember -> viewModel.signIn(email, password, signUp, remember) }
                state.trip != null -> TripScreen(state, viewModel)
                else -> ErrorScreen(state.error ?: "Неизвестная ошибка", viewModel::refresh)
            }
        }
    }
}

@Composable
private fun LoadingScreen() = Column(
    Modifier.fillMaxSize(),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
) {
    CircularProgressIndicator(color = Accent, strokeWidth = 3.dp)
    Text("Загружаем поездку", Modifier.padding(top = 18.dp), color = Muted)
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
private fun SignInScreen(error: String?, initialRemember: Boolean, submit: (String, String, Boolean, Boolean) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var signUp by remember { mutableStateOf(false) }
    var rememberLogin by remember(initialRemember) { mutableStateOf(initialRemember) }
    fun submitIfValid() {
        if (email.isNotBlank() && password.length >= 6) submit(email.trim(), password, signUp, rememberLogin)
    }
    Column(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Background, Track, Color(0xFFF7F1E7))),
        ).imePadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Card(Modifier.fillMaxWidth(), shape = AppShape, colors = CardDefaults.cardColors(CardWhite), elevation = CardDefaults.cardElevation(2.dp)) {
            Column(Modifier.padding(24.dp)) {
                Text("ИТАЛИЯ · ОСЕНЬ 2026", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                Text("Отпуск с семьёй\nв Италии", Modifier.padding(top = 10.dp), style = MaterialTheme.typography.headlineLarge, lineHeight = 37.sp)
                Text(if (signUp) "Создайте аккаунт, чтобы открыть план" else "Войдите в семейный план поездки", Modifier.padding(top = 10.dp), color = Muted)
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(top = 24.dp))
                OutlinedTextField(
                    password, { password = it }, label = { Text("Пароль") }, singleLine = true,
                    shape = RoundedCornerShape(12.dp), visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { submitIfValid() }),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                )
                Row(Modifier.fillMaxWidth().clickable { rememberLogin = !rememberLogin }, verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = rememberLogin, onCheckedChange = { rememberLogin = it })
                    Text("Запомнить меня", color = Ink, fontSize = 14.sp)
                }
                if (error != null) Text(error, Modifier.padding(top = 10.dp), color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                Button(
                    onClick = { submitIfValid() },
                    enabled = email.isNotBlank() && password.length >= 6,
                    modifier = Modifier.fillMaxWidth().height(56.dp).padding(top = 6.dp),
                    shape = RoundedCornerShape(12.dp),
                ) { Text(if (signUp) "Зарегистрироваться" else "Войти", fontWeight = FontWeight.Bold) }
                TextButton(onClick = { signUp = !signUp }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text(if (signUp) "У меня уже есть аккаунт" else "Создать аккаунт")
                }
            }
        }
    }
}

private enum class Destination(val label: String) {
    OVERVIEW("Обзор"), ITINERARY("Маршрут"), LODGING("Жильё"), CANCELLATION("Отмена"),
    SIGHTS("Достопримечательности"), RESTAURANTS("Рестораны"), BUDGET("Бюджет"), PHOTOS("Фото")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TripScreen(state: AppState, viewModel: TripViewModel) {
    var destination by remember { mutableStateOf(Destination.OVERVIEW) }
    var focusedLodgingId by remember { mutableStateOf<String?>(null) }
    val data = state.trip?.get("data") as? JsonObject ?: return
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Column(Modifier.background(Background).padding(start = 18.dp, end = 12.dp, top = 14.dp, bottom = 12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text("ИТАЛИЯ · ОСЕНЬ 2026", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.8.sp)
                    Text("Отпуск с семьёй", style = MaterialTheme.typography.headlineMedium, color = Ink)
                    Text("25 сентября — 12 октября", color = Muted, fontSize = 13.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    TextButton(onClick = viewModel::signOut) { Text("Выйти", color = Muted, fontSize = 13.sp) }
                    SyncLabel(state.syncState)
                }
            }
        }
        ScrollableTabRow(
            selectedTabIndex = destination.ordinal,
            edgePadding = 12.dp,
            containerColor = Background,
            contentColor = Accent,
            divider = { Box(Modifier.fillMaxWidth().height(1.dp).background(Line)) },
        ) {
            Destination.entries.forEach { item ->
                Tab(
                    selected = destination == item,
                    onClick = { destination = item },
                    selectedContentColor = Accent,
                    unselectedContentColor = Muted,
                    text = { Text(item.label, fontWeight = if (destination == item) FontWeight.Bold else FontWeight.SemiBold) },
                )
            }
        }
        Box(Modifier.weight(1f)) {
            TripContent(destination, data, state.isOwner, viewModel, focusedLodgingId) { id ->
                focusedLodgingId = id
                destination = Destination.LODGING
            }
        }
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
private fun TripContent(destination: Destination, data: JsonObject, isOwner: Boolean, viewModel: TripViewModel, focusedLodgingId: String?, openLodging: (String) -> Unit) {
    val appState by viewModel.state.collectAsStateWithLifecycle()
    when (destination) {
        Destination.OVERVIEW -> OverviewScreen(data, isOwner, appState.mapboxToken)
        Destination.ITINERARY -> ItineraryScreen(data.array("days"), isOwner, viewModel::toggleItineraryItem, viewModel::saveItineraryItem, viewModel::deleteItineraryItem, viewModel::updateDayRoute)
        Destination.LODGING -> LodgingScreen(data.array("lodging"), isOwner, viewModel::updateLodgingStatus, { viewModel.saveRecord("lodging", it) }, { viewModel.deleteRecord("lodging", it) }, { id, uris -> viewModel.uploadEntityPhotos("lodging", id, uris) }, focusedLodgingId)
        Destination.CANCELLATION -> CancellationScreen(data.array("lodging"), openLodging)
        Destination.SIGHTS -> SightsScreen(data.array("sights"), isOwner, viewModel::toggleSight, viewModel::updateSightGroup, viewModel::reorderSights, { viewModel.saveRecord("sights", it) }, { viewModel.deleteRecord("sights", it) }, { id, uris -> viewModel.uploadEntityPhotos("sights", id, uris) }, appState.mapboxToken, data)
        Destination.RESTAURANTS -> RestaurantsScreen(data.array("restaurants"), isOwner, { viewModel.saveRecord("restaurants", it) }, { viewModel.deleteRecord("restaurants", it) }, { id, uris -> viewModel.uploadEntityPhotos("restaurants", id, uris) }, appState.mapboxToken, data)
        Destination.BUDGET -> BudgetScreen(data.array("expenses"), isOwner, viewModel::updateExpenseAmount, { viewModel.saveRecord("expenses", it) }, { viewModel.deleteRecord("expenses", it) })
        Destination.PHOTOS -> PhotosScreen(data, isOwner, appState.uploadingPhotos, viewModel::uploadTripPhotos, viewModel::deleteTripPhoto)
    }
}

@Composable
private fun OverviewScreen(data: JsonObject, isOwner: Boolean, mapboxToken: String?) {
    val heroes = remember { listOf(
        "salzburg" to "Зальцбург на рассвете", "verona" to "Верона — город Ромео и Джульетты", "rome" to "Рим — Вечный город",
        "pisa" to "Пиза — короткая остановка", "figline" to "Фильине-Вальдарно", "sanmarino" to "Сан-Марино",
        "chioggia" to "Кьоджа — маленькая Венеция", "milan" to "Милан — столица моды", "como" to "Озеро Комо",
        "valdidentro" to "Вальдидентро", "stelvio" to "Перевал Стельвио", "munich" to "Мюнхен — перед домом", "prague" to "Прага — домой",
    ) }
    var heroIndex by remember { mutableStateOf(0) }
    var heroFullscreen by remember { mutableStateOf(false) }
    var heroScale by remember(heroIndex, heroFullscreen) { mutableFloatStateOf(1f) }
    var heroOffset by remember(heroIndex, heroFullscreen) { mutableStateOf(Offset.Zero) }
    val heroTransform = rememberTransformableState { zoomChange, panChange, _ ->
        heroScale = (heroScale * zoomChange).coerceIn(1f, 4f)
        heroOffset = if (heroScale == 1f) Offset.Zero else heroOffset + panChange
    }
    val lodging = data.array("lodging")
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
    LazyColumn(contentPadding = PaddingValues(16.dp, 18.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Box(Modifier.fillMaxWidth().height(235.dp).clip(AppShape).clickable { heroFullscreen = true }) {
                AsyncImage(
                    model = "https://crazynata.github.io/italy-trip/images/hero-${heroes[heroIndex].first}.webp",
                    contentDescription = heroes[heroIndex].second,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xCC173A3D)))))
                Column(Modifier.align(Alignment.BottomStart).padding(22.dp)) {
                    Text("СЕМЕЙНОЕ ПУТЕШЕСТВИЕ", color = Color.White.copy(alpha = .72f), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.8.sp)
                    Text(heroes[heroIndex].second, Modifier.padding(top = 8.dp), color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.SemiBold)
                    Text("4 человека · 2 собаки · 17 ночей", Modifier.padding(top = 6.dp), color = Color.White.copy(alpha = .82f))
                    Surface(Modifier.padding(top = 18.dp), shape = RoundedCornerShape(9.dp), color = Color.White.copy(alpha = .15f)) {
                        Text(if (isOwner) "Режим владельца" else "Режим просмотра", Modifier.padding(horizontal = 11.dp, vertical = 6.dp), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Button(onClick = { heroIndex = (heroIndex - 1 + heroes.size) % heroes.size }, modifier = Modifier.align(Alignment.CenterStart).padding(8.dp).size(40.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .45f))) { Text("‹", fontSize = 27.sp) }
                Button(onClick = { heroIndex = (heroIndex + 1) % heroes.size }, modifier = Modifier.align(Alignment.CenterEnd).padding(8.dp).size(40.dp), contentPadding = PaddingValues(0.dp), shape = CircleShape, colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = .45f))) { Text("›", fontSize = 27.sp) }
                Text("${heroIndex + 1}/${heroes.size}", Modifier.align(Alignment.TopEnd).padding(12.dp).background(Color.Black.copy(alpha = .42f), RoundedCornerShape(8.dp)).padding(7.dp, 3.dp), color = Color.White, fontSize = 11.sp)
            }
        }
        item { WeatherSection(data) }
        item { SectionTitle("Карта маршрута", "Прага → остановки по маршруту → Прага") }
        items(lodging.chunked(2)) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { lodgeElement ->
                    val lodge = lodgeElement.obj()
                    RouteStopCard(lodge, routeMapUrl(data, lodge), Modifier.weight(1f))
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item { NativeMapPanel(mapboxToken, data, NativeMapLayer.ROUTE) }
    }
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
    Text(title, style = MaterialTheme.typography.titleLarge, color = Ink)
    if (subtitle != null) Text(subtitle, Modifier.padding(top = 2.dp), color = Muted, fontSize = 13.sp)
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
    routeEditor?.let { day -> AlertDialog(
        onDismissRequest = { routeEditor = null },
        title = { Text("Маршрут Google Maps") },
        text = { OutlinedTextField(routeText, { routeText = it }, label = { Text("Ссылка на маршрут") }, modifier = Modifier.fillMaxWidth(), singleLine = false, minLines = 2) },
        confirmButton = { TextButton(onClick = { updateDayRoute(day.str("id"), routeText); routeEditor = null }) { Text("Сохранить") } },
        dismissButton = { TextButton(onClick = { routeEditor = null }) { Text("Отмена") } },
    ) }
    LazyColumn(contentPadding = PaddingValues(14.dp, 16.dp, 14.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { SectionTitle("Маршрут", "${days.size} дней путешествия") }
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
    val shown = if (compact) entries.take(2) else entries
    val done = entries.count { it.obj().bool("done") }
    val context = LocalContext.current
    val dayMapUrl = day.strOrNull("dayMapUrl")
    var copiedRoute by remember(dayMapUrl) { mutableStateOf(false) }
    Card(shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(CardWhite), border = CardDefaults.outlinedCardBorder()) {
        Column {
            Row(Modifier.fillMaxWidth().background(Soft).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.width(48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(day.str("dayNum"), fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Ink)
                    Text(day.str("month").uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Muted)
                }
                Column(Modifier.weight(1f).padding(start = 8.dp)) {
                    Text("${flag(day.str("city"))}  ${day.str("city")}", fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(day.str("weekday"), color = Muted, fontSize = 12.sp)
                }
                if (entries.isNotEmpty()) Text("$done/${entries.size}", color = Olive, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 7.dp), horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) {
                if (dayMapUrl != null) {
                    Button(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(dayMapUrl))) } }, shape = RoundedCornerShape(9.dp), contentPadding = PaddingValues(horizontal = 11.dp, vertical = 7.dp)) { Text("Google Maps ↗", fontSize = 11.sp) }
                    TextButton(onClick = {
                        val clipboard = context.getSystemService(ClipboardManager::class.java)
                        clipboard.setPrimaryClip(ClipData.newPlainText("Маршрут ${day.str("city")}", dayMapUrl))
                        copiedRoute = true
                    }) { Text(if (copiedRoute) "Скопировано ✓" else "Копировать", fontSize = 11.sp) }
                } else Text("Маршрут Google Maps не добавлен", Modifier.weight(1f), color = Muted, fontSize = 11.sp)
                Spacer(Modifier.weight(1f))
                if (editDayRoute != null) TextButton(onClick = editDayRoute, contentPadding = PaddingValues(5.dp)) { Text(if (dayMapUrl == null) "+ Ссылка" else "Изменить", fontSize = 10.sp) }
            }
            shown.forEach { itemElement ->
                val item = itemElement.obj()
                Row(
                    Modifier.fillMaxWidth().clickable(enabled = editable) { toggleItem(day.str("id"), item.str("id")) }.padding(horizontal = 15.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier.size(21.dp).clip(RoundedCornerShape(7.dp)).background(if (item.bool("done")) Olive else Color.Transparent).border(1.dp, if (item.bool("done")) Olive else Line, RoundedCornerShape(7.dp)),
                        contentAlignment = Alignment.Center,
                    ) { if (item.bool("done")) Text("✓", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    Text(item.str("title"), Modifier.weight(1f).padding(horizontal = 11.dp), color = if (item.bool("done")) Muted else Ink, fontSize = 14.sp)
                    Column(horizontalAlignment = Alignment.End) {
                        item.strOrNull("time")?.let { Text(it, fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                        item.strOrNull("mapUrl")?.let { url -> TextButton(
                            onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } },
                            contentPadding = PaddingValues(2.dp),
                        ) { Text("карта ↗", color = Accent, fontSize = 10.sp) } }
                    }
                    if (editable) TextButton(onClick = { editItem(item) }, contentPadding = PaddingValues(5.dp)) { Text("Изм.", fontSize = 11.sp) }
                }
            }
            if (compact && entries.size > shown.size) Text("Ещё ${entries.size - shown.size} пунктов", Modifier.padding(start = 47.dp, bottom = 12.dp), color = Accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            if (addItem != null) TextButton(onClick = addItem, modifier = Modifier.padding(start = 10.dp, bottom = 6.dp)) { Text("+ Добавить пункт") }
        }
    }
}

@Composable
private fun LodgingScreen(lodging: JsonArray, editable: Boolean, updateStatus: (String, String) -> Unit, save: (JsonObject) -> Unit, delete: (String) -> Unit, uploadPhotos: (String, List<Uri>) -> Unit, focusedId: String?) {
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
    LazyColumn(state = listState, contentPadding = PaddingValues(14.dp, 16.dp, 14.dp, 110.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { SectionTitle("Жильё", "${lodging.size} остановок по маршруту") }
                if (editable) Button(onClick = { editor = JsonObject(mapOf(
                    "id" to JsonPrimitive("lodge_${UUID.randomUUID()}"), "slot" to JsonPrimitive(""), "city" to JsonPrimitive(""),
                    "name" to JsonPrimitive(""), "dates" to JsonPrimitive(""), "price" to JsonPrimitive("€"), "status" to JsonPrimitive("хочу"),
                    "link" to JsonPrimitive(""), "notes" to JsonPrimitive(""),
                )) }, shape = RoundedCornerShape(11.dp)) { Text("+ Добавить") }
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
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(if (highlighted) Color(0xFFF3FAFB) else CardWhite),
        border = BorderStroke(if (highlighted) 2.dp else 1.dp, if (highlighted) Accent else Line),
        elevation = CardDefaults.cardElevation(if (highlighted) 5.dp else 0.dp),
    ) {
        Column {
            if (photos.isNotEmpty()) PhotoCarousel(photos, lodge.str("name"), 210)
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(9.dp), color = Track) {
                        Text(flag(lodge.str("city")), Modifier.padding(horizontal = 9.dp, vertical = 6.dp), fontSize = 17.sp)
                    }
                    Text(lodge.str("city").uppercase(), Modifier.weight(1f).padding(horizontal = 10.dp), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = .7.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    LodgingStatusSelector(lodge.str("status"), editable) { status -> updateStatus(lodge.str("id"), status) }
                }

                Text(lodge.str("name").ifBlank { "Жильё не выбрано" }, fontSize = 20.sp, fontWeight = FontWeight.Bold, lineHeight = 24.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)

                Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = Soft) {
                    Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                        MetaBlock("ДАТЫ", lodge.str("dates").ifBlank { "—" }, Modifier.weight(1f))
                        Box(Modifier.width(1.dp).height(34.dp).background(Line))
                        MetaBlock("СТОИМОСТЬ", lodge.str("price").ifBlank { "—" }, Modifier.weight(1f).padding(start = 13.dp))
                    }
                }

                lodge.strOrNull("freeCancel")?.let {
                    Surface(shape = RoundedCornerShape(10.dp), color = Olive.copy(alpha = .11f)) {
                        Text("✓  Бесплатная отмена до $it", Modifier.padding(horizontal = 11.dp, vertical = 8.dp), color = Olive, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                lodge.strOrNull("notes")?.let { notes ->
                    Text(notes, color = Muted, fontSize = 12.sp, lineHeight = 18.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }

                if (bookingUrl != null || editable) {
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        if (bookingUrl != null) OutlinedButton(
                            onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(bookingUrl))) } },
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 7.dp),
                        ) { Text("Booking.com ↗", fontSize = 11.sp) }
                        Spacer(Modifier.weight(1f))
                        if (editable) {
                            TextButton(onClick = { addPhoto(lodge) }) { Text("+ Фото") }
                            TextButton(onClick = { edit(lodge) }) { Text("Изменить") }
                        }
                    }
                }
            }
        }
    }
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
private fun LodgingStatusSelector(status: String, editable: Boolean, onStatus: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val color = when (status.lowercase()) { "оплачено", "пожили" -> Olive; "бронь" -> Accent; else -> Gold }
    Box {
        Surface(
            modifier = Modifier.clickable(enabled = editable) { expanded = true },
            shape = RoundedCornerShape(12.dp),
            color = color.copy(alpha = .13f),
            border = BorderStroke(1.dp, color.copy(alpha = .35f)),
        ) {
            Text(
                "${status.ifBlank { "хочу" }.uppercase()}  ▾",
                Modifier.padding(horizontal = 13.dp, vertical = 9.dp),
                color = color,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = .4.sp,
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            listOf("хочу", "бронь", "оплачено", "пожили").forEach { option ->
                DropdownMenuItem(
                    text = { Text(if (option == status) "$option ✓" else option, fontWeight = if (option == status) FontWeight.Bold else FontWeight.Normal) },
                    onClick = { onStatus(option); expanded = false },
                )
            }
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
) {
    val records = sights.map { it.obj() }
    val cities = records.map { it.str("city") }.filter(String::isNotBlank).distinct().sorted()
    val defaultWalkCity = records.filter { it.number("walkDay") > 0 }.groupingBy { it.str("city") }.eachCount().maxByOrNull { it.value }?.key ?: cities.firstOrNull().orEmpty()
    var walkCity by remember(cities) { mutableStateOf(defaultWalkCity) }
    val activeCity = walkCity.takeIf(cities::contains) ?: defaultWalkCity
    val dayOptions = records.filter { it.str("city") == activeCity && it.number("walkDay") > 0 }.map { it.number("walkDay").toInt() }.distinct().sorted().ifEmpty { listOf(1) }
    var walkDay by remember(activeCity) { mutableStateOf(dayOptions.first()) }
    val activeDay = walkDay.takeIf(dayOptions::contains) ?: dayOptions.first()
    val routeSights = records.filter { it.str("city") == activeCity && (it.number("walkDay") == 0.0 || it.number("walkDay").toInt() == activeDay) }
        .sortedBy { it.number("walkOrder").takeIf { value -> value > 0 } ?: records.indexOf(it).toDouble() }
    val routeData = remember(data, routeSights) { data.withElement("sights", JsonArray(routeSights)) }
    var filterCity by remember { mutableStateOf("") }
    val filtered = records.filter { filterCity.isBlank() || it.str("city") == filterCity }
    var routeCollapsed by remember { mutableStateOf(false) }
    var mandatoryCollapsed by remember { mutableStateOf(false) }
    var optionalCollapsed by remember { mutableStateOf(false) }
    var editor by remember { mutableStateOf<JsonObject?>(null) }
    var details by remember { mutableStateOf<JsonObject?>(null) }
    var photoTarget by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
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
    details?.let { sight -> SightDetailsDialog(sight, { details = null }) {
        val url = "https://www.google.com/maps/search/?api=1&query=${Uri.encode("${sight.str("name")}, ${sight.str("city")}")}"
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    } }

    LazyColumn(contentPadding = PaddingValues(14.dp, 16.dp, 14.dp, 100.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Brush.linearGradient(listOf(Color(0xFFE3F0EF), Color(0xFFF7EFE2)))).border(1.dp, Line, RoundedCornerShape(18.dp))) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    Row(Modifier.fillMaxWidth().clickable { routeCollapsed = !routeCollapsed }, verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.width(4.dp).height(42.dp).clip(CircleShape).background(Accent))
                        Column(Modifier.weight(1f).padding(start = 11.dp)) {
                            Text("Пеший маршрут", fontSize = 21.sp, fontWeight = FontWeight.Bold)
                            if (!routeCollapsed) Text("Выберите город и день, меняйте порядок стрелками", color = Muted, fontSize = 11.sp)
                        }
                        Text(if (routeCollapsed) "›" else "⌄", color = Muted, fontSize = 21.sp)
                    }
                    if (!routeCollapsed) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SightsRouteSelector("ГОРОД", activeCity, cities, Modifier.weight(1.25f)) { walkCity = it }
                            SightsRouteSelector("ДЕНЬ", "День $activeDay", dayOptions.map { "День $it" }, Modifier.weight(.75f)) { walkDay = it.substringAfter(' ').toIntOrNull() ?: activeDay }
                        }
                        NativeMapPanel(mapboxToken, routeData, NativeMapLayer.SIGHTS, allowLocation = true, compactLocationButton = true)
                        routeSights.forEachIndexed { index, sight ->
                            WalkSightRow(sight, index, routeSights.size, editable, onOpen = {
                                val url = "https://www.google.com/maps/search/?api=1&query=${Uri.encode("${sight.str("name")}, ${sight.str("city")}")}"
                                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                            }, onMove = { direction ->
                                val ids = routeSights.map { it.str("id") }.toMutableList()
                                val target = index + direction
                                if (target in ids.indices) { val value = ids.removeAt(index); ids.add(target, value); reorder(ids) }
                            })
                        }
                        val routeUrl = walkingGoogleUrl(routeSights)
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("${routeSights.size} мест${if (routeSights.any { it.array("lnglat").size != 2 }) " · без точки: ${routeSights.count { it.array("lnglat").size != 2 }}" else ""}", Modifier.weight(1f), color = Muted, fontSize = 11.sp)
                            if (routeUrl != null) TextButton(onClick = {
                                context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Пеший маршрут", routeUrl))
                            }) { Text("Копировать маршрут", fontSize = 11.sp) }
                        }
                        if (routeSights.isNotEmpty()) {
                            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                                Text("День $activeDay · $activeCity", Modifier.weight(1f), fontSize = 19.sp, fontWeight = FontWeight.Bold)
                                Text("${routeSights.size} мест", color = Muted, fontSize = 11.sp)
                            }
                            routeSights.chunked(2).forEach { row ->
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                                    row.forEach { sight -> RouteSightTile(sight, routeSights.indexOf(sight) + 1, Modifier.weight(1f)) { details = sight } }
                                    if (row.size == 1) Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Фильтр", color = Muted, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                SelectionButton("Город", filterCity.ifBlank { "Все города" }, listOf("Все города") + cities, Modifier.weight(1f).padding(start = 8.dp)) { filterCity = if (it == "Все города") "" else it }
                if (editable) Button(onClick = { editor = JsonObject(mapOf(
                    "id" to JsonPrimitive("sight_${UUID.randomUUID()}"), "name" to JsonPrimitive(""), "city" to JsonPrimitive(filterCity),
                    "group" to JsonPrimitive("необязательные"), "subcategory" to JsonPrimitive("разное"), "done" to JsonPrimitive(false),
                )) }, shape = RoundedCornerShape(10.dp), contentPadding = PaddingValues(horizontal = 11.dp, vertical = 7.dp)) { Text("+ Место", fontSize = 11.sp) }
            }
        }

        listOf("обязательные" to "Обязательные", "необязательные" to "Необязательные").forEach { (group, title) ->
            val grouped = filtered.filter { (it.str("group").ifBlank { "необязательные" }) == group }
            val collapsed = if (group == "обязательные") mandatoryCollapsed else optionalCollapsed
            item {
                Row(Modifier.fillMaxWidth().clickable {
                    if (group == "обязательные") mandatoryCollapsed = !mandatoryCollapsed else optionalCollapsed = !optionalCollapsed
                }.padding(top = 12.dp, bottom = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (group == "обязательные") "★" else "☆", color = if (group == "обязательные") Accent else Muted, fontSize = 20.sp)
                    Text(title, Modifier.padding(start = 9.dp), fontSize = 23.sp, fontWeight = FontWeight.Bold)
                    Surface(Modifier.padding(start = 9.dp), shape = RoundedCornerShape(8.dp), color = Track) { Text("${grouped.size}", Modifier.padding(9.dp, 3.dp), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    Spacer(Modifier.weight(1f))
                    Text(if (collapsed) "›" else "⌄", color = Muted, fontSize = 20.sp)
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            }
            if (!collapsed) {
                grouped.groupBy { it.str("subcategory").ifBlank { "разное" } }.toSortedMap().forEach { (subcategory, subset) ->
                    item { SubcategoryHeader(subcategory, subset.size) }
                    items(subset, key = { it.str("id") }) { sight ->
                        SightCard(sight, editable, onDetails = { details = sight }, onToggle = { toggleSight(sight.str("id")) }, onGroup = {
                            updateGroup(sight.str("id"), if (group == "обязательные") "необязательные" else "обязательные")
                        }, onPhoto = {
                            photoTarget = sight.str("id")
                            photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        }, onEdit = { editor = sight })
                    }
                }
                if (grouped.isEmpty()) item { Text("Пока ничего не добавлено", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 10.dp)) }
            }
        }
    }
}

@Composable
private fun RouteSightTile(sight: JsonObject, number: Int, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(modifier.height(150.dp).clip(RoundedCornerShape(12.dp)).background(Track).border(1.dp, Line, RoundedCornerShape(12.dp)).clickable(onClick = onClick)) {
        sight.strOrNull("photo")?.let {
            AsyncImage(model = absoluteImageUrl(it), contentDescription = sight.str("name"), modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop, alpha = .9f)
        }
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
    Box(modifier) {
        Surface(
            modifier = Modifier.fillMaxWidth().clickable { expanded = true },
            shape = RoundedCornerShape(12.dp),
            color = CardWhite,
            border = BorderStroke(1.5.dp, Accent.copy(alpha = .65f)),
            shadowElevation = 1.dp,
        ) {
            Column(Modifier.padding(horizontal = 13.dp, vertical = 10.dp)) {
                Text(label, color = Accent, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(value, Modifier.weight(1f).padding(top = 3.dp), color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("▾", color = Accent, fontSize = 11.sp)
                }
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option -> DropdownMenuItem(text = { Text(option, fontSize = 13.sp) }, onClick = { onSelect(option); expanded = false }) }
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
    Card(Modifier.clickable(onClick = onDetails), shape = RoundedCornerShape(15.dp), colors = CardDefaults.cardColors(CardWhite), border = CardDefaults.outlinedCardBorder()) {
        Column {
            sight.strOrNull("photo")?.let { photo ->
                Box(Modifier.fillMaxWidth().height(145.dp)) {
                    AsyncImage(model = absoluteImageUrl(photo), contentDescription = sight.str("name"), modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Surface(Modifier.align(Alignment.BottomStart).padding(9.dp), shape = RoundedCornerShape(8.dp), color = Color.Black.copy(alpha = .55f)) {
                        Text(sight.str("subcategory").ifBlank { "разное" }.uppercase(), Modifier.padding(horizontal = 8.dp, vertical = 4.dp), color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = .8.sp)
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(24.dp).clip(RoundedCornerShape(7.dp)).background(if (sight.bool("done")) Olive else Color.Transparent).border(1.dp, if (sight.bool("done")) Olive else Line, RoundedCornerShape(7.dp)).clickable(onClick = onToggle), contentAlignment = Alignment.Center) { if (sight.bool("done")) Text("✓", color = Color.White, fontSize = 12.sp) }
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    Text(sight.str("name"), fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(sight.str("city"), color = Muted, fontSize = 11.sp, maxLines = 1)
                }
                if (editable) {
                    TextButton(onClick = onGroup, contentPadding = PaddingValues(5.dp)) { Text(if (sight.str("group") == "обязательные") "★" else "☆", color = Accent, fontSize = 17.sp) }
                    SightActionsMenu(onPhoto, onEdit)
                }
            }
        }
    }
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
private fun SightDetailsDialog(sight: JsonObject, dismiss: () -> Unit, openMap: () -> Unit) {
    Dialog(onDismissRequest = dismiss) {
        Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(CardWhite)) {
            Column {
                sight.strOrNull("photo")?.let { AsyncImage(model = absoluteImageUrl(it), contentDescription = sight.str("name"), modifier = Modifier.fillMaxWidth().height(220.dp), contentScale = ContentScale.Crop) }
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Text(sight.str("name"), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text("${sight.str("city")} · ${sight.str("subcategory")}", color = Accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(sight.strOrNull("description") ?: "Описание пока не добавлено.", color = Muted, fontSize = 13.sp, lineHeight = 19.sp)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = openMap) { Text("Google Maps ↗") }
                        TextButton(onClick = dismiss) { Text("Закрыть") }
                    }
                }
            }
        }
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

@Composable
private fun RestaurantsScreen(restaurants: JsonArray, editable: Boolean, save: (JsonObject) -> Unit, delete: (String) -> Unit, uploadPhotos: (String, List<Uri>) -> Unit, mapboxToken: String?, data: JsonObject) {
    var editor by remember { mutableStateOf<JsonObject?>(null) }
    var photoTarget by remember { mutableStateOf<String?>(null) }
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(20)) { uris -> photoTarget?.let { uploadPhotos(it, uris) }; photoTarget = null }
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
    LazyColumn(contentPadding = PaddingValues(14.dp, 16.dp, 14.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { SectionTitle("Рестораны", "${restaurants.size} мест сохранено") }
            if (editable) Button(onClick = { editor = JsonObject(mapOf(
                "id" to JsonPrimitive("restaurant_${UUID.randomUUID()}"), "name" to JsonPrimitive(""), "city" to JsonPrimitive(""),
                "status" to JsonPrimitive("хочу"), "note" to JsonPrimitive(""), "link" to JsonPrimitive(""), "placeType" to JsonPrimitive("ресторан"),
            )) }, shape = RoundedCornerShape(11.dp)) { Text("+ Добавить") }
        }
    }
    item { SectionTitle("Карта ресторанов", "Сохранённые точки и расстояние от вас") }
    item { NativeMapPanel(mapboxToken, data, NativeMapLayer.RESTAURANTS, allowLocation = true) }
    items(restaurants) { element ->
        val restaurant = element.obj()
        val restaurantPhotos = restaurant.array("photos").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
        Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(CardWhite), border = CardDefaults.outlinedCardBorder()) {
            Column {
                if (restaurantPhotos.isNotEmpty()) PhotoCarousel(restaurantPhotos, restaurant.str("name"), 220)
            Column(Modifier.padding(17.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        Text(restaurant.str("city").uppercase(), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        Text(restaurant.str("name"), Modifier.padding(top = 4.dp), fontWeight = FontWeight.Bold, fontSize = 19.sp)
                    }
                    restaurant.strOrNull("price")?.let { Surface(shape = RoundedCornerShape(8.dp), color = Soft) { Text(it, Modifier.padding(8.dp, 5.dp), fontWeight = FontWeight.Bold) } }
                }
                restaurant.strOrNull("note")?.let { Text(it, Modifier.padding(top = 9.dp), color = Muted, fontSize = 13.sp, maxLines = 3, overflow = TextOverflow.Ellipsis) }
                Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    restaurant.strOrNull("status")?.let { StatusPill(it) }
                    restaurant.strOrNull("googleRating")?.let { Surface(shape = RoundedCornerShape(9.dp), color = Color(0xFFFFF4DB)) { Text("★ $it", Modifier.padding(9.dp, 6.dp), color = Color(0xFF9A681A), fontSize = 11.sp, fontWeight = FontWeight.Bold) } }
                }
                if (editable) Row(Modifier.align(Alignment.End)) {
                    TextButton(onClick = { photoTarget = restaurant.str("id"); photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) { Text("+ Фото") }
                    TextButton(onClick = {
                        editor = restaurant.withValue("categories", restaurant.array("categories").mapNotNull { (it as? JsonPrimitive)?.contentOrNull }.joinToString(", "))
                    }) { Text("Редактировать") }
                }
            }
            }
        }
    }
    }
}

@Composable
private fun BudgetScreen(expenses: JsonArray, editable: Boolean, updateAmount: (String, Double) -> Unit, save: (JsonObject) -> Unit, delete: (String) -> Unit) {
    val total = expenses.sumOf { it.obj().number("amount") }
    var editing by remember { mutableStateOf<JsonObject?>(null) }
    var adding by remember { mutableStateOf<JsonObject?>(null) }
    var amountText by remember { mutableStateOf("") }
    editing?.let { expense ->
        AlertDialog(
            onDismissRequest = { editing = null },
            title = { Text(expense.str("label")) },
            text = {
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Сумма в евро") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    amountText.replace(',', '.').toDoubleOrNull()?.let { updateAmount(expense.str("id"), it) }
                    editing = null
                }) { Text("Сохранить") }
            },
            dismissButton = { TextButton(onClick = { editing = null }) { Text("Отмена") } },
        )
    }
    adding?.let { expense -> RecordEditorDialog(
        title = "Новый расход", initial = expense,
        fields = listOf(EditorField("label", "Название"), EditorField("category", "Категория"), EditorField("amount", "Сумма в евро", FieldType.NUMBER)),
        onDismiss = { adding = null }, onSave = save,
    ) }
    LazyColumn(contentPadding = PaddingValues(14.dp, 16.dp, 14.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Box(Modifier.fillMaxWidth().clip(AppShape).background(Brush.linearGradient(listOf(Accent, Color(0xFF195866)))).padding(22.dp)) {
                Column {
                    Text("БЮДЖЕТ ПОЕЗДКИ", color = Color.White.copy(alpha = .7f), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.7.sp)
                    Text(formatMoney(total), Modifier.padding(top = 7.dp), color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold)
                    Text("${expenses.size} статей расходов", color = Color.White.copy(alpha = .75f), fontSize = 13.sp)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { SectionTitle("Расходы") }
                if (editable) Button(onClick = { adding = JsonObject(mapOf("id" to JsonPrimitive("expense_${UUID.randomUUID()}"), "label" to JsonPrimitive(""), "category" to JsonPrimitive("разное"), "amount" to JsonPrimitive(0.0))) }, shape = RoundedCornerShape(11.dp)) { Text("+ Добавить") }
            }
        }
        items(expenses) { element ->
            val expense = element.obj()
            Card(
                Modifier.clickable(enabled = editable) {
                    editing = expense
                    amountText = expense.number("amount").toString().removeSuffix(".0")
                },
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(CardWhite),
                border = CardDefaults.outlinedCardBorder(),
            ) {
                Row(Modifier.fillMaxWidth().padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(categoryColor(expense.str("category"))))
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        Text(expense.str("label"), fontWeight = FontWeight.Bold)
                        Text(expense.str("category").uppercase(), color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = .8.sp)
                    }
                    Text(formatMoney(expense.number("amount")), fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    if (editable) TextButton(onClick = { delete(expense.str("id")) }, contentPadding = PaddingValues(4.dp)) { Text("×", color = MaterialTheme.colorScheme.error, fontSize = 20.sp) }
                }
            }
        }
    }
}

private data class AlbumPhoto(val key: String, val fullUrl: String, val previewUrl: String, val caption: String, val place: String, val photoId: String? = null)

@Composable
private fun PhotosScreen(data: JsonObject, editable: Boolean, uploading: Boolean, upload: (List<Uri>) -> Unit, delete: (String) -> Unit) {
    val photos = remember(data) { albumPhotos(data) }
    var opened by remember { mutableStateOf<AlbumPhoto?>(null) }
    var deleting by remember { mutableStateOf<AlbumPhoto?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(30)) { uris -> upload(uris) }
    opened?.let { photo ->
        Dialog(onDismissRequest = { opened = null }) {
            Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(Color(0xFF101A1B))) {
                Column {
                    AsyncImage(model = photo.fullUrl, contentDescription = photo.caption, modifier = Modifier.fillMaxWidth().aspectRatio(.8f), contentScale = ContentScale.Fit)
                    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(photo.caption, color = Color.White, fontWeight = FontWeight.Bold)
                            if (photo.place.isNotBlank()) Text(photo.place, color = Color.White.copy(alpha = .68f), fontSize = 12.sp)
                        }
                        if (editable && photo.photoId != null) TextButton(onClick = { deleting = photo; opened = null }) { Text("Удалить", color = Color(0xFFFF9D87)) }
                        TextButton(onClick = { opened = null }) { Text("Закрыть", color = Color.White) }
                    }
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
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(14.dp, 18.dp, 14.dp, 32.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { SectionTitle("Фото", "${photos.size} снимков из всех разделов") }
                if (editable) Button(
                    onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                    enabled = !uploading,
                    shape = RoundedCornerShape(11.dp),
                ) { Text(if (uploading) "Загрузка..." else "+ Добавить") }
            }
        }
        if (photos.isEmpty()) item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
            Column(Modifier.fillMaxWidth().padding(vertical = 70.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Альбом пока пуст", style = MaterialTheme.typography.titleLarge)
                Text("Выберите фотографии с телефона", Modifier.padding(top = 7.dp), color = Muted)
            }
        }
        items(photos, key = { it.key }) { photo ->
            Card(Modifier.clickable { opened = photo }, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(Track)) {
                Box {
                    AsyncImage(model = photo.previewUrl, contentDescription = photo.caption, modifier = Modifier.fillMaxWidth().aspectRatio(.9f), contentScale = ContentScale.Crop)
                    Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color.Black.copy(alpha = .52f)).padding(10.dp)) {
                        Text(photo.caption, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                        if (photo.place.isNotBlank()) Text(photo.place, color = Color.White.copy(alpha = .75f), fontSize = 10.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

private fun albumPhotos(data: JsonObject): List<AlbumPhoto> {
    val previews = data["photoPreviews"] as? JsonObject ?: JsonObject(emptyMap())
    val result = linkedMapOf<String, AlbumPhoto>()
    fun add(url: String, caption: String, place: String, id: String? = null) {
        if (url.isBlank() || result.containsKey(url)) return
        val preview = previews[url]?.obj()?.strOrNull("url") ?: url
        result[url] = AlbumPhoto(url, absoluteImageUrl(url), absoluteImageUrl(preview), caption, place, id)
    }
    data.array("lodging").forEach { element ->
        val lodge = element.obj()
        lodge.array("photos").forEach { add(it.jsonPrimitive.content, lodge.str("name"), lodge.str("city")) }
    }
    data.array("sights").forEach { element ->
        val sight = element.obj()
        sight.strOrNull("photo")?.let { add(it, sight.str("name"), sight.str("city")) }
    }
    data.array("restaurants").forEach { element ->
        val restaurant = element.obj()
        restaurant.array("photos").forEach { add(it.jsonPrimitive.content, restaurant.str("name"), restaurant.str("city")) }
    }
    data.array("photos").forEach { element ->
        val photo = element.obj()
        add(photo.str("url"), photo.strOrNull("iso") ?: "Моё фото", photo.strOrNull("place") ?: "", photo.str("id"))
    }
    return result.values.toList()
}

private fun absoluteImageUrl(url: String): String = when {
    url.startsWith("https://") || url.startsWith("http://") -> url
    url.startsWith("/italy-trip/") -> "https://crazynata.github.io$url"
    url.startsWith("/images/") -> "https://crazynata.github.io/italy-trip$url"
    url.startsWith("images/") -> "https://crazynata.github.io/italy-trip/$url"
    else -> url
}

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
