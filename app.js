import {escapeHTML as e, mapURL, roleFor, validateItem, datesBetween, demoTrip, demoItems, initialTripDay} from './core.js?v=6';
import {storageKey,encrypt,decrypt} from './offline.js?v=8';
const $ = selector => document.querySelector(selector);
let client, user = null, role = null, trip = null, items = [], tab = 'days', day;
let demo = false, stops = [], generation = 0, editingId = null, accountBusy = false;
let wantsPrivateAfterLogin = false, reconnectPrivate = false;
let offlineView=false, mode=null, attempt=0, initializing=null;
const rememberLoginKey = "taipei-remember-login";
let rememberLogin = false;
try { rememberLogin = localStorage.getItem(rememberLoginKey) === "1"; } catch {}

function status(message) { $('#status').textContent = message; }
function updateAccount() {
  $('#account').textContent = user ? '登出' : 'Google 登入';
  $('#account').disabled = !client || accountBusy;
  $('#rememberLogin').disabled = !client || accountBusy;
  $('#rememberLogin').checked = rememberLogin;
  $('#sessionBadge').hidden = !user;
  $('#sessionBadge').textContent = user ? `已登入：${user.displayName || user.email || 'Google 帳戶'}` : '';
  updateOffline();
  $('#exitPreview').textContent = user ? '返回私人旅程' : '返回登入';
}
function closeEditor() {
  $('#editor').close(); $('#editForm').reset();
  $('#editForm').elements.date.removeAttribute('min');
  $('#editForm').elements.date.removeAttribute('max');
  $('#editorStatus').textContent = ''; editingId = null;
}
// Authorization failures must not erase a valid Google authentication session.
function clearTrip() {
  closeOffline(); offlineView=false;
  generation++; stops.forEach(stop => stop()); stops = [];
  role = null; trip = null; items = []; day = undefined; demo = false; closeEditor();
  $('#workspace').hidden = true; $('#gate').hidden = false; $('#add').hidden = true;
  $('#content').replaceChildren(); $('#tripTitle').textContent = ''; $('#tripDates').textContent = '';
  $('#role').textContent = '';
  $('#daysPicker').replaceChildren();
}
function gate(title, message, retry = false) {
  $('#cover').hidden = Boolean(user);
  $('#gateTitle').textContent = title; $('#gateMessage').textContent = message;
  $('#retryAccess').hidden = !retry || !user; $('#retryAccess').disabled = !navigator.onLine;
  updateAccount();
}
function signedOut() {
  clearTrip(); user = null; reconnectPrivate = false;
  gate('我哋嘅私人旅程', '以獲授權的 Google 帳戶登入，查看行程及預訂。');
  status('請登入以查看私人旅程。');
}
function accessFailure(error) {
  clearTrip();
  if (!user) return signedOut();
  if (!navigator.onLine || ['unavailable', 'auth/network-request-failed'].includes(error?.code)) {
    gate('暫時未能連線', '登入狀態仍然保留；私人資料已清除。連線恢復後可以重新檢查。', true);
    status('未能連接私人旅程。');
  } else if (error?.code === 'trip-not-ready') {
    gate('私人旅程尚未準備好', 'Google 已登入，請稍後重新檢查旅程資料。', true);
    status('旅程資料待準備');
  } else {
    if (['permission-denied','not-a-member'].includes(error?.code)) eraseCopy();
    gate('台北權限尚未設定', 'Google 已登入，但未取得這個旅程的存取權。請管理員完成帳戶授權後按「重新檢查權限」。', true);
    status('台北權限待設定');
  }
}
function render() {
  if (!trip) return;
  $('#cover').hidden = !demo;
  $('#gate').hidden = true; $('#workspace').hidden = false;
  $('#tripTitle').textContent = trip.title;
  $('#tripDates').textContent = demo ? '五日路線靈感 · 全部可選 · 未預訂' : `${trip.start} — ${trip.end}`;
  $('#role').textContent = demo ? '行程靈感' : offlineView ? '離線 · 只讀' : role === 'admin' ? '管理員' : '只讀';
  $('#exitPreview').hidden = !demo; $('#add').hidden = role !== 'admin' || demo;
  $('#add').textContent = tab === 'days' ? '＋ 加入行程' : tab === 'bookings' ? '＋ 加入預訂' : '＋ 加入清單';
  $('#daysPicker').hidden = tab !== 'days';
  $('#daysPicker').innerHTML = datesBetween(trip.start, trip.end).map((date, i) => `<button data-day="${e(date)}" class="${date === day ? 'active' : ''}" aria-pressed="${date === day}">DAY ${i + 1}${demo ? '' : `<br>${e(date.slice(5).replace('-', ' / '))}`}</button>`).join('');
  const kind = tab === 'days' ? 'event' : tab === 'bookings' ? 'booking' : 'check';
  const list = items.filter(item => item.kind === kind && (tab !== 'days' || item.date === day)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  $('#content').innerHTML = list.length ? list.map(item => `<article class="event"><time>${e(tab === 'days' ? item.time : demo ? '' : item.date.slice(5))}</time><div><h3>${item.done ? '✓ ' : ''}${e(item.title)}</h3><p>${e(item.note)}</p>${item.place ? offlineView ? `<span class="fine">${e(item.place)}</span>` : `<a href="${e(mapURL(item.place))}" target="_blank" rel="noopener noreferrer">↗ ${e(item.place)}</a>` : ''}${role === 'admin' && !demo ? `<div class="actions">${item.kind === 'check' ? `<button data-toggle="${e(item.id)}">${item.done ? '標為未完成' : '完成'}</button>` : ''}<button data-edit="${e(item.id)}">編輯</button><button data-delete="${e(item.id)}">刪除</button></div>` : ''}</div></article>`).join('') : `<div class="empty">${demo && tab === 'bookings' ? '行程靈感唔代表已預訂。<br><small>私人預訂只會於授權登入後顯示。</small>' : '呢一頁仲有空間。<br><small>等下一個好點子。</small>'}</div>`;
  document.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-selected', button.dataset.tab === tab));
  updateAccount();
}
async function openPrivate(next) {
  clearTrip(); user = next; reconnectPrivate = false; tab = 'days';
  const run = generation;
  gate('正在檢查台北權限', 'Google 已登入，正在載入旅程授權。'); status('正在檢查權限…');
  if (!navigator.onLine) return accessFailure({code: 'unavailable'});
  const active = () => run === generation && user?.uid === next.uid;
  const fail = error => { if (active()) accessFailure(error); };
  const keep = stop => { if (active()) stops.push(stop); else stop(); };
  try {
    const membership = await client.membership(next.uid);
    if (!active()) return;
    role = roleFor(next, membership);
    if (!role) return fail({code: 'not-a-member'});
    keep(client.watchMembership(next.uid, member => {
      if (!active()) return;
      role = roleFor(next, member);
      if (!role) return fail({code: 'not-a-member'});
      if (role !== 'admin') closeEditor();
      render();
    }, fail));
    if (!active()) return;
    keep(client.watchTrip(data => {
      if (!active()) return;
      if (!data) return fail({code: 'trip-not-ready'});
      const firstView = !trip;
      trip = data;
      if (!day || day < data.start || day > data.end) day = initialTripDay(data.start, data.end);
      status('已連接 · 離線版須在本機另行儲存'); render();
      if (firstView) window.scrollTo(0, 0);
    }, fail));
    if (!active()) return;
    keep(client.watchItems(data => { if (active()) { items = data; render(); } }, fail));
  } catch (error) { fail(error); }
}
$('#preview').onclick = () => {
  clearTrip(); demo = true; tab = 'days'; trip = demoTrip; items = structuredClone(demoItems); day = trip.start;
  status('行程靈感 · 建議路線，全部可選及未預訂'); render();
};
$('#exitPreview').onclick = () => user ? openPrivate(user) : signedOut();
$('#retryAccess').onclick = () => { if (user && client) openPrivate(user); };
$('#rememberLogin').onchange = async event => {
  if (!client || accountBusy) return updateAccount();
  const keep = event.target.checked;
  accountBusy = true; updateAccount();
  try {
    await client.setRememberLogin(keep);
    rememberLogin = keep;
    try { if (keep) localStorage.setItem(rememberLoginKey, '1'); else localStorage.removeItem(rememberLoginKey); } catch {}
    status(keep ? '已設定在此裝置保持登入。共用裝置請勿開啟。' : '已關閉保持登入；關閉分頁後需重新登入。');
  } catch { status('未能更改登入保留設定；原有設定不變。'); }
  finally { accountBusy = false; updateAccount(); }
};
$('#account').onclick = async () => {
  if (accountBusy) return;
  if (!client) return status('登入服務仍在準備，請稍後再試。');
  accountBusy = true; updateAccount();
  try {
    if (user) { eraseCopy(); clearTrip(); await client.logout(); signedOut(); status('已登出，私人資料已從畫面清除。'); }
    else { wantsPrivateAfterLogin = true; await client.login(); }
  } catch (error) {
    wantsPrivateAfterLogin = false;
    status(error?.code === 'auth/popup-blocked' ? '登入視窗被瀏覽器阻擋，請允許彈出視窗後再試。' : '登入或登出未完成，請重試。');
  } finally { accountBusy = false; updateAccount(); }
};
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.tab) { tab = button.dataset.tab; render(); }
  if (button.dataset.day) { day = button.dataset.day; render(); }
  if (role !== 'admin' || demo) return;
  if (button.dataset.edit) return openEditor(items.find(item => item.id === button.dataset.edit));
  if (!button.dataset.delete && !button.dataset.toggle) return;
  button.disabled = true;
  try {
    if (button.dataset.delete) await client.remove(button.dataset.delete);
    else { const item = items.find(item => item.id === button.dataset.toggle); await client.update(item.id, {done: !item.done}); }
  } catch { status('儲存失敗，請檢查連線及權限。'); }
  finally { button.disabled = false; }
});
function openEditor(item) {
  if (role !== 'admin' || demo) return;
  closeEditor(); editingId = item?.id || null;
  const form = $('#editForm');
  for (const key of ['title', 'date', 'time', 'note', 'place']) form.elements[key].value = item?.[key] ?? (key === 'date' ? day || trip.start : '');
  form.elements.date.min = trip.start; form.elements.date.max = trip.end;
  $('#editor h2').textContent = editingId ? '編輯項目' : tab === 'days' ? '加入行程' : tab === 'bookings' ? '加入預訂' : '加入清單';
  $('#editor').showModal();
}
$('#add').onclick = () => openEditor(); $('#cancel').onclick = closeEditor;
$('#editor').addEventListener('cancel', closeEditor);
$('#editForm').onsubmit = async event => {
  event.preventDefault(); if (role !== 'admin' || demo) return;
  const item = Object.fromEntries(new FormData(event.target)); item.title = item.title.trim();
  item.kind = tab === 'days' ? 'event' : tab === 'bookings' ? 'booking' : 'check';
  item.done = editingId ? items.find(row => row.id === editingId).done : false;
  if (!validateItem(item) || item.date < trip.start || item.date > trip.end) { $('#editorStatus').textContent = '請填寫名稱，並選擇旅程日期範圍內的日期。'; return; }
  const button = event.target.querySelector('[type=submit]'), run = generation; button.disabled = true;
  try {
    if (editingId) await client.update(editingId, item); else await client.add(item);
    if (run === generation) { closeEditor(); status('已同步。'); }
  } catch { if (run === generation) $('#editorStatus').textContent = '未能儲存，請檢查權限或連線後再試。'; }
  finally { button.disabled = false; }
};
$('#theme').onclick = () => {
  document.body.classList.toggle('dark');
  try { localStorage.setItem('taipei-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); } catch {}
};
try { document.body.classList.toggle('dark', localStorage.getItem('taipei-theme') === 'dark'); } catch {}
function copy() { try { return localStorage.getItem(storageKey); } catch { return null; } }
function eraseCopy() { try { localStorage.removeItem(storageKey); return true; } catch { return false; } }
function updateOffline() {
  $('#offlineSave').hidden=!(navigator.onLine && user && trip && role && !demo && !offlineView && crypto.subtle);
  $('#offlineSave').textContent=copy()?'更新離線版':'儲存離線版';
  $('#offlineOpen').hidden=navigator.onLine || !copy() || !crypto.subtle;
  $('#offlineLock').hidden=!offlineView;
  $('#offlineDelete').hidden=!copy();
}
function closeOffline() {
  mode=null; attempt++; $('#offlineForm').reset();
  if ($('#offlineDialog').open) $('#offlineDialog').close();
}
function offlineGate() {
  clearTrip(); gate('已離線', copy()?'用離線密碼解鎖本機副本。':'此裝置未有離線版。請連網登入後儲存。');
  status('已離線');
}
function dialog(next) {
  if ((next==='save' ? $('#offlineSave') : $('#offlineOpen')).hidden) return;
  closeOffline(); mode=next;
  const save=next==='save';
  $('#offlineTitle').textContent=save?'儲存加密離線版':'解鎖離線行程';
  $('#offlineHelp').textContent=save?'只喺自己嘅裝置使用。設定至少 10 字元嘅獨立密碼；行程、預訂同清單只會加密儲喺本機。副本只讀，14 日後失效；登出會清除。離線時無法驗證最新權限。':'輸入儲存時設定嘅離線密碼，唔係 Google 密碼。';
  $('#offlineConfirmWrap').hidden=!save; $('#offlineConfirm').required=save;
  $('#offlineSubmit').textContent=save?'加密並儲存':'解鎖';
  $('#offlineSubmit').disabled=false; $('#offlineError').textContent='';
  $('#offlineDialog').showModal();
}
$('#offlineSave').onclick=()=>dialog('save');
$('#offlineOpen').onclick=()=>dialog('unlock');
$('#offlineCancel').onclick=closeOffline;
$('#offlineDialog').addEventListener('cancel',e=>{e.preventDefault();closeOffline();});
$('#offlineLock').onclick=offlineGate;
$('#offlineDelete').onclick=()=>{
  if (!confirm('刪除此裝置嘅離線副本？網上行程唔會改動。')) return;
  closeOffline();
  if (!eraseCopy()) return status('未能刪除本機副本。');
  if (offlineView || (!navigator.onLine && !demo)) offlineGate(); else updateOffline();
  status('已刪除本機離線副本。');
};
addEventListener('storage',e=>{
  if ((e.key===storageKey || e.key===null) && !copy()) {
    if (offlineView) offlineGate(); else closeOffline();
    updateOffline();
  }
});
$('#offlineForm').onsubmit=async e=>{
  e.preventDefault();
  const step=mode, seq=++attempt, gen=generation, uid=user?.uid;
  const pass=$('#offlinePass').value, again=$('#offlineConfirm').value;
  $('#offlinePass').value=''; $('#offlineConfirm').value='';
  const current=()=>seq===attempt && gen===generation && step===mode;
  $('#offlineSubmit').disabled=true; $('#offlineError').textContent='';
  try {
    if (step==='save' && navigator.onLine && uid && role && trip && !demo && !offlineView) {
      if (pass!==again) { $('#offlineError').textContent='兩次密碼唔相同，請再輸入。'; return; }
      const urls=['./index.html','./styles.css?v=8','./app.js?v=8','./core.js?v=6','./offline.js?v=8'];
      const ready=await Promise.all(urls.map(url=>caches.match(url,{cacheName:'taipei-shell-v8'})));
      if (!ready.every(Boolean)||!navigator.serviceWorker.controller) throw Object.assign(Error('shell'),{code:'shell'});
      const data=await client.readOfflineCopy(uid);
      if (!current() || !navigator.onLine || user?.uid!==uid) return;
      const blob=await encrypt(data,pass);
      if (!current() || !navigator.onLine || user?.uid!==uid) return;
      localStorage.setItem(storageKey,blob);
      closeOffline(); updateOffline(); status('已儲存加密離線版。可以開飛行模式試用。');
    } else if (step==='unlock' && !navigator.onLine) {
      const blob=copy(), data=await decrypt(blob,pass);
      if (!current() || navigator.onLine || blob!==copy()) return;
      clearTrip(); offlineView=true; role='viewer'; trip=data.trip; items=data.items;
      tab='days'; day=initialTripDay(trip.start,trip.end); render(); window.scrollTo(0,0);
      status('離線副本 · 只讀 · 儲存於 '+new Date(data.at).toLocaleString('zh-HK',{timeZone:'Asia/Taipei'}));
    }
  } catch (err) {
    if (!current()) return;
    if (err?.code==='permission-denied') return accessFailure(err);
    if (err?.code==='expired') { eraseCopy(); offlineGate(); return status('副本已過期，請連網重新儲存。'); }
    $('#offlineError').textContent=step==='unlock'?'未能解鎖。請檢查離線密碼。':err?.code==='shell'?'離線 App 尚未下載完成，請連網重新整理再試。':'未能儲存離線版。請檢查連線或裝置空間。';
  } finally { if (current()) $('#offlineSubmit').disabled=false; }
};
addEventListener('pagehide',()=>{if (offlineView) offlineGate(); else closeOffline();});
addEventListener('offline',()=>{
  if (!demo) { reconnectPrivate=Boolean(user); offlineGate(); } else updateOffline();
});
addEventListener('online',()=>{
  if (offlineView) clearTrip(); else closeOffline();
  updateOffline();
  $('#retryAccess').disabled=false;
  if (reconnectPrivate && client && user && !demo && !accountBusy) openPrivate(user);
  else if (!client) initOnline();
  else if (!demo && !user) signedOut();
});
function initOnline() {
  if (!navigator.onLine || client || initializing) return initializing;
  initializing=(async()=>{
    try {
      let response=await fetch('./config.local.json',{cache:'no-store'});
      if (!response.ok) response=await fetch('./config.public.json',{cache:'no-store'});
      if (!response.ok) throw Error('missing configuration');
      const config=await response.json();
      if (!config.firebase?.projectId || !config.tripId || JSON.stringify(config).includes('CONFIRM_')) throw Error('incomplete configuration');
      client=await (await import('./firebase-client.js?v=8')).connect(config,rememberLogin);
      updateAccount();
      client.watchAuth(next=>{
        if (demo && !wantsPrivateAfterLogin) { user=next; updateAccount(); return; }
        wantsPrivateAfterLogin=false;
        if (!navigator.onLine) { user=next; reconnectPrivate=Boolean(next); updateAccount(); return; }
        if (next) openPrivate(next); else signedOut();
      });
    } catch {
      if (!demo && navigator.onLine) { gate('暫時未能準備登入','請檢查網絡後重新整理；亦可以先查看行程靈感。'); status('未能連接登入服務。'); }
    } finally { initializing=null; }
  })();
  return initializing;
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
if (navigator.onLine) initOnline(); else offlineGate();
