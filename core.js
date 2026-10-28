export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const mapURL=place=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
export function roleFor(user,membership){return user?.emailVerified&&membership?.enabled===true&&['admin','viewer'].includes(membership.role)?membership.role:null;}
export function validateItem(item){return typeof item.title==='string'&&item.title.trim().length>0&&item.title.length<=120&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&['event','booking','check'].includes(item.kind)&&['time','note','place'].every(k=>typeof item[k]==='string')&&item.note.length<=2000&&item.place.length<=200&&item.time.length<=40&&typeof item.done==='boolean';}
export function datesBetween(start,end){const result=[];for(let d=new Date(start+'T12:00:00Z');d<=new Date(end+'T12:00:00Z')&&result.length<31;d.setUTCDate(d.getUTCDate()+1))result.push(d.toISOString().slice(0,10));return result;}
export const demoTrip={title:'台北示範旅程',start:'2030-01-01',end:'2030-01-05'};
export const demoItems=[{id:'sample1',kind:'event',title:'留一個下午畀城市',date:'2030-01-01',time:'14:00',note:'虛構示範：散步、飲杯咖啡，再慢慢決定下一站。',place:'台北',done:false},{id:'sample2',kind:'check',title:'準備旅行用品',date:'2030-01-01',time:'',note:'虛構示範清單',place:'',done:false}];
