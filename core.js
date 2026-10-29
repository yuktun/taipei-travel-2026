export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const mapURL=place=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
export function roleFor(user,membership){return user?.emailVerified&&membership?.enabled===true&&['admin','viewer'].includes(membership.role)?membership.role:null;}
export function validateItem(item){return typeof item.title==='string'&&item.title.trim().length>0&&item.title.length<=120&&/^\d{4}-\d{2}-\d{2}$/.test(item.date)&&['event','booking','check'].includes(item.kind)&&['time','note','place'].every(k=>typeof item[k]==='string')&&item.note.length<=2000&&item.place.length<=200&&item.time.length<=40&&typeof item.done==='boolean';}
export function datesBetween(start,end){const result=[];for(let d=new Date(start+'T12:00:00Z');d<=new Date(end+'T12:00:00Z')&&result.length<31;d.setUTCDate(d.getUTCDate()+1))result.push(d.toISOString().slice(0,10));return result;}
// Placeholder dates only index a generic public template. No actual trip dates or bookings.
export const demoTrip={title:'台北五日行程靈感',start:'2030-01-01',end:'2030-01-05'};
const inspiration=[
 [0,'13:30–16:30','中山・赤峰街散步（建議）','建議｜未預訂。抵達日留鬆一點：先寄存行李，再逛中山小店、赤峰街及咖啡店；入住後休息。','赤峰街 台北'],
 [0,'18:00–20:00','寧夏夜市（建議）','建議｜未預訂。以小吃晚餐收尾；當日攰可以提早返回住宿，唔使趕景點。','寧夏夜市'],
 [1,'10:00–13:00','大稻埕・迪化街（建議）','建議｜未預訂。早餐後逛老街、茶舖及雜貨店，中午喺附近慢慢食飯。','迪化街 台北'],
 [1,'14:30–17:30','西門町自由逛街（建議）','建議｜未預訂。下午留畀購物、甜品或咖啡；下雨時可以縮短戶外路線。','西門町'],
 [1,'20:00–21:00','不老松足湯新生行館（可選）','建議｜未預訂。可作散步後放鬆；先向店舖確認時段、服務及預約，唔代表已訂位。','不老松足湯新生行館 台北市中山區新生北路二段70號'],
 [2,'10:00–13:00','北投公園・溫泉博物館（建議）','建議｜未預訂。沿北投公園慢行；博物館是否開放及入場安排，出發前再查官方公告。','北投溫泉博物館'],
 [2,'13:30–14:30','地熱谷（可選）','建議｜未預訂。按天氣及體力決定是否加遊；出發前查開放安排，沿指定步道參觀。','北投地熱谷'],
 [2,'15:30–18:00','淡水河邊散步（二選一）','建議｜未預訂。北投後只加一個地區：想睇河景可揀淡水；如果想輕鬆食夜市，就改揀士林，唔使兩邊都去。','淡水老街'],
 [2,'18:00–20:00','士林夜市（二選一）','建議｜未預訂。淡水嘅替代選擇；如果已經喺淡水玩到傍晚，呢項可以略過。','士林夜市'],
 [3,'11:00–16:30','台北101・信義區（建議）','建議｜未預訂。以信義區步行及商場為主；101觀景台屬可選活動，門票及天氣要另外確認。','台北101'],
 [3,'17:30–19:30','饒河街夜市（建議）','建議｜未預訂。晚餐移到松山，沿夜市慢慢食；按食量同人流調整停留時間。','饒河街觀光夜市'],
 [4,'09:00–11:00','附近早餐・回程準備（建議）','建議｜未預訂。回程日只安排住宿附近活動；整理行李，按實際航班、交通及航空公司要求預留機場緩衝。','雙連市場 台北']
];
export const demoItems=inspiration.map(([offset,time,title,note,place],i)=>({id:`idea-${i+1}`,kind:'event',title,date:`2030-01-0${offset+1}`,time,note,place,done:false}));
demoItems.push({id:'sample-check',kind:'check',title:'準備旅行用品',date:demoTrip.start,time:'',note:'行程靈感清單：證件、充電器、雨具；請按自己需要調整。',place:'',done:false});
