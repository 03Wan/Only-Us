import { legacySeedHashes } from './legacy-seeds';
const oldPrefix='only-us:mock:v1:',prefix='only-us:local:v2:';
const samplePhoto=(value:unknown)=>typeof value==='string'&&value.startsWith('/assets/photos/');
const hash=(value:string)=>{let h=2166136261;for(const ch of value.replace(/\s+/g,' ').trim())h=Math.imul(h^ch.charCodeAt(0),16777619);return (h>>>0).toString(16);};
export const isLegacySeed=(kind:string,value:unknown):boolean=>typeof value==='string'&&!!legacySeedHashes[kind]?.includes(hash(value));
const object=(value:any)=>value&&typeof value==='object'&&!Array.isArray(value)?{...value}:{};
function cleanRecord(value:any){
  if(!value||typeof value!=='object'||value.mock===true||value.isMock===true||value.demo===true)return null;
  const row={...value};let changed=false;
  for(const key of ['content','title'])if(isLegacySeed(key,row[key])){row[key]='';changed=true;}
  if(Array.isArray(row.photos)){row.photos=row.photos.filter((p:unknown)=>!samplePhoto(p));if(row.photos.length!==value.photos.length)changed=true;}
  return changed&&!row.content&&!row.title&&!row.photos?.length?null:row;
}
export function migrateLocalData():void{
  if(wx.getStorageSync(prefix+'dataOnly')===true)return;
  const keys=wx.getStorageInfoSync().keys.filter(k=>k.startsWith(oldPrefix)),values=new Map<string,any>();
  for(const key of keys){const name=key.slice(oldPrefix.length);const existing=wx.getStorageSync(prefix+name);values.set(name,existing!==''&&existing!==undefined?existing:wx.getStorageSync(key));}
  for(const key of wx.getStorageInfoSync().keys.filter(k=>k.startsWith(prefix)&&k!==prefix+'dataOnly'))values.set(key.slice(prefix.length),wx.getStorageSync(key));
  const savedSpace=wx.getStorageSync(prefix+'space');if(savedSpace&&typeof savedSpace==='object')values.set('space',savedSpace);
  const space=object(values.get('space')),profile=object(space.profile);
  const customizedProfile=['mine','partner','cabinName'].some(key=>typeof profile[key]==='string'&&profile[key].trim()&&!isLegacySeed(key,profile[key]));
  for(const key of ['mine','partner','cabinName','anniversary'])if(isLegacySeed(key,profile[key])&&(key!=='anniversary'||!customizedProfile))profile[key]='';
  for(const key of ['avatarMine','avatarPartner'])if(samplePhoto(profile[key]))profile[key]='';
  if(isLegacySeed('moodNote',space.moodNote)&&space.mood==='想你')space.mood='';
  for(const key of ['note','moodNote'])if(isLegacySeed(key,space[key]))space[key]='';
  space.profile=profile;
  const extras=(Array.isArray(values.get('extraWishes'))?values.get('extraWishes'):[]).filter((w:any)=>w&&typeof w.id==='string'&&typeof w.text==='string'&&!isLegacySeed('wishText',w.text));
  for(const [index,value]of Object.entries(object(space.wishDetails))){const detail=object(value);if(detail.text&&(!isLegacySeed('wishText',detail.text)||(detail.note&&!isLegacySeed('wishNote',detail.note))))extras.push({id:'migrated-wish-'+index,text:detail.text,note:isLegacySeed('wishNote',detail.note)?'':detail.note||'',done:!!space.wishes?.[Number(index)]});}
  space.wishes=[false,false,false,false];space.wishDetails={};values.set('space',space);values.set('extraWishes',extras);
  for(const collection of ['moments','letters','stories'])if(Array.isArray(values.get(collection)))values.set(collection,values.get(collection).map(cleanRecord).filter(Boolean));
  for(const [name,value]of values){
    if(!/Draft$/.test(name)||!value||typeof value!=='object')continue;
    const draft={...value};for(const field of ['content','title','storyContent','storyTitle'])if(isLegacySeed(field.endsWith('Title')||field==='title'?'title':'content',draft[field]))draft[field]='';
    for(const field of ['photo','photo2','storyPhoto'])if(samplePhoto(draft[field]))draft[field]='';if(!draft.storyTitle&&!draft.storyContent&&!draft.storyPhoto&&draft.storyWeather==='晴')draft.storyWeather='';values.set(name,draft);
  }
  if(isLegacySeed('content',values.get('newStory')))values.delete('newStory');
  const title=values.get('mockSentLetter')?.title;if(title&&!isLegacySeed('title',title))values.set('legacyLetterTitle',title);values.delete('mockSentLetter');
  values.delete('inviteCode');values.delete('pairState');values.delete('momentState');
  // Only retire the old keys after every cleaned value has been written successfully.
  for(const [name,value]of values)wx.setStorageSync(prefix+name,value);
  wx.setStorageSync(prefix+'dataOnly',true);
  for(const key of keys)wx.removeStorageSync(key);
}
