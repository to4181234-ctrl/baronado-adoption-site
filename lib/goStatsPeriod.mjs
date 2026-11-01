export function kstDate(value){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));return [p.find(x=>x.type==='year').value,p.find(x=>x.type==='month').value,p.find(x=>x.type==='day').value].join('-')}
const isoDay=/^\d{4}-\d{2}-\d{2}$/;
function utcDate(value){if(typeof value!=='string'||!isoDay.test(value))throw Error('날짜 형식을 확인해주세요.');const date=new Date(value+'T00:00:00Z');if(Number.isNaN(+date)||date.toISOString().slice(0,10)!==value)throw Error('날짜를 확인해주세요.');return date}
export function periodRange({start,end,days=30,now=new Date()}={}){
 const today=kstDate(now);let first=start,last=end;
 if(!first||!last){const d=utcDate(today);d.setUTCDate(d.getUTCDate()-(days-1));first=d.toISOString().slice(0,10);last=today}
 const a=utcDate(first),b=utcDate(last);const count=Math.round((+b-a)/86400000)+1;
 if(count<=0||count>3650)throw Error('조회 기간은 1~3650일로 선택해주세요.');
 // KST is UTC+9 and has no DST. End is exclusive to include the entire selected day.
 const startIso=new Date(+a-9*3600000).toISOString(),endIso=new Date(+b+86400000-9*3600000).toISOString();
 return {first,last,count,startIso,endIso,group:count<=31?'day':count<=180?'week':'month'};
}
export function groupKey(iso,group){const k=kstDate(iso);if(group==='month')return k.slice(0,7);if(group==='week'){const d=utcDate(k),week=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-week);return d.toISOString().slice(0,10)}return k}
export function safeCsv(value){let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
