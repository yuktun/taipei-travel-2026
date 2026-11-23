const dbName = 'taipei-travel-offline-v2';
const storeName = 'copies';
const slot = 'current';
const maxAge = 14 * 86400000;
const maxSize = 5_000_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal:true});
const aad = encoder.encode(dbName + ':' + slot);
const fail = (message, code) => Object.assign(new Error(message), {code});
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const stringOrEmpty = value => typeof value === 'string' ? value : '';

function cleanSnapshot(data, at) {
  const t = data?.trip;
  if (typeof t?.title !== 'string' || !validDate(t.start) || !validDate(t.end) ||
      t.start > t.end || !Array.isArray(data.items)) throw fail('Invalid offline snapshot', 'invalid');
  const items = data.items.map(i => {
    if (!validDate(i?.date) || !['event','booking','check'].includes(i.kind)) {
      throw fail('Invalid offline item', 'invalid');
    }
    return {
      ...Object.fromEntries(['id','title','time','note','place'].map(k => [k,stringOrEmpty(i[k])])),
      kind:i.kind, date:i.date, done:i.done === true,
    };
  });
  return {trip:{title:t.title,start:t.start,end:t.end},items,at};
}

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(fail('Local storage is unavailable', 'storage'));
      return;
    }
    const req = indexedDB.open(dbName, 1);
    let blocked = false;
    req.onupgradeneeded = () => req.result.createObjectStore(storeName);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      blocked = true;
      reject(fail('Local storage is busy', 'storage'));
    };
    req.onsuccess = () => {
      const db = req.result;
      if (blocked) return db.close();
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

async function transaction(mode, action) {
  const db = await openLocalDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let req, thrown;
      tx.oncomplete = () => resolve(req?.result);
      tx.onabort = () => reject(thrown ?? tx.error ?? fail('Local storage did not commit', 'storage'));
      try { req = action(tx.objectStore(storeName)); }
      catch (err) { thrown = err; tx.abort(); }
    });
  } finally { db.close(); }
}

export async function hasDeviceCopy() {
  return Boolean(await transaction('readonly', store => store.getKey(slot)));
}

export async function saveDeviceCopy(data, stillAllowed = () => true) {
  const plaintext = encoder.encode(JSON.stringify(cleanSnapshot(data, Date.now())));
  if (plaintext.byteLength > maxSize) throw fail('Offline snapshot is too large', 'invalid');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.generateKey({name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad}, key, plaintext);
  // Commit ciphertext and key together. An interrupted or denied save leaves the previous copy intact.
  await transaction('readwrite', store => {
    if (!stillAllowed()) throw fail('Offline save was canceled', 'canceled');
    return store.put({version:2,key,iv,ciphertext}, slot);
  });
}

export async function readDeviceCopy(now = Date.now()) {
  const record = await transaction('readonly', store => store.get(slot));
  if (!record) throw fail('No local offline copy', 'missing');
  if (record.version !== 2 || record.key?.extractable !== false ||
      !(record.iv instanceof Uint8Array) || record.iv.byteLength !== 12 ||
      !(record.ciphertext instanceof ArrayBuffer) || record.ciphertext.byteLength > maxSize + 16) {
    throw fail('Invalid offline copy', 'invalid');
  }
  const plaintext = await crypto.subtle.decrypt(
    {name:'AES-GCM',iv:record.iv,additionalData:aad}, record.key, record.ciphertext);
  const data = JSON.parse(decoder.decode(plaintext));
  if (!Number.isFinite(data.at) || data.at > now || now - data.at >= maxAge) {
    throw fail('Offline copy has expired', 'expired');
  }
  return cleanSnapshot(data, data.at);
}

export async function deleteDeviceCopy() {
  await transaction('readwrite', store => store.delete(slot));
}
