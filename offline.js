export const storageKey = 'taipei-travel:encrypted-copy:v1';
const encoder = new TextEncoder(), decoder = new TextDecoder();
const aad = encoder.encode(storageKey);
const b64 = bytes => btoa(Array.from(bytes, n => String.fromCharCode(n)).join(''));
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function key(pass, salt, use) {
  if (typeof pass !== 'string' || pass.length < 10 || pass.length > 128) throw Error('invalid passphrase');
  const material = await crypto.subtle.importKey('raw', encoder.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt, iterations:600000}, material,
    {name:'AES-GCM', length:256}, false, [use]);
}
function clean(data, at) {
  const d = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s));
  const t = data?.trip;
  if (typeof t?.title !== 'string' || !d(t.start) || !d(t.end) || t.start > t.end || !Array.isArray(data.items)) throw Error('invalid trip');
  const items = data.items.map(i => {
    if (!d(i?.date) || !['event','booking','check'].includes(i.kind)) throw Error('invalid item');
    return {...Object.fromEntries(['id','title','kind','date','time','note','place'].map(k=>[k,String(i[k]??'')])), done:i.done===true};
  });
  return {trip:{title:t.title,start:t.start,end:t.end},items,at};
}
export async function encrypt(data,pass) {
  const salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12));
  const c=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad}, await key(pass,salt,'encrypt'),
    encoder.encode(JSON.stringify(clean(data,Date.now()))));
  return JSON.stringify({version:1,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(c))});
}
export async function decrypt(blob, pass, now=Date.now()) {
  if (!blob || blob.length>5_000_000) throw Error('invalid copy');
  const p=JSON.parse(blob), salt=bytes(p.salt), iv=bytes(p.iv);
  if (p.version!==1 || salt.length!==16 || iv.length!==12) throw Error('invalid copy');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},await key(pass,salt,'decrypt'),bytes(p.data));
  const parsed=JSON.parse(decoder.decode(plain));
  if (!Number.isFinite(parsed.at) || parsed.at>now || now-parsed.at>14*86400000) throw Object.assign(Error('expired'),{code:'expired'});
  return clean(parsed,parsed.at);
}
