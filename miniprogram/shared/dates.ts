// Calendar arithmetic avoids local midnight parsing and DST drift.
export function dayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y,m,d]=value.split('-').map(Number),time=Date.UTC(y,m-1,d),date=new Date(time);
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?time/86400000:null;
}
export function dateString(date=new Date()): string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function calendarDays(from:string,to=dateString()):number {const a=dayNumber(from),b=dayNumber(to);return a===null||b===null?0:b-a;}
export function loveDays(from:string,today=dateString()):number {return dayNumber(from)===null?0:Math.max(0,calendarDays(from,today)+1);}
export function addDays(value:string,days:number):string {const n=dayNumber(value);return n===null?'':new Date((n+days)*86400000).toISOString().slice(0,10);}
export function addYears(value:string,years:number):string {if(dayNumber(value)===null)return '';const next=`${Number(value.slice(0,4))+years}${value.slice(4)}`;return dayNumber(next)===null?`${Number(value.slice(0,4))+years}-02-28`:next;}
export function nextAnniversary(value:string,today=dateString()):number {
  if(dayNumber(value)===null)return 0;
  const year=Number(today.slice(0,4));let next=`${year}${value.slice(4)}`;
  if(dayNumber(next)===null)next=`${year}-02-28`;
  if(next<today){next=`${year+1}${value.slice(4)}`;if(dayNumber(next)===null)next=`${year+1}-02-28`;}
  return calendarDays(today,next);
}
