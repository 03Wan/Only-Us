import { environment } from '../config/env';
const messages:Record<string,string>={NOT_BOUND:'请先完成双人绑定',FORBIDDEN:'当前账号没有访问这个空间的权限',UNAUTHENTICATED:'微信身份校验未通过，请重新登录',CONFLICT:'对方刚刚更新了数据，已刷新；请检查后重新操作',LETTER_LOCKED:'还未到服务器设定的启封时间',INVALID_DATE:'请选择有效日期，未来信件须晚于今天',INVALID_INPUT:'请检查输入内容',INVALID_INVITE:'密令无效、已过期或已使用',INVITE_BUSY:'这个密令正在等待另一个申请确认',ALREADY_BOUND:'账号已有关联小屋，不能重复绑定',TOO_FAST:'操作太快，请稍后重试',SCHEMA_REVIEW_REQUIRED:'已有云数据结构需要兼容性审查，已停止写入',SERVICE_UNAVAILABLE:'云服务暂时不可用，请检查网络后重试',INVALID_IMAGE:'照片格式暂不支持，请选择 JPEG 或 PNG 图片',NO_REQUEST:'没有待确认的申请',LIMIT_REACHED:'已达到容量上限，请先整理记录'};
export class GatewayError extends Error {constructor(public code:string){super(messages[code]||'请求未完成，请稍后重试');}}
const signedUrls=new Map<string,{url:string;expires:number}>();
export function clearCloudFiles():void {signedUrls.clear();}
export async function resolveCloudFile(id:string):Promise<string>{
  const key=environment.cloudEnvId+':'+id,cached=signedUrls.get(key);
  if(cached&&cached.expires>Date.now())return cached.url;
  const {url}=await callGateway<{url:string}>('fileUrl',{id});
  if(signedUrls.size>=100)signedUrls.delete(signedUrls.keys().next().value as string);
  signedUrls.set(key,{url,expires:Date.now()+240000});return url;
}
export async function callGateway<T>(action:string,payload:Record<string,unknown>={},extra:Record<string,unknown>={}):Promise<T> {
  if(environment.mode!=='cloud'||!environment.cloudEnvId)throw new Error('请先配置微信云环境，当前无法连接对方');
  const response=await wx.cloud.callFunction({name:environment.gatewayFunction,data:{action,payload,...extra}});
  const result=response.result as {ok?:boolean;data?:T;error?:string}|null;
  if(!result?.ok)throw new GatewayError(result?.error||'SERVICE_UNAVAILABLE');return result.data as T;
}
// Retain the same request ID after an uncertain network outcome, including app restart.
export async function writeGateway<T>(action:string,payload:Record<string,unknown>,version:number):Promise<T> {
  const key=`only-us:cloud:${environment.cloudEnvId}:pending:${action}`,signature=JSON.stringify({action,payload});
  const old=wx.getStorageSync(key) as {signature:string;id:string}|undefined;
  const pending=old?.signature===signature?old:{signature,id:`${Date.now()}-${Math.random().toString(36).slice(2)}`};
  wx.setStorageSync(key,pending);
  try {const result=await callGateway<T>(action,payload,{version,requestId:pending.id});wx.removeStorageSync(key);return result;}
  catch(error){if(error instanceof GatewayError)wx.removeStorageSync(key);throw error;}
}
