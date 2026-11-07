import { featureData, featureMethods } from './feature-editors';
import { affectionOptions } from './affection';
import { routes, go, back, tabKeys, type RouteKey } from './routes';
import { readLocal, writeLocal, readSpace, updateSpace, defaultSpace, currentLocalDataEpoch } from '../services/local-store';
import { environment } from '../config/env';
import { callGateway, writeGateway, GatewayError, resolveCloudFile, clearCloudFiles } from '../services/cloud';
import { dateString, dayNumber, calendarDays, loveDays, addDays, addYears, nextAnniversary } from './dates';
import type { Mood, MomentDraft, LetterDraft, SpaceSnapshot, RecordItem, Wish } from '../types/domain';

type FeatureData = typeof featureData;
interface ControllerData extends FeatureData {
  key:string; content:string; moodNote:string; mood:Mood; shareMood:boolean; mine:string;partner:string;cabinName:string;anniversary:string;today:string;tomorrow:string;loveDays:number;
  photo:string;photo2:string;avatar0:string;avatar1:string;stamp:string;layout:string;privateEnabled:boolean;privateNote:string;letterTitle:string;paper:number;delivery:'now'|'future';openAt:string;
  affectionAnimating:boolean;affectionAnimationSymbol:string;affectionAnimationLabel:string;partnerAffectionText:string;partnerAffectionDate:string;feedback:string;feedbackKind:string;pairState:string;pairMode:string;inviteCode:string;inviteInput:string;wishes:boolean[];wishCount:number;extraWishes:Wish[];hugs:number;note:string;daytime:boolean;lampOn:boolean;mailTab:string;retry:string;sentTitle:string;
  cloudMode:boolean;bound:boolean;busy:boolean;loading:boolean;syncIssue:''|'binding'|'error';syncLabel:string;partnerMood:string;meetingDate:string;meetingDays:number;meetingLabel:string;anniversaryDays:number;hundredDate:string;yearDate:string;
  moments:RecordItem[];letters:RecordItem[];stories:RecordItem[];visibleMoments:RecordItem[];visibleLetters:RecordItem[];visibleStories:RecordItem[];favorites:string[];recordId:string;letterBody:string;letterLocked:boolean;recordLoaded:boolean;monthFilter:string;hasMore:boolean;moreHistory:boolean;selectedTag:string;
}
const notify=(title:string):void=>{wx.showToast({title,icon:'none',duration:2000});};
const unique=():string=>`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const protectedActions=new Set(['saveProfile','saveMood','hug','affection','wish','extraWish','deleteWish','publishMoment','sendLetter','favoriteLetter','favoriteMoment','newCode','join','accept','reject','loadMore','deleteRecord']);
const fileKey=(name:string):string=>environment.mode==='cloud'?`cloud:${environment.cloudEnvId}:${name}`:name;
const localRecords=(key:string):RecordItem[]=>{const rows=readLocal<unknown>(key,[]);const valid=Array.isArray(rows)?rows.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'):[];const legacy=key==='stories'?readLocal<string>('newStory',''):'';if(legacy&&!readLocal('legacyStoryHidden',false)&&!valid.some(r=>r.id==='legacy-story'))valid.push({id:'legacy-story',mine:true,createdAt:0,content:legacy});return valid;};
export function createPage(key:RouteKey):WechatMiniprogram.Page.Options<ControllerData,WechatMiniprogram.IAnyObject> {
  const cloudMode=environment.mode==='cloud';
  return {
    data:{...featureData,key,content:'',moodNote:'',mood:'',shareMood:true,mine:'',partner:'',cabinName:'',anniversary:'',today:dateString(),tomorrow:addDays(dateString(),1),loveDays:0,
      photo:'',photo2:'',avatar0:'',avatar1:'',stamp:'☕',layout:'双图并排',privateEnabled:true,privateNote:'',letterTitle:'',paper:2,delivery:'future',openAt:addDays(dateString(),1),
      affectionAnimating:false,affectionAnimationSymbol:'',affectionAnimationLabel:'',partnerAffectionText:'',partnerAffectionDate:'',feedback:'',feedbackKind:'success',pairState:'waiting',pairMode:'create',inviteCode:'',inviteInput:'',wishes:[false,false,false,false],wishCount:0,extraWishes:[],hugs:0,note:'',daytime:false,lampOn:true,mailTab:'received',retry:'',sentTitle:'',
      cloudMode,bound:false,busy:false,loading:false,syncIssue:'',syncLabel:cloudMode?'正在连接云端':'本机模式 · 未连接对方',partnerMood:'对方尚未连接',meetingDate:'',meetingDays:0,meetingLabel:'尚未设置见面日期',anniversaryDays:0,hundredDate:'',yearDate:'',
      moments:[],letters:[],stories:[],visibleMoments:[],visibleLetters:[],visibleStories:[],favorites:[],recordId:'',letterBody:'',letterLocked:true,recordLoaded:false,monthFilter:'全部记录',hasMore:false,moreHistory:false,selectedTag:''},
    ...featureMethods,
    onLoad(options:{id?:string}={}) {
      this._generation=0;this._version=0;this._localDataEpoch=currentLocalDataEpoch();this._alive=true;this._formLoaded=false;this._dirty=false;
      this.setData({recordId:options.id||'',inviteCode:cloudMode?readLocal(fileKey('inviteCode'),''):this.data.inviteCode});
      this.loadAssets();
      if(key==='cabin'){this.setData({animationEnabled:readLocal('animationEnabled',true),soundEnabled:readLocal('soundEnabled',false)});const selected=readLocal(fileKey('affectionKind'),'hug');this.setData({affectionKind:affectionOptions.some(a=>a.kind===selected)?selected:'hug',daytime:readLocal(fileKey('daytime'),new Date().getHours()>=6&&new Date().getHours()<18)});}
      if(!cloudMode)this.refreshLocal();
      if(key==='editor'){const draft=readLocal<MomentDraft|null>(fileKey('momentDraft'),null);if(draft)this.setData({content:draft.content,photo:draft.photo,photo2:draft.photo2||'',privateNote:draft.privateNote,privateEnabled:draft.privateEnabled??true,layout:draft.layout,stamp:draft.stamp||'☕',selectedTag:draft.selectedTag||''});}
      if(key==='compose'){const draft=readLocal<LetterDraft|null>(fileKey('letterDraft'),null);if(draft)this.setData({letterTitle:draft.title,content:draft.content,paper:draft.paper,delivery:draft.delivery,openAt:draft.openAt});}
    },
    loadAssets(){this.setData({photo:'',avatar0:'',avatar1:''});},
    onShow(){
      this._alive=true;if(key==='cabin')this.setData({daytime:readLocal(fileKey('daytime'),this.data.daytime),animationEnabled:readLocal('animationEnabled',true),soundEnabled:readLocal('soundEnabled',false)});const index=tabKeys.indexOf(key);if(index>=0)this.getTabBar?.()?.setData({selected:index,editorOpen:!!this.data.editorKind});
      this.setData({today:dateString(),tomorrow:addDays(dateString(),1)});this.updateDates();
      if(cloudMode){void this.refresh();if(!this._timer)this._timer=setInterval(()=>{this.updateDates();void this.refresh();},15000);}else {this.refreshLocal();if(['cabin','us'].includes(key)&&!this._timer)this._timer=setInterval(()=>{if(this._alive&&!this.data.busy)this.refreshLocal();},15000);}
    },
    onHide(){this.stopSync();this.autosave();},
    onUnload(){this._destroyed=true;this.stopSync();this.autosave();},
    stopSync(){if(this._affectionTimer){clearTimeout(this._affectionTimer);this._affectionTimer=undefined;}this.setData({affectionAnimating:false});this._alive=false;this._generation++;this._refreshing=false;this.setData({letterBody:'',recordLoaded:false});if(this._timer){clearInterval(this._timer);this._timer=undefined;}},
    onPullDownRefresh(){Promise.resolve(cloudMode?this.refresh():this.refreshLocal()).finally(()=>wx.stopPullDownRefresh());},
    updateDates(){const d=this.data as ControllerData,today=dateString();this.setData({today,tomorrow:addDays(today,1),loveDays:loveDays(d.anniversary,today),anniversaryDays:nextAnniversary(d.anniversary,today),hundredDate:d.customHundredDate||addDays(d.anniversary,99),yearDate:d.customYearDate||(d.anniversary?addYears(d.anniversary,1):''),meetingDays:d.meetingDate?Math.max(0,calendarDays(today,d.meetingDate)):0,meetingLabel:!d.meetingDate?'尚未设置见面日期':d.meetingDate<today?'这次见面日期已到，期待下次相见':d.meetingDate===today?'就是今天':'距离相见'});},
    applySpace(s:SpaceSnapshot){
      const form=['profile','mood'].includes(key),applyForm=!form||!this._formLoaded;
      const received=s.partnerAffection;const receivedOption=received&&affectionOptions.find(a=>a.kind===received.kind);
      const patch:Partial<ControllerData>={partnerAffectionText:receivedOption?'TA 送给你一个'+receivedOption.noun:'',partnerAffectionDate:receivedOption&&received?.createdAt?dateString(new Date(received.createdAt)):'',bound:s.bound,hugs:s.hugs,affectionCounts:s.affectionCounts||{},note:s.note,notes:s.notes === undefined ? (s.note ? [{id:'legacy',content:s.note,category:'未分类'}] : []) : s.notes,wishes:s.wishes,wishCount:s.wishes.filter(Boolean).length,extraWishes:s.extraWishes,ticket:s.ticket||null,wishDetails:s.wishDetails||{},meetingDate:s.meetingDate||'',partnerMood:s.partnerMood,partnerMoodKind:s.partnerMoodKind||'',favorites:s.favorites};
      if(applyForm)Object.assign(patch,s.profile,{firstMet:s.profile.firstMet||'',customHundredDate:s.profile.customHundredDate||'',customYearDate:s.profile.customYearDate||'',avatar0:s.profile.avatarMine||'',avatar1:s.profile.avatarPartner||'',mood:s.mood,moodNote:s.moodNote,shareMood:s.shareMood});
      this.setData({...patch,moments:s.moments,letters:s.letters,stories:s.stories});this._formLoaded=true;this.updateDates();this.filterRecords();this.featureRefresh();
    },
    clearSharedData(){
      clearCloudFiles();this._formLoaded=false;this._avatarIds=[];
      this.applySpace({...defaultSpace,bound:false,version:0,extraWishes:[],partnerMood:'对方尚未连接',moments:[],letters:[],stories:[]});
      this.setData({avatar0:'',avatar1:'',roleMine:'',rolePartner:'',mine:'',partner:'',cabinName:'',anniversary:'',firstMet:'',customHundredDate:'',customYearDate:'',mood:'',moodNote:'',partnerMoodKind:'',letterBody:'',letterTitle:'',recordLoaded:false,photo:'',photo2:'',content:'',privateNote:'',noteDraft:'',ticketForm:{...featureData.ticketForm},editorKind:''});
    },
    refreshLocal(){
      const space=readSpace();this.applySpace({...space,bound:false,version:0,extraWishes:readLocal<Wish[]>('extraWishes',[]),partnerMood:'对方尚未连接',moments:localRecords('moments'),letters:localRecords('letters'),stories:localRecords('stories')});
      if(key==='waiting'){const draft=readLocal<MomentDraft|null>('momentDraft',null);if(draft)this.setData({photo:draft.photo,content:draft.content});}
      this.loadLocalLetter();
    },
    async refresh(){
      if(this._refreshing||this.data.busy)return;
      this._refreshing=true;const generation=++this._generation;this.setData({loading:true});
      try{
        const session=await callGateway<{bound:boolean;pairState:string}>('session');
        if(!this._alive||generation!==this._generation)return;
        if(!session.bound){if(this.data.bound)this.clearSharedData();this.setData({bound:false,syncIssue:'binding',syncLabel:'请先完成双人绑定',pairState:session.pairState});return;}
        this.setData({bound:true,pairState:session.pairState});
        const snapshot=await callGateway<SpaceSnapshot>('snapshot');
        for(const field of ['moments','letters','stories'] as const){const count=this.data[field].length;for(let offset=10;offset<count;offset+=10){const next=await callGateway<RecordItem[]>('list',{collection:field==='letters'?'letters_meta':field,offset});snapshot[field].push(...next);if(next.length<10)break;}}
        if(!this._alive||generation!==this._generation)return;
        this._version=snapshot.version;if(key!=='profile'||!this._formLoaded)this._avatarIds=[snapshot.profile.avatarMine||'',snapshot.profile.avatarPartner||''];
        const hydrated=await this.hydrate(snapshot);
        if(!this._alive||generation!==this._generation)return;
        this.applySpace(hydrated);this.setData({syncIssue:'',syncLabel:'已连接云端 · 前台每15秒刷新'});
        await this.loadCloudLetter(generation);
      }catch(error){if(this._alive&&generation===this._generation){this.setData({syncIssue:'error',syncLabel:'同步失败 · 下拉重试'});this.feedback(error instanceof Error?error.message:'网络请求未完成','error','refresh');if(error instanceof GatewayError&&['FORBIDDEN','NOT_BOUND','UNAUTHENTICATED'].includes(error.code)){this.clearSharedData();}}}
      finally{if(generation===this._generation){this._refreshing=false;if(this._alive)this.setData({loading:false});}}
    },
    async hydrate(snapshot:SpaceSnapshot):Promise<SpaceSnapshot>{
      const ids=new Set<string>();for(const row of [...snapshot.moments,...snapshot.stories])for(const id of row.photos||[])ids.add(id);for(const id of [snapshot.profile.avatarMine,snapshot.profile.avatarPartner])if(id)ids.add(id);
      const urls:Record<string,string>={};await Promise.all([...ids].map(async id=>{urls[id]=await resolveCloudFile(id);}));
      const stories=snapshot.stories.map(r=>({...r,photoIds:r.photos||[],photos:(r.photos||[]).map(id=>urls[id])}));
      return {...snapshot,stories,profile:{...snapshot.profile,avatarMine:urls[snapshot.profile.avatarMine||''],avatarPartner:urls[snapshot.profile.avatarPartner||'']},moments:snapshot.moments.map(r=>({...r,photos:(r.photos||[]).map(id=>urls[id])}))};
    },
    filterRecords(){const d=this.data as ControllerData;const moments=d.moments.filter(r=>d.monthFilter==='全部记录'||r.dayKey?.startsWith(d.monthFilter));const letters=d.letters.filter(r=>d.mailTab==='sent'?r.mine:!r.mine);this.setData({visibleMoments:(d.moreHistory?moments:moments.slice(0,4)).map(r=>({...r,favorite:d.favorites.includes(r.id)})),visibleLetters:letters.map(r=>({...r,favorite:d.favorites.includes(r.id)})),visibleStories:d.moreHistory?d.stories:d.stories.slice(0,3),sentTitle:d.letters.find(r=>r.mine)?.title||'',hasMore:(key==='moments'?d.moments:key==='mailbox'?d.letters:d.stories).length>0&&(key==='moments'?d.moments:key==='mailbox'?d.letters:d.stories).length%10===0});},
    loadLocalLetter(){if(!['letter','locked'].includes(key)||!this.data.recordId)return;const row=localRecords('letters').find(r=>r.id===this.data.recordId);if(row)this.setData({letterTitle:row.title||'',letterBody:row.content||'',openAt:row.openAt?dateString(new Date(row.openAt)):'',letterLocked:false,recordLoaded:true});else this.feedback('信件不存在或已删除','error');},
    async loadCloudLetter(generation:number){if(!['letter','locked'].includes(key)||!this.data.recordId)return;this.setData({letterBody:'',recordLoaded:false});try{const meta=await callGateway<{title:string;openAt:number;locked:boolean}>('letterMeta',{id:this.data.recordId});if(!this._alive||generation!==this._generation)return;this.setData({letterTitle:meta.title,openAt:dateString(new Date(meta.openAt)),letterLocked:meta.locked,recordLoaded:meta.locked});if(meta.locked)return;const result=await callGateway<{title:string;content:string;openAt:number;paper:number}>('readLetter',{id:this.data.recordId});if(!this._alive||generation!==this._generation)return;this.setData({letterTitle:result.title,letterBody:result.content,openAt:dateString(new Date(result.openAt)),paper:result.paper,letterLocked:false,recordLoaded:true});}catch(error){if(this._alive&&generation===this._generation){this.setData({letterLocked:true,recordLoaded:true});this.feedback(error instanceof Error?error.message:'信件加载失败','error','refresh');}}},
    autosave(){if(this._localDataEpoch!==currentLocalDataEpoch())return;try{if(key==='editor')this.persistMoment();if(key==='compose')this.persistLetter();}catch{this.feedback('草稿未能保存，请检查设备剩余空间','error');}},
    onField(event:WechatMiniprogram.Input){const field=String(event.currentTarget.dataset.field);if(!['content','moodNote','mine','partner','cabinName','letterTitle','inviteInput','privateNote'].includes(field))return;this._dirty=true;this.setData({[field]:event.detail.value});if(key==='editor'||key==='compose')this.autosave();},
    async onDate(event:WechatMiniprogram.PickerChange){const field=String(event.currentTarget.dataset.field),value=String(event.detail.value);if(!['anniversary','firstMet','hundredDate','yearDate','openAt','meetingDate'].includes(field))return;if(dayNumber(value)===null){this.feedback('日期无效','error');return;}if(['us','cabin'].includes(key)&&['firstMet','anniversary','hundredDate','yearDate'].includes(field)){await this.saveMilestone(field,value);return;}if(['hundredDate','yearDate'].includes(field))return;if(field!=='meetingDate'){this.setData({[field]:value});this.updateDates();}if(field==='meetingDate'){await this.saveMeeting(value);}else this.autosave();},
    async saveMeeting(value:string){if(this.data.busy)return;this.setData({busy:true});try{await this.commit('meeting',{date:value},()=>updateSpace({meetingDate:value}));this.feedback(cloudMode?'见面日期已保存到云端':'见面日期已保存在本机');}catch(e){this.feedback(e instanceof Error?e.message:'见面日期保存失败','error');}finally{if(!this._destroyed)this.setData({busy:false});}},
    onToggle(event:WechatMiniprogram.SwitchChange){const field=String(event.currentTarget.dataset.field);if(['shareMood','privateEnabled'].includes(field))this.setData({[field]:event.detail.value});this.autosave();},
    persistMoment(){const d=this.data as ControllerData;writeLocal<MomentDraft>(fileKey('momentDraft'),{content:d.content,photo:d.photo,photo2:d.photo2,privateNote:d.privateNote,privateEnabled:d.privateEnabled,layout:d.layout,stamp:d.stamp,selectedTag:d.selectedTag,savedAt:Date.now()});},
    persistLetter(){const d=this.data as ControllerData;writeLocal<LetterDraft>(fileKey('letterDraft'),{title:d.letterTitle,content:d.content,paper:d.paper,delivery:d.delivery,openAt:d.openAt,savedAt:Date.now()});},
    feedback(message:string,kind='success',retry=''){this.setData({feedback:message,feedbackKind:kind,retry,feedbackToken:(this.data.feedbackToken||0)+1});},
    dismissFeedback(){this.setData({feedback:'',retry:''});},
    retryAction(){const action=this.data.retry;this.dismissFeedback();if(action)void this.perform(action,'');},
    onImageError(){if(!this._imageError){this._imageError=true;this.feedback('图片未加载成功，请重新选择照片或下拉刷新','error');}},
    onSettings(){void this.perform('settings','');},
    onAction(event:WechatMiniprogram.TouchEvent){void this.perform(String(event.currentTarget.dataset.action),String(event.currentTarget.dataset.value??''));},
    async commit(action:string,payload:Record<string,unknown>,local:()=>unknown){
      if(cloudMode){if(!this.data.bound)throw new Error('请先完成双人绑定');await writeGateway(action,payload,this._version);this._refreshing=false;this._generation++;this.setData({busy:false});await this.refresh();}
      else {local();this.refreshLocal();}
    },
    animateAffection(kind:string){if(this.data.soundEnabled&&typeof wx.createInnerAudioContext==='function'){const sound=wx.createInnerAudioContext();sound.src='/assets/affection.wav';sound.onEnded(()=>sound.destroy());sound.onError(()=>sound.destroy());sound.play();}if(!this.data.animationEnabled)return;const chosen=affectionOptions.find(a=>a.kind===kind);if(!chosen)return;if(this._affectionTimer)clearTimeout(this._affectionTimer);this.setData({affectionAnimating:false});this.setData({affectionAnimating:true,affectionAnimationSymbol:chosen.symbol,affectionAnimationLabel:chosen.label});this._affectionTimer=setTimeout(()=>{this._affectionTimer=undefined;if(!this._destroyed)this.setData({affectionAnimating:false});},1400);},
    async perform(action:string,value:string){
      if(action==='affection'&&this.data.affectionKind==='hug'){await this.perform('hug','');return;}
      if(this.data.busy)return;if(protectedActions.has(action))this.setData({busy:true});
      const d=this.data as ControllerData;
      try{
        if(await this.featureAction(action,value))return;
        switch(action){
          case 'refresh':if(cloudMode)await this.refresh();else {this.refreshLocal();this.feedback('本机数据已刷新');}break;
          case 'route':if(value in routes){const stack=getCurrentPages();if(key==='waiting'&&value==='editor'&&stack[stack.length-2]?.route===routes.editor.slice(1))back('moments');else go(value as RouteKey);}break;
          case 'back':back(['compose','locked','letter'].includes(key)?'mailbox':key==='editor'?'moments':'cabin');break;
          case 'dayNight':writeLocal(fileKey('daytime'),!d.daytime);this.setData({daytime:!d.daytime});break;
          case 'lamp':this.setData({lampOn:!d.lampOn});break;
          case 'hug':this.animateAffection('hug');await this.commit('hug',{},()=>updateSpace({hugs:readSpace().hugs+1,hugDay:dateString()}));wx.vibrateShort({type:'light',fail:()=>{}});this.feedback(cloudMode?'抱抱已送出' :'抱抱已记下');break;
          case 'chooseAffection':wx.showActionSheet({itemList:affectionOptions.map(a=>a.label),success:res=>{const chosen=affectionOptions[res.tapIndex];if(!chosen)return;try{writeLocal(fileKey('affectionKind'),chosen.kind);this.setData({affectionKind:chosen.kind});this.featureRefresh();}catch{this.feedback('动作选择未能保存，请重试','error');}}});break;
          case 'affection':{
            const chosen=affectionOptions.find(a=>a.kind===d.affectionKind);if(!chosen||chosen.kind==='hug')break;
            this.animateAffection(chosen.kind);await this.commit('affection',{kind:chosen.kind},()=>{const counts=readSpace().affectionCounts||{};updateSpace({affectionDay:dateString(),affectionCounts:{...counts,[chosen.kind]:(counts[chosen.kind]||0)+1}});});
            wx.vibrateShort({type:'light',fail:()=>{}});this.feedback(chosen.noun+(cloudMode?'已送出':'已记下'));break;
          }
          case 'wish':{const index=Number(value);if(!Number.isInteger(index)||index<0||index>=4)break;const wishes=[...d.wishes];wishes[index]=!wishes[index];await this.commit('wish',{index,done:wishes[index]},()=>updateSpace({wishes}));break;}
          case 'extraWish':{const row=d.extraWishes.find(w=>w.id===value);if(!row)break;await this.commit('extraWish',{id:value,done:!row.done},()=>writeLocal('extraWishes',d.extraWishes.map(w=>w.id===value?{...w,done:!w.done}:w)));break;}
          case 'deleteWish':this.confirmDelete('wish',value);break;
          case 'mood':if(['开心','平静','疲惫','想你','需要抱抱','想独处'].includes(value))this.setData({mood:value as Mood});break;
          case 'quickMood':this.setData({moodNote:value});break;
          case 'saveMood':if(!d.mood)throw new Error('请选择今天的心情');await this.commit('saveMood',{mood:d.mood,moodNote:d.moodNote,shareMood:d.shareMood},()=>updateSpace({mood:d.mood,moodNote:d.moodNote,shareMood:d.shareMood}));notify(cloudMode?'心情已保存到云端':'心情已保存在本机');back();break;
          
          case 'pairMode':this.setData({pairMode:value});break;
          case 'newCode':if(cloudMode){const result=await writeGateway<{inviteCode:string;pairState:string}>('createInvite',{},0);writeLocal(fileKey('inviteCode'),result.inviteCode||'');this.setData({inviteCode:result.inviteCode||'',pairState:result.pairState,pairMode:'create'});}else throw new Error('尚未连接云服务，暂时无法生成绑定密令');break;
          case 'copyCode':if(d.inviteCode)wx.setClipboardData({data:d.inviteCode,success:()=>notify('密令已复制，请发给对方'),fail:()=>this.feedback('未能复制，请重试','error')});else this.feedback('请先点刷新图标生成密令','error');break;
          case 'join':if(cloudMode){await writeGateway('joinInvite',{code:d.inviteInput.trim().toUpperCase()},0);this.feedback('申请已提交，等待对方确认；可下拉刷新');}else throw new Error('尚未连接云服务，暂时无法绑定另一半');break;
          case 'reject':case 'accept':if(cloudMode){const result=await writeGateway<{pairState:string}>(action==='accept'?'acceptInvite':'rejectInvite',{},0);this.setData({pairState:result.pairState});}else throw new Error('尚未连接云服务，暂时无法确认绑定');break;
          case 'profile':go('profile');break;
          case 'retryJoin':this.setData({pairState:'waiting',pairMode:'join'});break;
          case 'cabinSuggestion':this.setData({cabinName:value});break;
          case 'saveProfile':{
            if(!d.mine.trim()||!d.partner.trim()||!d.cabinName.trim())throw new Error('请填写双方昵称和小屋名称');
            if(dayNumber(d.anniversary)===null||d.anniversary>dateString())throw new Error('请选择不晚于今天的有效纪念日');
            if(d.firstMet&&(dayNumber(d.firstMet)===null||d.firstMet>dateString()))throw new Error('请选择不晚于今天的相识日期');
            const profile={firstMet:d.firstMet,customHundredDate:d.customHundredDate,customYearDate:d.customYearDate,mine:d.mine.trim(),partner:d.partner.trim(),cabinName:d.cabinName.trim(),anniversary:d.anniversary,avatarMine:d.avatar0,avatarPartner:d.avatar1};
            const payload={...profile,avatarMine:this._avatarIds?.[0]||'',avatarPartner:this._avatarIds?.[1]||''};
            await this.commit('saveProfile',payload,()=>updateSpace({profile}));notify(cloudMode?'小屋资料已保存到云端':'小屋资料已保存在本机');go('cabin');break;
          }
          case 'avatar':if(['0','1'].includes(value))this.choosePhoto('avatar'+value);break;
          case 'photo':case 'photo2':this.choosePhoto(action);break;
          case 'layout':this.setData({layout:d.layout==='双图并排'?'上下拼贴':'双图并排'});this.persistMoment();break;
          case 'stamp':this.setData({stamp:value});this.persistMoment();break;

          case 'saveMoment':this.persistMoment();this.feedback('草稿已保存到本机');break;
          case 'publishMoment':{
            if(!d.content.trim()||!d.photo)throw new Error('请添加照片并写下一点今天的记忆');this.persistMoment();
            const content=(d.content.trim()+(d.selectedTag?' '+d.selectedTag:''));if(content.length>300)throw new Error('正文和标签合计不能超过300字');
            let photos=[d.photo,d.photo2].filter(Boolean);if(cloudMode)photos=await Promise.all(photos.map(path=>this.uploadPhoto(path)));
            await this.commit('publishMoment',{content,photos,privateNote:d.privateNote,privateEnabled:d.privateEnabled,stamp:d.stamp},()=>{const rows=localRecords('moments'),existing=rows.find(r=>r.dayKey===dateString()&&r.mine);const row={id:existing?.id||unique(),mine:true,createdAt:existing?.createdAt||Date.now(),dayKey:dateString(),content,photos,stamp:d.stamp,privateNote:d.privateEnabled?d.privateNote:''};writeLocal('moments',[row,...rows.filter(r=>r.id!==row.id)]);});go('waiting');break;
          }
          case 'mailTab':this.setData({mailTab:value});this.filterRecords();break;
          case 'paper':if(['0','1','2'].includes(value)){this.setData({paper:Number(value)});this.persistLetter();}break;
          case 'delivery':if(value==='now'||value==='future'){this.setData({delivery:value});this.persistLetter();}break;
          case 'sticker':this.setData({content:d.content+' 🌸'});this.persistLetter();break;
          case 'saveLetter':this.persistLetter();this.feedback('信件草稿已保存在本机');break;
          case 'sendLetter':{
            if(!d.letterTitle.trim()||!d.content.trim())throw new Error('请填写信件标题和正文');if(d.delivery==='future'&&(dayNumber(d.openAt)===null||d.openAt<=dateString()))throw new Error('请选择今天之后的有效启封日期');
            this.persistLetter();const signature=JSON.stringify([d.letterTitle,d.content,d.delivery,d.openAt]);if(this._sentSignature===signature){this.feedback('这封信已寄出，请修改内容后再寄');break;}
            await this.commit('sendLetter',{title:d.letterTitle,content:d.content,delivery:d.delivery,openAt:d.openAt,paper:d.paper},()=>{writeLocal('letters',[{id:unique(),mine:true,createdAt:Date.now(),title:d.letterTitle,content:d.content,openAt:d.delivery==='now'?Date.now():new Date(d.openAt+'T00:00:00').getTime(),paper:d.paper,locked:false},...localRecords('letters')]);});this._sentSignature=signature;this.feedback(cloudMode?'信件已寄出，在约定日期启封':'信件已在本机封缄，尚未投递给对方');break;
          }
          case 'openLetter':{const row=d.letters.find(r=>r.id===value);if(row)go(row.locked?'locked':'letter','?id='+encodeURIComponent(row.id));break;}
          case 'heartbeat':wx.vibrateShort({type:'light',fail:()=>{}});this.feedback('指尖轻抚 · 仅在本机感受心跳');break;
          case 'favoriteLetter':case 'favoriteMoment':{
            const id=action==='favoriteLetter'?d.recordId:value;if(!id){this.feedback('这是设计示例，不能珍藏为真实记录');break;}
            await this.commit('favorite',{collection:action==='favoriteLetter'?'letters_meta':'moments',id},()=>{const space=readSpace();updateSpace({favorites:space.favorites.includes(id)?space.favorites.filter(x=>x!==id):[...space.favorites,id]});});this.feedback('珍藏状态已更新');break;
          }
          case 'previewMoment':{const row=d.moments.find(r=>r.id===value);if(!row){this.feedback('这张卡片是设计示例，请先发布自己的记录');break;}let note=row.privateNote||'';if(cloudMode){const detail=await callGateway<{privateNote:string;privateLocked:boolean}>('readMoment',{id:row.id});note=detail.privateLocked?'等双方都记录今天后再开启悄悄话':detail.privateNote;}wx.showModal({title:'这一刻的日常',content:(row.content||'')+(note?'\n\n悄悄话：'+note:''),showCancel:true,cancelText:'关闭',confirmText:'查看照片',success:r=>{if(r.confirm&&row.photos?.length)wx.previewImage({urls:row.photos,current:row.photos[0],fail:()=>this.feedback('照片预览失败','error')});}});break;}
          case 'photos':this.previewPhotos();break;
          case 'previewDraft':{const urls=[d.photo,d.photo2].filter(Boolean);if(urls.length)wx.previewImage({urls,current:urls[0],fail:()=>this.feedback('照片预览失败','error')});break;}
          case 'month':{const months=['全部记录',...Array.from(new Set(d.moments.map(r=>r.dayKey?.slice(0,7)||'').filter(Boolean)))].slice(0,6);wx.showActionSheet({itemList:months,success:r=>{this.setData({monthFilter:months[r.tapIndex]});this.filterRecords();}});break;}
          case 'storyDetail':{const row=d.stories.find(r=>r.id===value);if(row)wx.showModal({title:'我们的回忆',content:row.content||'',showCancel:false});break;}
          
          case 'moreHistory':this.setData({moreHistory:!d.moreHistory});this.filterRecords();break;
          case 'loadMore':await this.loadMore();break;
          case 'deleteRecord':this.confirmDelete(value.split(':')[0],value.split(':')[1]);break;
          default:this.feedback('这个入口尚未开发完成');
        }
      }catch(error){this.feedback(error instanceof Error?error.message:'操作未完成，请重试','error',action==='sendLetter'||action==='publishMoment'?action:'');if(error instanceof GatewayError&&error.code==='CONFLICT'){this.setData({busy:false});await this.refresh();}}
      finally{if(!this._destroyed){this.setData({busy:false});this.getTabBar?.()?.setData({editorOpen:!!this.data.editorKind});}}
    },
    editText(title:string,content:string,action:string){wx.showModal({title,editable:true,content,placeholderText:'留下一句温柔的话',success:r=>{if(r.confirm&&r.content?.trim()){void this.saveText(action,r.content.trim());}}});},
    async saveText(action:string,value:string){if(this.data.busy)return;this.setData({busy:true});try{const d=this.data as ControllerData;if(value.length>(action==='addWish'?200:action==='story'?2000:1000))throw new Error('内容太长，请精简后保存');await this.commit(action,action==='note'?{note:value}:action==='addWish'?{text:value}:{content:value},()=>{if(action==='note')updateSpace({note:value});else if(action==='addWish')writeLocal('extraWishes',[...d.extraWishes,{id:unique(),text:value,done:false}]);else writeLocal('stories',[{id:unique(),mine:true,createdAt:Date.now(),content:value},...localRecords('stories')]);});this.feedback(cloudMode?'已保存到共同的小屋':'已保存在本机');}catch(error){this.feedback(error instanceof Error?error.message:'保存未完成','error');}finally{if(!this._destroyed)this.setData({busy:false});}},
    confirmDelete(collection:string,id:string){if(!id)return;wx.showModal({title:'删除这条记录？',content:'删除后将从共同列表中移除。',success:r=>{if(r.confirm)void this.removeRecord(collection,id);}});},
    async removeRecord(collection:string,id:string){if(this.data.busy)return;this.setData({busy:true});try{await this.commit(collection==='wish'?'deleteWish':'deleteRecord',collection==='wish'?{id}:{collection,id},()=>{if(collection==='wish')writeLocal('extraWishes',this.data.extraWishes.filter((w:Wish)=>w.id!==id));else{const storage=collection==='letters_meta'?'letters':collection;if(id==='legacy-story')writeLocal('legacyStoryHidden',true);writeLocal(storage,localRecords(storage).filter(r=>r.id!==id));}});this.feedback('记录已移除');}catch(error){this.feedback(error instanceof Error?error.message:'删除未完成','error');}finally{if(!this._destroyed)this.setData({busy:false});}},
    async loadMore(){if(!cloudMode){this.setData({moreHistory:true});this.filterRecords();return;}const collection=key==='moments'?'moments':key==='mailbox'?'letters_meta':'stories';const field=collection==='letters_meta'?'letters':collection;const rows=this.data[field as 'moments'|'letters'|'stories'];const result=await callGateway<RecordItem[]>('list',{collection,offset:rows.length});if(collection==='moments'||collection==='stories'){for(const row of result){row.photoIds=row.photos||[];row.photos=await Promise.all((row.photos||[]).map(async id=>(await callGateway<{url:string}>('fileUrl',{id})).url));}}this.setData({[field]:[...rows,...result.filter(r=>!rows.some((old:RecordItem)=>old.id===r.id))],moreHistory:true});this.filterRecords();this.setData({hasMore:result.length===10});},
    async uploadPhoto(path:string):Promise<string>{
      if(!environment.storageEnabled)throw new Error('暂时无法上传照片，请稍后重试');
      const fs=wx.getFileSystemManager();
      const sizeOf=(filePath:string)=>new Promise<number>((resolve,reject)=>fs.getFileInfo({filePath,success:r=>resolve(r.size),fail:reject}));
      let uploadPath=path,size=await sizeOf(uploadPath);
      if(size>1024*1024){
        for(const [quality,width] of [[82,1920],[70,1280],[55,960]]){
          const result=await new Promise<WechatMiniprogram.CompressImageSuccessCallbackResult>((resolve,reject)=>wx.compressImage({src:path,quality,compressedWidth:width,success:resolve,fail:reject}));
          uploadPath=result.tempFilePath;size=await sizeOf(uploadPath);if(size<=1024*1024)break;
        }
      }
      if(size>1024*1024)throw new Error('照片处理后仍然过大，请裁剪后重试');
      const base64=await new Promise<string>((resolve,reject)=>fs.readFile({filePath:uploadPath,encoding:'base64',success:r=>resolve(r.data as string),fail:reject}));
      return (await callGateway<{id:string}>('upload',{base64})).id;
    },
    choosePhoto(field:string){wx.chooseMedia({count:1,mediaType:['image'],sourceType:['album','camera'],sizeType:['compressed'],success:r=>{const file=r.tempFiles[0];if(!file?.tempFilePath)return;wx.getFileSystemManager().saveFile({tempFilePath:file.tempFilePath,success:s=>{void this.acceptPhoto(field,s.savedFilePath);},fail:()=>this.feedback('照片未能保存，请重试','error')});},fail:r=>{if(!r.errMsg.includes('cancel'))this.feedback('未能选择照片，请检查相册授权','error');}});},
    async acceptPhoto(field:string,path:string){try{if(cloudMode&&field.startsWith('avatar')){const id=await this.uploadPhoto(path);this._avatarIds=this._avatarIds||['',''];this._avatarIds[Number(field.slice(-1))]=id;}this.setData({[field]:path});if(key==='editor')this.persistMoment();if(field==='storyPhoto'){this._storyPhotoId='';this.persistStory();}}catch(error){this.feedback(error instanceof Error?error.message:'照片保存失败','error');}},
    previewPhotos(){const urls=this.data.moments.flatMap((r:RecordItem)=>r.photos||[]);if(urls.length)wx.previewImage({urls,current:urls[0]});else this.feedback('还没有自己的照片，去记录今天吧');},
  };
}

