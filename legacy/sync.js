/*
 * Синхронизация плана поездки через Supabase.
 *
 * Работает поверх авторизации (см. auth.js): читать план может любой вошедший
 * пользователь, писать — только владелец (RLS на trip_state это гарантирует, а
 * здесь мы дополнительно не пушим у не-владельца, чтобы не плодить ошибок).
 *
 * Модель простая: весь план хранится одной jsonb-строкой (id='main')
 * в таблице trip_state, побеждает последняя запись.
 */
(() => {
  'use strict';

  const LS_KEY = 'italy_trip';
  const ROW_ID = 'main';
  const PUSH_DEBOUNCE_MS = 1500;
  const POLL_MS = 15000;

  let sb = null;
  let lastSynced = null; // сериализованный payload, совпадающий с сервером
  let pushTimer = null;
  let suppress = false;  // не пушить то, что сами только что применили
  let canPush = false;   // владелец ли текущий пользователь
  let polling = false;
  let sessionActive = false;

  const nativeSet = Storage.prototype.setItem;
  const origSet = (key, value) => nativeSet.call(localStorage, key, value);

  async function pullRemote() {
    const { data, error } = await sb.from('trip_state').select('payload').eq('id', ROW_ID).maybeSingle();
    if (error) throw error;
    return data ? JSON.stringify(data.payload) : null;
  }

  async function pushLocal(str) {
    if (!canPush) return;
    const { error } = await sb.from('trip_state').upsert({
      id: ROW_ID, payload: JSON.parse(str), updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    lastSynced = str;
  }

  function schedulePush() {
    if (!canPush || !sessionActive) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const cur = localStorage.getItem(LS_KEY);
      if (!cur || cur === lastSynced) return;
      try { await pushLocal(cur); } catch (e) { console.warn('[sync] push failed', e); }
    }, PUSH_DEBOUNCE_MS);
  }

  // Патчим прототип, чтобы ловить локальные правки (присваивание setItem не сработает).
  Storage.prototype.setItem = function (key, value) {
    nativeSet.call(this, key, value);
    if (this === window.localStorage && key === LS_KEY && !suppress) schedulePush();
  };

  // Приложение читает localStorage только на старте, поэтому чужие правки
  // показываем перезагрузкой. Защита от цикла: не чаще раза в 5 секунд.
  function reloadSafely() {
    const now = Date.now();
    const last = +sessionStorage.getItem('sync_reload') || 0;
    if (now - last > 5000) {
      sessionStorage.setItem('sync_reload', String(now));
      location.reload();
    }
  }

  let toastEl;
  function showToast() {
    if (toastEl || !document.body) return;
    toastEl = document.createElement('div');
    toastEl.textContent = 'План обновлён на другом устройстве — нажми, чтобы увидеть';
    toastEl.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);' +
      'background:#3b3228;color:#fff;padding:12px 18px;border-radius:10px;' +
      'font:14px Mulish,system-ui,sans-serif;cursor:pointer;z-index:9999;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.25)';
    toastEl.onclick = () => location.reload();
    document.body.appendChild(toastEl);
  }

  function applyRemote(str) {
    suppress = true;
    origSet(LS_KEY, str);
    suppress = false;
    lastSynced = str;
    if (document.hidden || !document.hasFocus()) reloadSafely();
    else showToast();
  }

  async function poll() {
    if (!sessionActive) return;
    try {
      const remote = await pullRemote();
      const local = localStorage.getItem(LS_KEY);
      if (remote === null) { if (local && canPush) await pushLocal(local); return; }
      if (remote === local) { lastSynced = remote; return; }
      if (remote !== lastSynced) applyRemote(remote);
    } catch (e) { console.warn('[sync] poll failed', e); }
  }

  async function isOwner() {
    // RLS вернёт строку из admins только для email текущего пользователя
    try {
      const { data, error } = await sb.from('admins').select('email').limit(1);
      if (error) return false;
      return !!(data && data.length);
    } catch (e) { return false; }
  }

  async function onSignedIn() {
    sessionActive = true;
    canPush = await isOwner();
    try {
      const remote = await pullRemote();
      const local = localStorage.getItem(LS_KEY);
      if (remote === null) {
        if (local && canPush) await pushLocal(local);
      } else if (remote !== local) {
        suppress = true; origSet(LS_KEY, remote); suppress = false;
        lastSynced = remote;
        if (document.readyState === 'complete') reloadSafely();
      } else {
        lastSynced = remote;
      }
    } catch (e) { console.warn('[sync] initial pull failed', e); }
    // Догоняем правки, сделанные до того, как выяснилась роль владельца
    if (canPush) {
      const cur = localStorage.getItem(LS_KEY);
      if (cur && cur !== lastSynced) schedulePush();
    }
    if (!polling) { polling = true; setInterval(poll, POLL_MS); }
  }

  function onSignedOut() {
    sessionActive = false;
    canPush = false;
    lastSynced = null;
    clearTimeout(pushTimer);
  }

  function waitForSb() {
    if (window.sb) { boot(); return; }
    const t = setInterval(() => { if (window.sb) { clearInterval(t); boot(); } }, 60);
  }

  async function boot() {
    sb = window.sb;
    const { data } = await sb.auth.getSession();
    if (data && data.session) onSignedIn();
    sb.auth.onAuthStateChange((event, session) => {
      if (session) onSignedIn();
      else onSignedOut();
    });
  }

  waitForSb();
})();
