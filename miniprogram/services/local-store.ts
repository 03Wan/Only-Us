import type { LocalSpace } from '../types/domain';
import { dateString } from '../shared/dates';
const prefix = 'only-us:local:v2:';
let localDataEpoch=0;
export const currentLocalDataEpoch=():number=>localDataEpoch;
export const defaultSpace: LocalSpace = {
  profile: { mine: '', partner: '', anniversary: '', firstMet: '', cabinName: '' },
  mood: '', moodNote: '', shareMood: true,
  hugs: 0, wishes: [false, false, false, false], favorites: [], meetingDate:'',hugDay:'',
  note: '',
};
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = wx.getStorageSync(prefix + key);
    if(value===''||value===undefined||(value===null&&fallback!==null))return fallback;
    if(Array.isArray(fallback)&&!Array.isArray(value))return fallback;
    if(fallback!==null&&typeof fallback!=='object'&&typeof value!==typeof fallback)return fallback;
    return value as T;
  }
  catch { return fallback; }
}
export function writeLocal<T>(key: string, value: T): void {
  // Local cache is not encrypted and must never be described as secure cloud persistence.
  wx.setStorageSync(prefix + key, value);
}
export function readSpace(): LocalSpace {
  const saved = readLocal<Partial<LocalSpace>>('space', {});
  const value=saved && typeof saved==='object' ? saved : {};
  const profile={...defaultSpace.profile,...(value.profile&&typeof value.profile==='object'?value.profile:{})};
  for(const key of ['mine','partner','anniversary','cabinName'] as const)if(typeof profile[key]!=='string')profile[key]=defaultSpace.profile[key];
  return { ...defaultSpace, ...value, profile,
    hugs:value.hugDay===dateString()&&Number.isFinite(value.hugs)?Number(value.hugs):0,
    affectionCounts:value.affectionDay===dateString()&&value.affectionCounts&&typeof value.affectionCounts==='object'?Object.fromEntries(Object.entries(value.affectionCounts).filter(([kind,count])=>['backPat','headPat','holdHands','shoulderRub'].includes(kind)&&Number.isInteger(count)&&Number(count)>=0)):{},
    wishes:Array.isArray(value.wishes)&&value.wishes.length===4?value.wishes.map(Boolean):[false,false,false,false],
    favorites:Array.isArray(value.favorites)?value.favorites.filter(x=>typeof x==='string'):[] };
}
export function updateSpace(patch: Partial<LocalSpace>): LocalSpace {
  const next = { ...readSpace(), ...patch }; writeLocal('space', next); return next;
}

// Only remove files referenced by local records and not by other stored data.
export async function clearLocalData():Promise<number> {
  const all=wx.getStorageInfoSync().keys, local=all.filter(k=>k.startsWith(prefix)||k.startsWith('only-us:mock:v1:'));
  const paths=(keys:string[])=>{const found=new Set<string>();const visit=(v:any)=>{if(typeof v==='string')found.add(v);else if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')Object.values(v).forEach(visit);};for(const key of keys)visit(wx.getStorageSync(key));return found;};
  const localPaths=paths(local),otherPaths=paths(all.filter(k=>!local.includes(k)));
  const saved=await new Promise<WechatMiniprogram.GetSavedFileListSuccessCallbackResult>((resolve,reject)=>wx.getFileSystemManager().getSavedFileList({success:resolve,fail:reject}));
  const files=saved.fileList.map(f=>f.filePath).filter(path=>localPaths.has(path)&&!otherPaths.has(path));
  localDataEpoch++;
  for(const key of local)wx.removeStorageSync(key);
  wx.setStorageSync(prefix+'dataOnly',true);
  let failures=0;for(const filePath of files){try{await new Promise<void>((resolve,reject)=>wx.getFileSystemManager().removeSavedFile({filePath,success:()=>resolve(),fail:reject}));}catch{failures++;}}
  return failures;
}
