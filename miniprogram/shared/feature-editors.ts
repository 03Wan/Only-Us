import { readLocal, writeLocal, updateSpace, readSpace, clearLocalData } from '../services/local-store';
import { dateString, dayNumber } from './dates';
import { environment } from '../config/env';
import { writeGateway } from '../services/cloud';
import type { RecordItem, Ticket, Wish, Note } from '../types/domain';
import type { AffectionKind } from '../types/domain';
import { affectionOptions } from './affection';
import { moodEmoji } from './moods';

export const emptyTicket = ():Ticket => ({train:'',from:'',to:'',date:dateString(),departure:'',arrival:'',arrivalDate:dateString(),seat:'',status:'待购票'});
export const featureData = {editorKind:'',settingsSection:'menu',settingsScrollTop:0,moodEmoji:'',partnerMoodKind:'',partnerMoodEmoji:'',firstMet:'',customHundredDate:'',customYearDate:'',affectionKind:'hug',affectionLabel:'轻轻抱一下',affectionNoun:'抱抱',affectionSymbol:'♡',affectionCount:0,affectionCounts:{} as Partial<Record<AffectionKind,number>>,feedbackToken:0,noteDraft:'',noteCategory:'未分类',noteCategoryCustom:false,noteCategoryIndex:0,noteCategoryOptions:['未分类','自定义分类…'] as string[],noteFilter:'全部',notes:[] as Note[],visibleNotes:[] as Note[],noteCategories:[] as string[],tagDraft:'',tagOptions:['#想你的瞬间','#工作间隙','#今日午餐','#路过的晚霞'],editId:'',storyTitle:'',storyContent:'',storyDate:dateString(),storyLocation:'',storyWeather:'',storyCaption:'',storyPhoto:'',wishText:'',wishNote:'',wishRows:[] as Wish[],wishTotal:0,ticket:null as Ticket|null,ticketForm:emptyTicket(),ticketDuration:'',wishDetails:{} as Record<string,{text:string;note:string}>};
const defaultNoteCategories=['未分类','日常','约定','提醒','纪念日','心情'];
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
  featureField(this:any,e:WechatMiniprogram.Input){const field=String(e.currentTarget.dataset.field);if(!['storyTitle','storyContent','storyLocation','storyWeather','storyCaption','wishText','wishNote','noteDraft','noteCategory','tagDraft','train','from','to','seat'].includes(field))return;this.setData({[this.data.editorKind==='ticket'?'ticketForm.'+field:field]:field==='tagDraft'?e.detail.value.replace(/^#+/,''):e.detail.value});if(this.data.editorKind==='story')this.persistStory();},
  noteCategoryChange(this:any,e:WechatMiniprogram.PickerChange){const index=Number(e.detail.value),options=this.data.noteCategoryOptions;if(!Number.isInteger(index)||index<0||index>=options.length)return;const custom=index===options.length-1;this.setData({noteCategoryIndex:index,noteCategoryCustom:custom,noteCategory:custom?'':options[index]});},
  featureDate(this:any,e:WechatMiniprogram.PickerChange){const field=String(e.currentTarget.dataset.field),value=String(e.detail.value);if(this.data.editorKind==='story'&&field==='storyDate'){this.setData({storyDate:value});this.persistStory();}else if(this.data.editorKind==='ticket'&&['date','arrivalDate','departure','arrival'].includes(field)){const patch:any={['ticketForm.'+field]:value};if(field==='date'&&this.data.ticketForm.arrivalDate<this.data.ticketForm.date)patch['ticketForm.arrivalDate']=value;else if(field==='date'&&this.data.ticketForm.arrivalDate===this.data.ticketForm.date)patch['ticketForm.arrivalDate']=value;this.setData(patch);}},
  persistStory(this:any){const d=this.data;writeLocal(draftKey(),{editId:d.editId,storyTitle:d.storyTitle,storyContent:d.storyContent,storyDate:d.storyDate,storyLocation:d.storyLocation,storyWeather:d.storyWeather,storyCaption:d.storyCaption,storyPhoto:d.storyPhoto,photoId:this._storyPhotoId||''});},
  openStory(this:any,recordId=''){const row=this.data.stories.find((r:RecordItem)=>r.id===recordId);if(recordId&&(!row||!row.mine))return;const draft=readLocal<any>(draftKey(),null);if(!recordId&&draft&&!draft.editId){this._storyPhotoId=draft.photoId||'';this.setData({...draft,editorKind:'story'});return;}this._storyPhotoId=row?.photoIds?.[0]||'';this.setData({editorKind:'story',editId:recordId,storyTitle:row?.title||'',storyContent:row?.content||'',storyDate:row?.dayKey||dateString(),storyLocation:row?.location||'',storyWeather:row?.weather||'',storyCaption:row?.caption||'',storyPhoto:row?.photos?.[0]||''});},
  featureRefresh(this:any){const d=this.data;const rows:Wish[]=d.extraWishes;let duration='';if(d.ticket){const t=d.ticket;const minutes=(Date.parse(t.arrivalDate+'T'+t.arrival+':00+08:00')-Date.parse(t.date+'T'+t.departure+':00+08:00'))/60000;if(Number.isFinite(minutes)&&minutes>0)duration=`${Math.floor(minutes/60)}小时${minutes%60?minutes%60+'分':''}`;}const chosen=affectionOptions.find(a=>a.kind===d.affectionKind)||affectionOptions[0];const categories=Array.from(new Set((d.notes as Note[]).map(n=>n.category)));const filter=d.noteFilter==='全部'||categories.includes(d.noteFilter)?d.noteFilter:'全部';this.setData({noteCategories:categories,noteFilter:filter,visibleNotes:filter==='全部'?d.notes:d.notes.filter((n:Note)=>n.category===filter),wishRows:rows,wishCount:rows.filter(w=>w.done).length,wishTotal:rows.length,ticketDuration:duration,moodEmoji:moodEmoji(d.mood),partnerMoodEmoji:moodEmoji(d.partnerMoodKind),affectionLabel:chosen.label,affectionNoun:chosen.noun,affectionSymbol:chosen.symbol,affectionCount:chosen.kind==='hug'?d.hugs:(d.affectionCounts[chosen.kind]||0)});},
  async featureAction(this:any,action:string,value:string):Promise<boolean>{
    const d=this.data;
    if(['story','editStory','addWish','editWish','ticket','settings','note','tag'].includes(action))this.dismissFeedback();
    switch(action){
      case 'note':case 'editNote':{const row=d.notes.find((n:Note)=>n.id===value),category=row?.category||'未分类',options=[...defaultNoteCategories,...d.noteCategories.filter((c:string)=>!defaultNoteCategories.includes(c)),'自定义分类…'];this.setData({editorKind:'note',editId:row?.id||'',noteDraft:row?.content||'',noteCategory:category,noteCategoryOptions:options,noteCategoryIndex:Math.max(0,options.indexOf(category)),noteCategoryCustom:false});return true;}
      case 'filterNotes':this.setData({noteFilter:value});this.featureRefresh();return true;
      case 'deleteNote':case 'deleteNoteCategory':case 'deleteTicket':{const title=action==='deleteTicket'?'删除这张车票？':action==='deleteNoteCategory'?'删除分类？':'删除这条便签？';wx.showModal({title,content:action==='deleteNoteCategory'?'该分类下的便签将移至未分类。':action==='deleteTicket'?'见面日期会保留。':'删除后无法恢复。',success:(res)=>{if(res.confirm)void this.perform(action+'Confirmed',value);}});return true;}
      case 'deleteNoteConfirmed':case 'deleteNoteCategoryConfirmed':case 'deleteTicketConfirmed':{this.setData({busy:true});try{if(action==='deleteTicketConfirmed')await this.commit('deleteTicket',{},()=>updateSpace({ticket:null}));else if(action==='deleteNoteConfirmed')await this.commit('deleteNote',{id:value},()=>{const notes=d.notes.filter((n:Note)=>n.id!==value);updateSpace({notes,note:notes[0]?.content||''});});else await this.commit('deleteNoteCategory',{category:value},()=>updateSpace({notes:d.notes.map((n:Note)=>n.category===value?{...n,category:'未分类'}:n)}));this.feedback('已删除');}finally{if(!this._destroyed)this.setData({busy:false});}return true;}

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
      case 'unlink':if(d.cloudMode&&d.bound)wx.showModal({title:'解除双人连接？',content:'原共同空间的数据会保留，双方将失去访问权限；已获取的临时照片链接最多约 5 分钟后失效。解除后可重新连接。',confirmText:'解除连接',confirmColor:'#b24f60',success:(res)=>{if(res.confirm)void this.perform('unlinkConfirmed','');}});return true;
      case 'unlinkConfirmed':if(!d.cloudMode||!d.bound)return true;this.setData({busy:true});try{await writeGateway('unlink',{},this._version);this._generation++;this._refreshing=false;this.clearSharedData();this.setData({syncLabel:'连接已解除',pairState:'waiting'});this.feedback('双人连接已解除');}finally{if(!this._destroyed)this.setData({busy:false});}return true;
      case 'clearLocalData':wx.showModal({title:'清除本机数据？',content:'将删除本机模式的资料、记录、草稿及仅供其使用的关联照片，不会删除云端记录。历史缓存文件可能保留，此操作无法撤销。',confirmText:'清除本机',confirmColor:'#b24f60',success:(res)=>{if(res.confirm)void this.perform('clearLocalDataConfirmed','');}});return true;
      case 'clearLocalDataConfirmed':this.setData({busy:true});try{const failures=await clearLocalData();wx.showModal({title:failures?'记录已清除，部分照片未删除':'本机数据已清除',content:failures?`${failures} 张关联照片未能删除，可在微信存储管理中清理。`:'本机记录及可识别的专用关联照片已清除；历史缓存文件可能保留，云端数据不受影响。',showCancel:false,success:()=>wx.reLaunch({url:'/pages/cabin/index'})});}finally{if(!this._destroyed)this.setData({busy:false});}return true;
      case 'settings':this.setData({editorKind:'settings',settingsSection:'menu',settingsScrollTop:0});return true;
      case 'settingsInfo':if(['menu','privacy','about','account'].includes(value))this.setData({settingsSection:value,settingsScrollTop:this.data.settingsScrollTop===0?1:0});return true;
      case 'copyProjectUrl':wx.setClipboardData({data:'https://github.com/03Wan/Only-Us',success:()=>this.feedback('项目地址已复制')});return true;
      case 'settingsRoute':this.setData({editorKind:''});await this.perform('route',value);return true;
      case 'saveFeature':break;
      default:return false;
    }
    this.setData({busy:true});
    try{
      if(d.editorKind==='note'){
        const content=d.noteDraft.trim(),category=d.noteCategory.trim()||'未分类';if(d.noteCategoryCustom&&!d.noteCategory.trim())throw new Error('请输入自定义分类');if(!content)throw new Error('请填写便签内容');if(content.length>1000||category.length>20)throw new Error('便签最多1000字，分类最多20字');
        await this.commit('saveNote',{id:d.editId,content,category},()=>{if(!d.editId&&d.notes.length>=100)throw new Error('便签已满100条');const notes=d.editId?d.notes.map((n:Note)=>n.id===d.editId?{...n,content,category}:n):[{id:id(),content,category},...d.notes];updateSpace({notes,note:notes[0]?.content||''});});
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
