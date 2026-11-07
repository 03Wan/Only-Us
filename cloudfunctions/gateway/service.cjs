'use strict';
const crypto=require('node:crypto');
const {AccessError,requireIdentity,requireSpace,requireOwnedRecord,canReadLetterBody}=require('./auth.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=code=>{throw new AccessError(code);};
const text=(s,max,optional=false)=>{if(typeof s!=='string'||s.length>max||(!optional&&!s.trim()))fail('INVALID_INPUT');return s.trim();};
const day=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('INVALID_DATE');const n=Date.parse(value+'T00:00:00+08:00');if(!Number.isFinite(n)||new Date(n+28800000).toISOString().slice(0,10)!==value)fail('INVALID_DATE');return n;};
const today=now=>new Date(now+28800000).toISOString().slice(0,10);
const moods=['开心','平静','疲惫','想你','需要抱抱','想独处'];
const baseState=()=>({names:['',''],avatars:['',''],anniversary:'',cabinName:'',note:'',meetingDate:'',wishes:[false,false,false,false],extraWishes:[],moods:{},hugs:{},favorites:{}});
function createService(repo,files,clock=Date.now,random=()=>crypto.randomBytes(12).toString('hex').toUpperCase()) {
  const membership=(r,id)=>requireSpace(id,{user:o=>r.get('users',o),space:s=>r.get('spaces',s)});
  async function session(id) {
    const user=await repo.get('users',id);
    if(!user?.spaceId)return {bound:false,pairState:'waiting'};
    const space=await repo.get('spaces',user.spaceId);
    if(space?.status==='pending'&&space.memberOpenids?.length===1&&space.memberOpenids[0]===id)return {bound:false,pairState:space.requestedBy?'request':'waiting',hasInvite:Boolean(space.inviteId)};
    await membership(repo,id);return {bound:true,pairState:'success'};
  }
  async function list(id,collection,offset) {
    if(!['moments','letters_meta','stories'].includes(collection)||!Number.isInteger(offset)||offset<0||offset>100000)fail('INVALID_INPUT');
    const {spaceId}=await membership(repo,id),records=await repo.list(collection,spaceId,offset,10);
    return records.map(r=>{
      const common={id:r._id,mine:r.authorOpenid===id,createdAt:r.createdAt};
      if(collection==='letters_meta')return {...common,title:r.title,openAt:r.openAt,locked:!canReadLetterBody(r,id,clock()),paper:r.paper};
      if(collection==='stories')return {...common,content:r.content,title:r.title||'',dayKey:r.dayKey||'',location:r.location||'',weather:r.weather||'',caption:r.caption||'',photos:r.photos||[]};
      return {...common,dayKey:r.dayKey,content:r.content,photos:r.photos,stamp:r.stamp};
    });
  }
  async function snapshot(id) {
    const {space}=await membership(repo,id),state=space.state;if(!state||space.schemaVersion!==1)fail('SCHEMA_REVIEW_REQUIRED');
    const me=space.memberOpenids.indexOf(id),partner=space.memberOpenids[1-me],mineMood=state.moods[id]||{},partnerMood=state.moods[partner]||{};
    const result={bound:true,version:space.version,profile:{mine:state.names[me],partner:state.names[1-me],anniversary:state.anniversary,firstMet:state.firstMet||'',customHundredDate:state.customHundredDate||'',customYearDate:state.customYearDate||'',cabinName:state.cabinName,avatarMine:state.avatars[me],avatarPartner:state.avatars[1-me]},
      mood:mineMood.mood||'',moodNote:mineMood.note||'',shareMood:mineMood.share!==false,partnerMood:partnerMood.share?(partnerMood.note||partnerMood.mood||'对方还没有记录心情'):'对方暂未分享心情',partnerMoodKind:partnerMood.share?(partnerMood.mood||''):'',note:state.note,notes:state.notes===undefined?(state.note?[{id:'legacy',content:state.note,category:'未分类'}]:[]):state.notes,meetingDate:state.meetingDate,
      wishes:state.wishes,extraWishes:state.extraWishes,wishDetails:state.wishDetails||{},ticket:state.ticket||null,hugs:state.hugs.day===today(clock())?state.hugs.count:0,affectionDay:today(clock()),affectionCounts:state.affections?.day===today(clock())?state.affections.counts:{},favorites:state.favorites[id]||[]};
    result.moments=await list(id,'moments',0);result.letters=await list(id,'letters_meta',0);result.stories=await list(id,'stories',0);
    await membership(repo,id);return result;
  }
  async function readLetter(id,recordId) {
    const {spaceId}=await membership(repo,id),meta=requireOwnedRecord(await repo.get('letters_meta',text(recordId,128)),spaceId);
    if(!canReadLetterBody(meta,id,clock()))fail('LETTER_LOCKED');
    const body=requireOwnedRecord(await repo.get('letters_body',recordId),spaceId);
    return {id:recordId,title:meta.title,content:body.content,openAt:meta.openAt,paper:meta.paper};
  }
  async function readMoment(id,recordId) {
    const {space,spaceId}=await membership(repo,id),record=requireOwnedRecord(await repo.get('moments',text(recordId,128)),spaceId);
    const other=await repo.get('moments',hash(spaceId+':'+record.dayKey+':'+space.memberOpenids.find(x=>x!==record.authorOpenid)));
    const paired=other?.spaceId===spaceId&&!other.deleted;
    return {id:recordId,content:record.content,photos:record.photos,privateNote:record.authorOpenid===id||paired?record.privateNote:'',privateLocked:record.authorOpenid!==id&&!paired};
  }
  async function mutate(id,event) {
    const requestId=text(event.requestId,80);if(!/^[\w-]{8,80}$/.test(requestId))fail('INVALID_INPUT');
    const operationId=hash(id+':'+requestId),fingerprint=hash(JSON.stringify({action:event.action,payload:event.payload}));
    return repo.transaction(async r=>{
      const prior=await r.get('operations',operationId);if(prior){if(prior.fingerprint!==fingerprint)fail('REQUEST_REUSED');return prior.result;}
      const now=clock(),p=event.payload||{};let result={};
      if(event.action==='createInvite') {
        const user=await r.get('users',id);let spaceId=user?.spaceId,space=spaceId?await r.get('spaces',spaceId):null;
        if(space&&(space.status!=='pending'||space.memberOpenids.length!==1||space.memberOpenids[0]!==id))fail('ALREADY_BOUND');
        if(space&&now-(space.inviteCreatedAt||0)<10000)fail('TOO_FAST');if(user?.spaceId&&!space)fail('SCHEMA_REVIEW_REQUIRED');
        const code=random(),inviteId=hash(code);spaceId=spaceId||'s_'+random();
        if(space?.inviteId){const old=await r.get('invites',space.inviteId);if(old)await r.set('invites',space.inviteId,{...old,revoked:true});}
        await r.set('invites',inviteId,{ownerOpenid:id,spaceId,expiresAt:now+86400000,used:false});
        await r.set('spaces',spaceId,{...(space||{}),status:'pending',memberOpenids:[id],schemaVersion:1,version:0,state:space?.state||baseState(),inviteId,inviteCreatedAt:now,requestedBy:''});
        await r.set('users',id,{...(user||{}),spaceId});result={inviteCode:code,pairState:'waiting'};
      }else if(event.action==='joinInvite') {
        const code=text(p.code,32).toUpperCase();if(!/^[A-F0-9]{24}$/.test(code))fail('INVALID_INVITE');
        const user=await r.get('users',id);if(user?.spaceId)fail('ALREADY_BOUND');
        const invite=await r.get('invites',hash(code));if(!invite||invite.revoked||invite.used||invite.expiresAt<=now||invite.ownerOpenid===id)fail('INVALID_INVITE');
        const space=await r.get('spaces',invite.spaceId);if(!space||space.status!=='pending'||space.inviteId!==hash(code)||space.memberOpenids.length!==1)fail('INVALID_INVITE');
        if(space.requestedBy&&space.requestedBy!==id)fail('INVITE_BUSY');await r.set('spaces',invite.spaceId,{...space,requestedBy:id});result={pairState:'waiting',joinPending:true};
      }else if(['acceptInvite','rejectInvite'].includes(event.action)) {
        const user=await r.get('users',id),space=user?.spaceId?await r.get('spaces',user.spaceId):null;
        if(!space||space.status!=='pending'||space.memberOpenids.length!==1||space.memberOpenids[0]!==id||!space.requestedBy)fail('NO_REQUEST');
        const invite=await r.get('invites',space.inviteId);if(!invite||invite.expiresAt<=now||invite.used||invite.revoked)fail('INVALID_INVITE');
        if(event.action==='rejectInvite'){await r.set('spaces',user.spaceId,{...space,requestedBy:''});result={pairState:'waiting'};}
        else {const partner=await r.get('users',space.requestedBy);if(partner?.spaceId)fail('ALREADY_BOUND');
          await r.set('users',space.requestedBy,{...(partner||{}),spaceId:user.spaceId});await r.set('spaces',user.spaceId,{...space,status:'active',memberOpenids:[id,space.requestedBy],requestedBy:'',version:1});
          await r.set('invites',space.inviteId,{...invite,used:true});result={pairState:'success'};}
      }else if(event.action==='unlink') {
        const {spaceId,space}=await membership(r,id);if(event.version!==space.version)fail('CONFLICT');
        for(const member of space.memberOpenids){const user=await r.get('users',member);if(!user||user.spaceId!==spaceId)fail('SCHEMA_REVIEW_REQUIRED');await r.set('users',member,{...user,spaceId:''});}
        await r.set('spaces',spaceId,{...space,status:'unlinked',version:space.version+1,unlinkedAt:now});result={unlinked:true};
      }else {
        const {spaceId,space}=await membership(r,id);if(space.schemaVersion!==1||!space.state)fail('SCHEMA_REVIEW_REQUIRED');if(event.version!==space.version)fail('CONFLICT');
        const state=JSON.parse(JSON.stringify(space.state)),me=space.memberOpenids.indexOf(id);let recordId='';
        switch(event.action) {
          case 'saveProfile': {const anniversary=text(p.anniversary,10);day(anniversary);if(anniversary>today(now))fail('INVALID_DATE');state.names[me]=text(p.mine,16);state.names[1-me]=text(p.partner,16);state.cabinName=text(p.cabinName,24);state.anniversary=anniversary;
            if(p.firstMet!==undefined){if(p.firstMet!==''){day(p.firstMet);if(p.firstMet>today(now))fail('INVALID_DATE');}state.firstMet=p.firstMet;}
            for(const [index,value]of [[me,p.avatarMine],[1-me,p.avatarPartner]])if(value){requireOwnedRecord(await r.get('files',text(value,128)),spaceId);state.avatars[index]=value;}break;}
          case 'saveMood': if(!moods.includes(p.mood)||typeof p.shareMood!=='boolean')fail('INVALID_INPUT');state.moods[id]={mood:p.mood,note:text(p.moodNote,300,true),share:p.shareMood};break;
          case 'hug': if(state.hugs.day===today(now)&&now-(state.hugs.lastAt||0)<800)fail('TOO_FAST');state.hugs={day:today(now),count:(state.hugs.day===today(now)?state.hugs.count:0)+1,lastAt:now};break;
          case 'affection': {
            if(!['backPat','headPat','holdHands','shoulderRub'].includes(p.kind))fail('INVALID_INPUT');
            const current=state.affections?.day===today(now)?state.affections:{day:today(now),counts:{},lastAt:0};
            if(now-current.lastAt<800)fail('TOO_FAST');state.affections={day:today(now),counts:{...current.counts,[p.kind]:(current.counts[p.kind]||0)+1},lastAt:now};break;
          }
          case 'note': state.note=text(p.note,1000,true);break;
          case 'saveNote': {
            const rows=state.notes===undefined?(state.note?[{id:'legacy',content:state.note,category:'未分类'}]:[]):state.notes;
            const content=text(p.content,1000),category=text(p.category,20);if(p.id){const row=rows.find(x=>x.id===p.id);if(!row)fail('INVALID_INPUT');Object.assign(row,{content,category});}else{if(rows.length>=100)fail('LIMIT_REACHED');rows.unshift({id:operationId,content,category});}state.notes=rows;state.note=rows[0]?.content||'';break;
          }
          case 'deleteNote': {const rows=state.notes===undefined?(state.note?[{id:'legacy',content:state.note,category:'未分类'}]:[]):state.notes;if(!rows.some(x=>x.id===p.id))fail('INVALID_INPUT');state.notes=rows.filter(x=>x.id!==p.id);state.note=state.notes[0]?.content||'';break;}
          case 'deleteNoteCategory': {const category=text(p.category,20);if(category==='未分类')fail('INVALID_INPUT');const rows=state.notes===undefined?(state.note?[{id:'legacy',content:state.note,category:'未分类'}]:[]):state.notes;state.notes=rows.map(x=>x.category===category?{...x,category:'未分类'}:x);break;}
          case 'deleteTicket': state.ticket=null;break;
          case 'meeting': day(p.date);state.meetingDate=p.date;break;
          case 'firstMet': day(p.date);if(p.date>today(now))fail('INVALID_DATE');state.firstMet=p.date;break;
          case 'milestoneDate': {
            const fields={anniversary:'anniversary',hundredDate:'customHundredDate',yearDate:'customYearDate'};
            if(!Object.hasOwn(fields,p.field))fail('INVALID_INPUT');day(p.date);
            if(p.field==='anniversary'&&p.date>today(now))fail('INVALID_DATE');
            state[fields[p.field]]=p.date;break;
          }
          case 'ticket': {
            day(p.date);day(p.arrivalDate);
            if(![p.departure,p.arrival].every(x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x))||!['待购票','已出票','已相聚'].includes(p.status))fail('INVALID_INPUT');
            if(Date.parse(p.arrivalDate+'T'+p.arrival+':00+08:00')<=Date.parse(p.date+'T'+p.departure+':00+08:00'))fail('INVALID_DATE');
            state.ticket={train:text(p.train,20),from:text(p.from,30),to:text(p.to,30),date:p.date,arrivalDate:p.arrivalDate,departure:p.departure,arrival:p.arrival,seat:text(p.seat,60,true),status:p.status};state.meetingDate=p.arrivalDate;break;
          }
          case 'wish': if(!Number.isInteger(p.index)||p.index<0||p.index>=4||typeof p.done!=='boolean')fail('INVALID_INPUT');state.wishes[p.index]=p.done;break;
          case 'addWish': if(state.extraWishes.length>=100)fail('LIMIT_REACHED');state.extraWishes.push({id:operationId,text:text(p.text,200),note:text(p.note||'',120,true),done:false});break;
          case 'editWish': {const detail={text:text(p.text,200),note:text(p.note||'',120,true)};if(typeof p.id==='string'&&/^[0-3]$/.test(p.id)){state.wishDetails={...state.wishDetails,[p.id]:detail};}else {const w=state.extraWishes.find(x=>x.id===p.id);if(!w)fail('INVALID_INPUT');Object.assign(w,detail);}break;}
          case 'extraWish': {const w=state.extraWishes.find(x=>x.id===p.id);if(!w||typeof p.done!=='boolean')fail('INVALID_INPUT');w.done=p.done;break;}
          case 'deleteWish': state.extraWishes=state.extraWishes.filter(x=>x.id!==p.id);break;
          case 'publishMoment': {
            recordId=hash(spaceId+':'+today(now)+':'+id);if(!Array.isArray(p.photos)||p.photos.length<1||p.photos.length>2)fail('INVALID_INPUT');
            for(const fileId of p.photos){const file=requireOwnedRecord(await r.get('files',text(fileId,128)),spaceId);if(file.ownerOpenid!==id)fail('FORBIDDEN');}
            const old=await r.get('moments',recordId);await r.set('moments',recordId,{spaceId,authorOpenid:id,dayKey:today(now),createdAt:old?.createdAt||now,updatedAt:now,content:text(p.content,300),photos:p.photos,privateNote:p.privateEnabled?text(p.privateNote,300,true):'',stamp:text(p.stamp,8,true)});break;
          }
          case 'sendLetter': {if(!['now','future'].includes(p.delivery)||!Number.isInteger(p.paper)||p.paper<0||p.paper>2)fail('INVALID_INPUT');const openAt=p.delivery==='now'?now:day(p.openAt);if(p.delivery==='future'&&openAt<=now)fail('INVALID_DATE');recordId=operationId;
            await r.set('letters_meta',recordId,{spaceId,authorOpenid:id,recipientOpenid:space.memberOpenids[1-me],title:text(p.title,80),openAt,paper:p.paper,status:'sent',createdAt:now});await r.set('letters_body',recordId,{spaceId,content:text(p.content,10000)});break;}
          case 'story':case 'editStory': {
            recordId=event.action==='editStory'?text(p.id,128):operationId;let old=null;
            if(event.action==='editStory'){old=requireOwnedRecord(await r.get('stories',recordId),spaceId);if(old.authorOpenid!==id)fail('FORBIDDEN');}
            const photos=p.photos||[];if(!Array.isArray(photos)||photos.length>1)fail('INVALID_INPUT');
            for(const photo of photos)requireOwnedRecord(await r.get('files',text(photo,128)),spaceId);
            if(p.dayKey){day(p.dayKey);if(p.dayKey>today(now))fail('INVALID_DATE');}
            await r.set('stories',recordId,{spaceId,authorOpenid:id,content:text(p.content,2000),title:text(p.title||'',80,true),dayKey:p.dayKey||today(now),location:text(p.location||'',60,true),weather:text(p.weather||'',16,true),caption:text(p.caption||'',120,true),photos,createdAt:old?.createdAt||now,updatedAt:now});break;
          }
          case 'deleteRecord': {if(!['moments','stories','letters_meta'].includes(p.collection))fail('INVALID_INPUT');const record=requireOwnedRecord(await r.get(p.collection,text(p.id,128)),spaceId);if(record.authorOpenid!==id)fail('FORBIDDEN');await r.set(p.collection,p.id,{...record,deleted:true});if(p.collection==='letters_meta'){const body=await r.get('letters_body',p.id);await r.set('letters_body',p.id,{...body,deleted:true});}break;}
          case 'favorite': {if(!['moments','letters_meta'].includes(p.collection))fail('INVALID_INPUT');requireOwnedRecord(await r.get(p.collection,text(p.id,128)),spaceId);const list=state.favorites[id]||[];state.favorites[id]=list.includes(p.id)?list.filter(x=>x!==p.id):[...list,p.id].slice(-200);break;}
          default: fail('NOT_IMPLEMENTED');
        }
        const version=space.version+1;await r.set('spaces',spaceId,{...space,state,version,updatedAt:now});result={version,id:recordId};
      }
      const savedResult={...result};if(savedResult.inviteCode){delete savedResult.inviteCode;savedResult.needsNewCode=true;}
      await r.set('operations',operationId,{fingerprint,result:savedResult,createdAt:now});return result;
    });
  }
  return async(event,context)=>{
    try {
      const id=requireIdentity(context),action=event?.action;
      if(action==='joinInvite')await repo.transaction(async r=>{const limiter=hash('join:'+id),old=await r.get('rate_limits',limiter);if(old&&clock()-old.at<2000)fail('TOO_FAST');await r.set('rate_limits',limiter,{at:clock()});});
      if(action==='session')return {ok:true,data:await session(id)};
      if(action==='snapshot'||action==='spaceSummary')return {ok:true,data:await snapshot(id)};
      if(action==='list')return {ok:true,data:await list(id,event.payload?.collection,event.payload?.offset||0)};
      if(action==='readLetter')return {ok:true,data:await readLetter(id,event.payload?.id)};
      if(action==='letterMeta'){const {spaceId}=await membership(repo,id),record=requireOwnedRecord(await repo.get('letters_meta',text(event.payload?.id,128)),spaceId);return {ok:true,data:{title:record.title,openAt:record.openAt,locked:!canReadLetterBody(record,id,clock())}};}
      if(action==='readMoment')return {ok:true,data:await readMoment(id,event.payload?.id)};
      if(action==='fileUrl'){const {spaceId}=await membership(repo,id),file=requireOwnedRecord(await repo.get('files',text(event.payload?.id,128)),spaceId);return {ok:true,data:{url:await files.url(file.fileID)}};}
      if(action==='upload') {
        const {spaceId}=await membership(repo,id),base64=text(event.payload?.base64,1400000),buffer=Buffer.from(base64,'base64');
        if(buffer.length>1024*1024||buffer.length<8||(!buffer.subarray(0,3).equals(Buffer.from([255,216,255]))&&!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))))fail('INVALID_IMAGE');
        const fileId=hash(spaceId+':'+id+':'+hash(buffer)),existing=await repo.get('files',fileId);
        if(!existing){const uploaded=await files.upload(`spaces/${spaceId}/${fileId}`,buffer);await membership(repo,id);await repo.set('files',fileId,{spaceId,ownerOpenid:id,fileID:uploaded,createdAt:clock()});}return {ok:true,data:{id:fileId}};
      }
      return {ok:true,data:await mutate(id,event)};
    }catch(error){return {ok:false,error:error instanceof AccessError?error.code:'SERVICE_UNAVAILABLE'};}
  };
}
module.exports={createService,day,today};
