/*
 * Регистрация и авторизация через Supabase Auth (email + пароль).
 *
 * Модель доступа:
 *   - войти может любой зарегистрированный пользователь;
 *   - редактировать план может только владелец (email есть в таблице admins);
 *   - все остальные видят план в режиме «только просмотр».
 *
 * Пока пользователь не вошёл — над приложением показывается экран входа.
 * Клиент Supabase публикуется как window.sb, чтобы им пользовался sync.js.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://hxcavgtlucyoqudbrgse.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_IyGTMYZyxWXr0GoctL83YA_wSgoSj1-';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[auth] supabase-js не загрузился');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  window.sb = sb;

  // Значения по умолчанию: пока не вошли — режим «только просмотр» и не владелец.
  window.__isOwner = false;
  window.__tripReadOnly = true;
  window.__authed = false;

  const FONT = "'Mulish',system-ui,sans-serif";

  // ---- Всплывающее уведомление (используется и приложением при попытке правки) ----
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('auth-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auth-toast';
      el.style.cssText = 'position:fixed;bottom:74px;left:50%;transform:translateX(-50%);' +
        'background:#3b3228;color:#fff;padding:11px 17px;border-radius:10px;font:14px ' + FONT + ';' +
        'z-index:100000;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:90vw;text-align:center;opacity:0;transition:opacity .2s';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 3200);
  }
  window.__tripToast = toast;

  // ---- Экран входа/регистрации ----
  let gate, msgEl, emailEl, passEl, submitBtn, toggleBtn, titleEl, subEl;
  let mode = 'login'; // 'login' | 'register'
  let busy = false;

  function buildGate() {
    gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;place-items:center;' +
      'padding:20px;background:radial-gradient(120% 90% at 0% 0%, #2a708922, transparent 55%),' +
      'radial-gradient(120% 90% at 100% 100%, #d99a4e22, transparent 55%),#eaf1f1;overflow:auto';

    const card = document.createElement('div');
    card.style.cssText = 'width:100%;max-width:380px;background:#fff;border:1px solid #e7dcc7;' +
      'border-radius:18px;padding:26px 24px;box-shadow:0 12px 40px rgba(59,50,40,.16);font:15px ' + FONT + ';color:#3b3228';

    titleEl = document.createElement('h1');
    titleEl.style.cssText = "font-family:'Marcellus',serif;font-weight:600;font-size:24px;margin:0 0 4px";
    titleEl.textContent = 'Поездка по Италии';

    subEl = document.createElement('p');
    subEl.style.cssText = 'margin:0 0 20px;font-size:14px;color:#8a7d6b';
    subEl.textContent = 'Войдите, чтобы открыть план поездки';

    const form = document.createElement('form');
    form.style.cssText = 'display:flex;flex-direction:column;gap:12px';

    const inputCss = 'width:100%;padding:12px 13px;border:1px solid #e7dcc7;border-radius:11px;' +
      'font:15px ' + FONT + ';color:#3b3228;background:#fbf7ee;outline:none';
    emailEl = document.createElement('input');
    emailEl.type = 'email'; emailEl.placeholder = 'Email'; emailEl.autocomplete = 'email';
    emailEl.required = true; emailEl.style.cssText = inputCss;
    passEl = document.createElement('input');
    passEl.type = 'password'; passEl.placeholder = 'Пароль'; passEl.autocomplete = 'current-password';
    passEl.required = true; passEl.minLength = 6; passEl.style.cssText = inputCss;

    submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.style.cssText = 'margin-top:4px;padding:12px;border:none;border-radius:11px;background:#b95c3f;' +
      'color:#fff;font:600 15px ' + FONT + ';cursor:pointer';

    msgEl = document.createElement('div');
    msgEl.style.cssText = 'font-size:13px;min-height:18px;line-height:1.35';

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.style.cssText = 'background:none;border:none;color:#8a7d6b;font:14px ' + FONT + ';cursor:pointer;padding:6px;text-align:center';

    form.append(emailEl, passEl, submitBtn, msgEl);
    card.append(titleEl, subEl, form, toggleBtn);
    gate.appendChild(card);
    document.body.appendChild(gate);

    form.addEventListener('submit', onSubmit);
    toggleBtn.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
    setMode('login');
  }

  function setMode(m) {
    mode = m;
    setMsg('');
    passEl.autocomplete = m === 'login' ? 'current-password' : 'new-password';
    if (m === 'login') {
      subEl.textContent = 'Войдите, чтобы открыть план поездки';
      submitBtn.textContent = 'Войти';
      toggleBtn.textContent = 'Нет аккаунта? Зарегистрироваться';
    } else {
      subEl.textContent = 'Создайте аккаунт, чтобы смотреть план';
      submitBtn.textContent = 'Зарегистрироваться';
      toggleBtn.textContent = 'Уже есть аккаунт? Войти';
    }
  }

  function setMsg(text, kind) {
    msgEl.textContent = text || '';
    msgEl.style.color = kind === 'ok' ? '#2f7d4f' : '#b95c3f';
  }

  function setBusy(b) {
    busy = b;
    submitBtn.disabled = b;
    submitBtn.style.opacity = b ? '.6' : '1';
    submitBtn.style.cursor = b ? 'default' : 'pointer';
  }

  function humanError(err) {
    const m = (err && err.message || '').toLowerCase();
    if (m.includes('invalid login')) return 'Неверный email или пароль';
    if (m.includes('already registered') || m.includes('already exists')) return 'Этот email уже зарегистрирован — войдите';
    if (m.includes('password')) return 'Пароль слишком короткий (минимум 6 символов)';
    if (m.includes('email') && m.includes('valid')) return 'Некорректный email';
    if (m.includes('rate limit')) return 'Слишком много попыток, попробуйте позже';
    return (err && err.message) || 'Что-то пошло не так';
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const email = emailEl.value.trim();
    const password = passEl.value;
    if (!email || !password) return;
    setBusy(true); setMsg('');
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setMsg(humanError(error)); return; }
        // дальше сработает onAuthStateChange
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) { setMsg(humanError(error)); return; }
        if (data.session) {
          // подтверждение email выключено — вошли сразу
        } else {
          setMode('login');
          setMsg('Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.', 'ok');
        }
      }
    } catch (err) {
      setMsg(humanError(err));
    } finally {
      setBusy(false);
    }
  }

  function showGate() {
    if (gate) gate.style.display = 'grid';
    document.documentElement.style.overflow = 'hidden';
  }
  function hideGate() {
    if (gate) gate.style.display = 'none';
    document.documentElement.style.overflow = '';
    if (passEl) passEl.value = '';
  }

  // ---- Аккаунт: круглый аватар в правом верхнем углу + выпадающее меню ----
  let avatar, menu, menuOpen = false, currentUser = null, profile = null;

  function accent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ac');
    return (v && v.trim()) || '#b95c3f';
  }
  function openMenu() { if (menu) { menu.style.display = 'block'; menuOpen = true; } }
  function closeMenu() { if (menu) { menu.style.display = 'none'; menuOpen = false; } }

  function showAccountBar(email, isOwner, avatarUrl) {
    if (!avatar) {
      avatar = document.createElement('button');
      avatar.id = 'auth-bar';
      avatar.setAttribute('aria-label', 'Аккаунт');
      avatar.style.cssText = 'position:fixed;top:14px;right:16px;z-index:9998;width:38px;height:38px;' +
        'border-radius:50%;border:2px solid #fff;cursor:pointer;padding:0;display:grid;place-items:center;' +
        'font:700 15px ' + FONT + ';color:#fff;box-shadow:0 3px 12px rgba(59,50,40,.28)';
      document.body.appendChild(avatar);

      menu = document.createElement('div');
      menu.id = 'auth-menu';
      menu.style.cssText = 'position:fixed;top:60px;right:16px;z-index:9998;display:none;min-width:212px;max-width:82vw;' +
        'background:#fff;border:1px solid #e7dcc7;border-radius:14px;padding:13px 15px;' +
        'box-shadow:0 14px 38px rgba(59,50,40,.22);font:14px ' + FONT + ';color:#3b3228';
      document.body.appendChild(menu);

      avatar.addEventListener('click', (e) => { e.stopPropagation(); menuOpen ? closeMenu() : openMenu(); });
      document.addEventListener('click', (e) => {
        if (menuOpen && e.target !== avatar && !menu.contains(e.target)) closeMenu();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }

    const ac = accent();
    avatar.style.background = ac;
    avatar.textContent = '';
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl; img.alt = ''; img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block';
      avatar.appendChild(img);
    } else {
      avatar.textContent = (email && email[0] ? email[0] : '?').toUpperCase();
    }
    avatar.title = email;

    const roleTxt = isOwner ? 'редактор' : 'только просмотр';
    menu.innerHTML = '';
    const label = document.createElement('div');
    label.textContent = 'Вы вошли как';
    label.style.cssText = 'font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#a2937c;margin-bottom:3px';
    const em = document.createElement('div');
    em.textContent = email;
    em.style.cssText = 'font-weight:600;font-size:13px;word-break:break-all;line-height:1.3';
    const role = document.createElement('div');
    role.innerHTML = '<i class="fa-solid ' + (isOwner ? 'fa-pen' : 'fa-eye') + '" style="font-size:11px;margin-right:6px"></i>' + roleTxt;
    role.style.cssText = 'margin-top:5px;font-size:12.5px;font-weight:600;color:' + (isOwner ? '#2f7d4f' : '#8a7d6b');
    const hr = document.createElement('div');
    hr.style.cssText = 'height:1px;background:#efe4cf;margin:12px -15px';
    const profileBtn = document.createElement('button');
    profileBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i>Профиль и настройки';
    profileBtn.style.cssText = 'display:flex;align-items:center;gap:9px;width:100%;border:none;background:none;color:#3b3228;font:600 14px ' + FONT + ';cursor:pointer;padding:3px 0;text-align:left';
    profileBtn.addEventListener('click', () => { closeMenu(); openProfile(); });
    const out = document.createElement('button');
    out.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>Выйти';
    out.style.cssText = 'display:flex;align-items:center;gap:9px;width:100%;border:none;background:none;' +
      'color:#b95c3f;font:600 14px ' + FONT + ';cursor:pointer;padding:3px 0;text-align:left';
    out.addEventListener('click', async () => { out.disabled = true; closeMenu(); await sb.auth.signOut(); });
    menu.append(label, em, role, hr, profileBtn, out);

    avatar.style.display = 'grid';
  }
  function hideAccountBar() { closeMenu(); if (avatar) avatar.style.display = 'none'; }

  async function avatarDataUrl(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('Выберите PNG, JPEG или WebP');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url; });
      const size = Math.min(320, Math.max(img.naturalWidth, img.naturalHeight));
      const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas'); canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', .82);
    } finally { URL.revokeObjectURL(url); }
  }

  function closeProfile() { if (profile) { profile.remove(); profile = null; } }
  function openProfile() {
    if (!currentUser) return;
    closeProfile();
    profile = document.createElement('div');
    profile.style.cssText = 'position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:20px;background:rgba(25,31,31,.45);font:14px ' + FONT + ';color:#3b3228';
    const card = document.createElement('div');
    card.style.cssText = 'width:min(100%,390px);background:#fff;border:1px solid #e7dcc7;border-radius:18px;padding:22px;box-shadow:0 18px 55px rgba(0,0,0,.25)';
    const head = document.createElement('div'); head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px';
    const title = document.createElement('h2'); title.textContent = 'Профиль и настройки'; title.style.cssText = "font-family:'Playfair Display',serif;font-size:25px;font-weight:600;margin:0";
    const close = document.createElement('button'); close.innerHTML = '<i class="fa-solid fa-xmark"></i>'; close.title = 'Закрыть'; close.style.cssText = 'width:32px;height:32px;border:none;border-radius:50%;background:#f5f0e6;color:#6f6252;cursor:pointer;font-size:16px'; close.addEventListener('click', closeProfile);
    head.append(title, close);
    const photoRow = document.createElement('div'); photoRow.style.cssText = 'display:flex;align-items:center;gap:14px;margin-top:20px;padding:14px;background:#fbf7ee;border-radius:13px';
    const picture = document.createElement('img'); picture.alt = ''; picture.style.cssText = 'width:60px;height:60px;object-fit:cover;border-radius:50%;background:#dbeae8';
    picture.src = (currentUser.user_metadata && currentUser.user_metadata.avatar_url) || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect width="100%25" height="100%25" fill="%23dbeae8"/%3E%3C/svg%3E';
    const photoText = document.createElement('div'); photoText.style.cssText = 'flex:1;min-width:0'; photoText.innerHTML = '<div style="font-weight:700">Фото профиля</div><div style="font-size:12px;color:#8a7d6b;margin-top:3px">PNG, JPEG или WebP</div>';
    const upload = document.createElement('label'); upload.textContent = 'Изменить'; upload.style.cssText = 'border:1px solid #d8c9ac;border-radius:8px;padding:7px 9px;font-size:12px;font-weight:700;cursor:pointer;color:#3b3228;background:#fff';
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.hidden = true; upload.appendChild(input);
    const status = document.createElement('div'); status.style.cssText = 'font-size:12px;min-height:17px;color:#8a7d6b;margin:8px 0 0 74px';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; input.value = ''; if (!file) return;
      try {
        status.textContent = 'Сохраняю фото…'; const dataUrl = await avatarDataUrl(file); picture.src = dataUrl;
        const { data, error } = await sb.auth.updateUser({ data: { avatar_url: dataUrl } });
        if (error) throw error;
        currentUser = data.user || { ...currentUser, user_metadata: { ...currentUser.user_metadata, avatar_url: dataUrl } };
        showAccountBar(currentUser.email, window.__isOwner, dataUrl); status.textContent = 'Фото сохранено';
      } catch (err) { status.textContent = (err && err.message) || 'Не удалось сохранить фото'; }
    });
    photoRow.append(picture, photoText, upload);
    const appearance = document.createElement('div'); appearance.style.cssText = 'margin-top:18px;padding-top:17px;border-top:1px solid #efe4cf';
    appearance.innerHTML = '<div style="font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#a2937c;margin-bottom:10px">Оформление</div>';
    const controls = document.createElement('div'); controls.style.cssText = 'display:flex;align-items:center;gap:10px';
    [ ['Терракота', '#2a7089'], ['Охра', '#d99a4e'], ['Олива', '#5f8a6a'] ].forEach(([theme, color]) => {
      const swatch = document.createElement('button'); swatch.type = 'button'; swatch.title = theme; swatch.style.cssText = 'width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #d5c9b6;background:' + color + ';cursor:pointer;padding:0';
      swatch.addEventListener('click', () => window.dispatchEvent(new CustomEvent('trip:set-theme', { detail: theme }))); controls.appendChild(swatch);
    });
    const dark = document.createElement('button'); dark.type = 'button'; dark.style.cssText = 'margin-left:5px;border:1px solid #d8c9ac;border-radius:9px;padding:7px 10px;background:#fff;color:#3b3228;font:600 12px ' + FONT + ';cursor:pointer';
    const setDarkLabel = () => { dark.innerHTML = '<i class="fa-solid ' + (localStorage.getItem('italy_dark') === '1' ? 'fa-sun' : 'fa-moon') + '" style="margin-right:6px"></i>' + (localStorage.getItem('italy_dark') === '1' ? 'Светлая' : 'Тёмная'); };
    setDarkLabel(); dark.addEventListener('click', () => { window.dispatchEvent(new CustomEvent('trip:toggle-dark')); setDarkLabel(); }); controls.appendChild(dark);
    appearance.appendChild(controls);
    card.append(head, photoRow, status, appearance); profile.appendChild(card);
    profile.addEventListener('click', (e) => { if (e.target === profile) closeProfile(); }); document.body.appendChild(profile);
  }

  async function computeOwner() {
    // RLS отдаёт строку из admins только если это email текущего пользователя
    try {
      const { data, error } = await sb.from('admins').select('email').limit(1);
      if (error) return false;
      return !!(data && data.length);
    } catch (e) { return false; }
  }

  // Токен Mapbox хранится в Supabase (не в git); доступен только вошедшим
  async function loadMapboxToken() {
    if (window.__MAPBOX_TOKEN) return;
    try {
      const { data, error } = await sb.from('app_config').select('value').eq('key', 'mapbox_token').maybeSingle();
      if (!error && data && data.value) window.__MAPBOX_TOKEN = data.value;
    } catch (e) {}
  }

  async function applySession(session) {
    if (session && session.user) {
      currentUser = session.user;
      const isOwner = await computeOwner();
      window.__isOwner = isOwner;
      window.__tripReadOnly = !isOwner;
      window.__authed = true;
      await loadMapboxToken();
      hideGate();
      showAccountBar(session.user.email, isOwner, session.user.user_metadata && session.user.user_metadata.avatar_url);
      if (window.__onAuthed) { try { window.__onAuthed(); } catch (e) {} }
    } else {
      currentUser = null;
      window.__isOwner = false;
      window.__tripReadOnly = true;
      window.__authed = false;
      hideAccountBar();
      closeProfile();
      showGate();
    }
  }

  function init() {
    buildGate();
    // сразу показываем экран входа, чтобы план не мелькал до проверки сессии
    showGate();
    sb.auth.getSession().then(({ data }) => applySession(data && data.session));
    sb.auth.onAuthStateChange((_event, session) => { applySession(session); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
