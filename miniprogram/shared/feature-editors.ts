import { readLocal, writeLocal, updateSpace, readSpace } from '../services/local-store';
import { dateString, dayNumber } from './dates';
import { environment } from '../config/env';
import type { RecordItem, Ticket, Wish } from '../types/domain';
import type { AffectionKind } from '../types/domain';
import { affectionOptions } from './affection';
import { moodEmoji } from './moods';

export const emptyTicket = ():Ticket => ({train:'',from:'',to:'',date:dateString(),departure:'',arrival:'',arrivalDate:dateString(),seat:'',status:'待购票'});
export const featureData = {editorKind:'',settingsSection:'menu',settingsScrollTop:0,moodEmoji:'',partnerMoodKind:'',partnerMoodEmoji:'',firstMet:'',customHundredDate:'',customYearDate:'',affectionKind:'hug',affectionLabel:'轻轻抱一下',affectionNoun:'抱抱',affectionSymbol:'♡',affectionCount:0,affectionCounts:{} as Partial<Record<AffectionKind,number>>,feedbackToken:0,noteDraft:'',tagDraft:'',tagOptions:['#想你的瞬间','#工作间隙','#今日午餐','#路过的晚霞'],editId:'',storyTitle:'',storyContent:'',storyDate:dateString(),storyLocation:'',storyWeather:'',storyCaption:'',storyPhoto:'',wishText:'',wishNote:'',wishRows:[] as Wish[],wishTotal:0,ticket:null as Ticket|null,ticketForm:emptyTicket(),ticketDuration:'',wishDetails:{} as Record<string,{text:string;note:string}>};
const draftKey=()=>environment.mode==='cloud'?`cloud:${environment.cloudEnvId}:storyDraft`:'storyDraft';
const id=()=>`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

// These editors use the same commit/refresh path as the existing native pages.
export const featureMethods = {
  stopFeatureTouch(){},
  async saveFirstMet(this:any,date:string){await this.saveMilestone('firstMet',date);},
  async saveMilestone(this:any,field:string,date:string){
    const fields:Record<string,string>={firstMet:'firstMet',anniversary:'anniversary',hundredDate:'customHundredDate',yearDate:'customYearDate'};
    const labels:Record<string,string>={firstMet:'相识日期',anniversary:'相恋纪念日',hundredDate:'百天纪念日',yearDate:'周年纪念日'};
    if(this.data.busy||!fields[field])return;
    if(dayNumber(date)===null||(['firstMet','anniversary'].includes(field)&&date>dateString())){this.feedback('请选择有效日期，相识和相恋日期不能晚于今天','error');return;}
    this.setData({busy:true});
    try{await this.commit(field==='firstMet'?'firstMet':'milestoneDate',field==='firstMet'?{date}:{field,date},()=>updateSpace({profile:{...readSpace().profile,[fields[field]]:date}}));this.feedback(labels[field]+'已保存');}
    catch(error){this.feedback(error instanceof Error?error.message:'日期保存失败','error');}
    finally{if(!this._destroyed)this.setData({busy:false});}
  },
  featureField(this:any,e:WechatMiniprogram.Input){const field=String(e.currentTarget.dataset.field);if(!['storyTitle','storyContent','storyLocation','storyWeather','storyCaption','wishText','wishNote','noteDraft','tagDraft','train','from','to','seat'].includes(field))return;this.setData({[this.data.editorKind==='ticket'?'ticketForm.'+field:field]:field==='tagDraft'?e.detail.value.replace(/^#+/,''):e.detail.value});if(this.data.editorKind==='story')this.persistStory();},
  featureDate(this:any,e:WechatMiniprogram.PickerChange){const field=String(e.currentTarget.dataset.field),value=String(e.detail.value);if(this.data.editorKind==='story'&&field==='storyDate'){this.setData({storyDate:value});this.persistStory();}else if(this.data.editorKind==='ticket'&&['date','arrivalDate','departure','arrival'].includes(field)){const patch:any={['ticketForm.'+field]:value};if(field==='date'&&this.data.ticketForm.arrivalDate<this.data.ticketForm.date)patch['ticketForm.arrivalDate']=value;else if(field==='date'&&this.data.ticketForm.arrivalDate===this.data.ticketForm.date)patch['ticketForm.arrivalDate']=value;this.setData(patch);}},
  persistStory(this:any){const d=this.data;writeLocal(draftKey(),{editId:d.editId,storyTitle:d.storyTitle,storyContent:d.storyContent,storyDate:d.storyDate,storyLocation:d.storyLocation,storyWeather:d.storyWeather,storyCaption:d.storyCaption,storyPhoto:d.storyPhoto,photoId:this._storyPhotoId||''});},
  openStory(this:any,recordId=''){const row=this.data.stories.find((r:RecordItem)=>r.id===recordId);if(recordId&&(!row||!row.mine))return;const draft=readLocal<any>(draftKey(),null);if(!recordId&&draft&&!draft.editId){this._storyPhotoId=draft.photoId||'';this.setData({...draft,editorKind:'story'});return;}this._storyPhotoId=row?.photoIds?.[0]||'';this.setData({editorKind:'story',editId:recordId,storyTitle:row?.title||'',storyContent:row?.content||'',storyDate:row?.dayKey||dateString(),storyLocation:row?.location||'',storyWeather:row?.weather||'',storyCaption:row?.caption||'',storyPhoto:row?.photos?.[0]||''});},
  featureRefresh(this:any){const d=this.data;const rows:Wish[]=d.extraWishes;let duration='';if(d.ticket){const t=d.ticket;const minutes=(Date.parse(t.arrivalDate+'T'+t.arrival+':00+08:00')-Date.parse(t.date+'T'+t.departure+':00+08:00'))/60000;if(Number.isFinite(minutes)&&minutes>0)duration=`${Math.floor(minutes/60)}小时${minutes%60?minutes%60+'分':''}`;}const chosen=affectionOptions.find(a=>a.kind===d.affectionKind)||affectionOptions[0];this.setData({wishRows:rows,wishCount:rows.filter(w=>w.done).length,wishTotal:rows.length,ticketDuration:duration,moodEmoji:moodEmoji(d.mood),partnerMoodEmoji:moodEmoji(d.partnerMoodKind),affectionLabel:chosen.label,affectionNoun:chosen.noun,affectionSymbol:chosen.symbol,affectionCount:chosen.kind==='hug'?d.hugs:(d.affectionCounts[chosen.kind]||0)});},
  async featureAction(this:any,action:string,value:string):Promise<boolean>{
    const d=this.data;
    if(['story','editStory','addWish','editWish','ticket','settings','note','tag'].includes(action))this.dismissFeedback();
    switch(action){
      case 'note':this.setData({editorKind:'note',noteDraft:d.note});return true;
      case 'tag':this.setData({editorKind:'tag',tagDraft:d.selectedTag.replace(/^#+/,'')});return true;
      case 'pickTag':this.setData({tagDraft:value.replace(/^#+/,'')});return true;
      case 'clearTag':this.setData({tagDraft:''});return true;
      case 'story':case 'editStory':this.openStory(value);return true;
      case 'closeEditor':if(d.editorKind==='story')this.persistStory();this.setData({editorKind:''});return true;
      case 'storyPhoto':this.choosePhoto('storyPhoto');return true;
      case 'removeStoryPhoto':this._storyPhotoId='';this.setData({storyPhoto:''});this.persistStory();return true;
      case 'previewStory':{const row=d.stories.find((r:RecordItem)=>r.id===value);if(row?.photos?.length)wx.previewImage({urls:row.photos,current:row.photos[0]});return true;}
      case 'addWish':case 'editWish':{const row=d.wishRows.find((w:Wish)=>w.id===value);this.setData({editorKind:'wish',editId:action==='addWish'?'':value,wishText:row?.text||'',wishNote:row?.note||''});return true;}
      case 'toggleWish':await this.perform('extraWish',value);return true;
      case 'ticket':this.setData({editorKind:'ticket',ticketForm:{...emptyTicket(),date:d.meetingDate||dateString(),arrivalDate:d.meetingDate||dateString(),...d.ticket}});return true;
      case 'ticketStatus':this.setData({'ticketForm.status':value});return true;
      case 'settings':this.setData({editorKind:'settings',settingsSection:'menu',settingsScrollTop:0});return true;
      case 'settingsInfo':if(['menu','privacy','about'].includes(value))this.setData({settingsSection:value,settingsScrollTop:this.data.settingsScrollTop===0?1:0});return true;
      case 'copyProjectUrl':wx.setClipboardData({data:'https://github.com/03Wan/Only-Us',success:()=>this.feedback('项目地址已复制')});return true;
      case 'settingsRoute':this.setData({editorKind:''});await this.perform('route',value);return true;
      case 'saveFeature':break;
      default:return false;
    }
    this.setData({busy:true});
    try{
      if(d.editorKind==='note'){
        if(d.noteDraft.length>1000)throw new Error('便签最多写1000字');
        await this.commit('note',{note:d.noteDraft.trim()},()=>updateSpace({note:d.noteDraft.trim()}));
      }else if(d.editorKind==='tag'){
        const text=d.tagDraft.trim().replace(/^#+/,'').trim();if(text.length>20)throw new Error('标签最多20字');
        this.setData({selectedTag:text?'#'+text:''});this.persistMoment();
      }else if(d.editorKind==='story'){
        if(!d.storyTitle.trim()||!d.storyContent.trim())throw new Error('请填写故事标题和正文');
        if(d.storyTitle.trim().length>80||d.storyContent.trim().length>2000||d.storyLocation.length>60||d.storyWeather.length>16||d.storyCaption.length>120)throw new Error('内容太长，请精简后保存');
        if(dayNumber(d.storyDate)===null||d.storyDate>dateString())throw new Error('请选择不晚于今天的故事日期');
        this.persistStory();let photos=d.storyPhoto?[d.storyPhoto]:[];
        if(d.cloudMode&&photos.length)photos=[this._storyPhotoId||await this.uploadPhoto(d.storyPhoto)];
        const payload={id:d.editId,title:d.storyTitle.trim(),content:d.storyContent.trim(),dayKey:d.storyDate,location:d.storyLocation.trim(),weather:d.storyWeather.trim(),caption:d.storyCaption.trim(),photos};
        await this.commit(d.editId?'editStory':'story',payload,()=>{const rows=readLocal<RecordItem[]>('stories',[]),old=this.data.stories.find((r:RecordItem)=>r.id===d.editId);if(d.editId&&(!old||!old.mine))throw new Error('故事已删除，请刷新');if(d.editId==='legacy-story')writeLocal('legacyStoryHidden',true);const row={...payload,id:d.editId||id(),mine:true,createdAt:old?.createdAt||Date.now()};writeLocal('stories',[row,...rows.filter(r=>r.id!==row.id)]);});
        writeLocal(draftKey(),null);
      }else if(d.editorKind==='wish'){
        if(!d.wishText.trim())throw new Error('写下一件想一起做的事吧');
        if(d.wishText.trim().length>200||d.wishNote.length>120)throw new Error('心愿标题限200字，备注限120字');
        const payload={id:d.editId,text:d.wishText.trim(),note:d.wishNote.trim()};
        await this.commit(d.editId?'editWish':'addWish',payload,()=>{{if(!d.editId&&d.extraWishes.length>=100)throw new Error('心愿已满100条，请先整理');writeLocal('extraWishes',d.editId?d.extraWishes.map((w:Wish)=>w.id===d.editId?{...w,...payload}:w):[...d.extraWishes,{...payload,id:id(),done:false}]);}});
      }else if(d.editorKind==='ticket'){
        const t:Ticket={...d.ticketForm,train:d.ticketForm.train.trim(),from:d.ticketForm.from.trim(),to:d.ticketForm.to.trim(),seat:d.ticketForm.seat.trim()};
        if(!t.train||!t.from||!t.to)throw new Error('请填写车次、出发站和到达站');
        if(t.train.length>20||t.from.length>30||t.to.length>30||t.seat.length>60)throw new Error('车次或车站、座位信息过长');
        if(!['待购票','已出票','已相聚'].includes(t.status)||dayNumber(t.date)===null||dayNumber(t.arrivalDate)===null||![t.departure,t.arrival].every(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x)))throw new Error('请检查出发和到达日期、时间');
        if(Date.parse(t.arrivalDate+'T'+t.arrival+':00+08:00')<=Date.parse(t.date+'T'+t.departure+':00+08:00'))throw new Error('到达时间需晚于出发时间，跨天请选择到达日期');
        await this.commit('ticket',t as unknown as Record<string,unknown>,()=>updateSpace({ticket:t,meetingDate:t.arrivalDate}));
      }else return true;
      const savedKind=d.editorKind;this.setData({editorKind:''});this.feedback(savedKind==='tag'?'标签已更新':savedKind==='note'?'便签已保存':d.cloudMode?'已保存到共同的小屋':'已保存在本机');
    }finally{if(!this._destroyed)this.setData({busy:false});}
    return true;
  },
};
