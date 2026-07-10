/*
 * Синхронизация плана поездки через Supabase.
 * Пока SUPABASE_URL / SUPABASE_ANON_KEY не заполнены — молча выключена,
 * приложение работает как раньше на localStorage.
 *
 * Модель простая: весь план хранится одной jsonb-строкой (id='main')
 * в таблице trip_state, побеждает последняя запись.
 */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://hxcavgtlucyoqudbrgse.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_IyGTMYZyxWXr0GoctL83YA_wSgoSj1-';

  const LS_KEY = 'italy_trip';
  const ROW_ID = 'main';
  const PUSH_DEBOUNCE_MS = 1500;
  const POLL_MS = 15000;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const ENDPOINT = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/trip_state';
  const HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };

  let lastSynced = null; // сериализованный payload, совпадающий с сервером
  let pushTimer = null;
  let suppress = false;  // не пушить то, что сами только что применили

  async function pullRemote() {
    const r = await fetch(ENDPOINT + '?id=eq.' + ROW_ID + '&select=payload', { headers: HEADERS });
    if (!r.ok) throw new Error('pull HTTP ' + r.status);
    const rows = await r.json();
    return rows.length ? JSON.stringify(rows[0].payload) : null;
  }

  async function pushLocal(str) {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: ROW_ID, payload: JSON.parse(str), updated_at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error('push HTTP ' + r.status);
    lastSynced = str;
  }

  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const cur = localStorage.getItem(LS_KEY);
      if (!cur || cur === lastSynced) return;
      try { await pushLocal(cur); } catch (e) { console.warn('[sync] push failed', e); }
    }, PUSH_DEBOUNCE_MS);
  }

  // Важно: присваивание localStorage.setItem = ... не работает — Storage
  // сохранит функцию как данные. Патчим прототип.
  const nativeSet = Storage.prototype.setItem;
  const origSet = (key, value) => nativeSet.call(localStorage, key, value);
  Storage.prototype.setItem = function (key, value) {
    nativeSet.call(this, key, value);
    if (this === window.localStorage && key === LS_KEY && !suppress) schedulePush();
  };

  // Приложение читает localStorage только на старте, поэтому чтобы показать
  // чужие изменения, страницу нужно перезагрузить. Защита от цикла перезагрузок:
  // не чаще раза в 5 секунд.
  function reloadSafely() {
    const now = Date.now();
    const last = +sessionStorage.getItem('sync_reload') || 0;
    if (now - last > 5000) {
      sessionStorage.setItem('sync_reload', String(now));
      location.reload();
    }
  }

  let toast;
  function showToast() {
    if (toast || !document.body) return;
    toast = document.createElement('div');
    toast.textContent = 'План обновлён на другом устройстве — нажми, чтобы увидеть';
    toast.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);' +
      'background:#3b3228;color:#fff;padding:12px 18px;border-radius:10px;' +
      'font:14px Mulish,system-ui,sans-serif;cursor:pointer;z-index:9999;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.25)';
    toast.onclick = () => location.reload();
    document.body.appendChild(toast);
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
    try {
      const remote = await pullRemote();
      const local = localStorage.getItem(LS_KEY);
      if (remote === null) { if (local) await pushLocal(local); return; }
      if (remote === local) { lastSynced = remote; return; }
      if (remote !== lastSynced) applyRemote(remote);
    } catch (e) { console.warn('[sync] poll failed', e); }
  }

  (async () => {
    try {
      const remote = await pullRemote();
      const local = localStorage.getItem(LS_KEY);
      if (remote === null) {
        if (local) await pushLocal(local);
      } else if (remote !== local) {
        suppress = true; origSet(LS_KEY, remote); suppress = false;
        lastSynced = remote;
        // если приложение уже успело отрендериться со старыми данными
        if (document.readyState === 'complete') reloadSafely();
      } else {
        lastSynced = remote;
      }
    } catch (e) { console.warn('[sync] initial pull failed', e); }
    setInterval(poll, POLL_MS);
  })();
})();
