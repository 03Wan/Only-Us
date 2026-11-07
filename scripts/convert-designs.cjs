// Build-time conversion only. The shipped app runs WXML/WXSS/TypeScript with no HTML runtime.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const cheerio = require('cheerio');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const selectorParser = require('postcss-selector-parser');
const sharp = require('sharp');
const pages = require('./design-map.cjs');
const root = path.resolve(__dirname, '..');
const nativeRoot = path.join(root, 'miniprogram');
const put = (f, content) => { fs.mkdirSync(path.dirname(f), { recursive:true }); fs.writeFileSync(f,content); };
const json = (f, content) => put(f, JSON.stringify(content,null,2)+'\n');
// WXML parses template expressions before HTML entities: keep && and quoted strings literal.
const esc = s => String(s).split(/(\{\{[\s\S]*?\}\})/g).map(part=>part.startsWith('{{')?part.replace(/"/g,"'"):part.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')).join('');
const scale = n => Math.round(Number(n)*750/390*1000)/1000;
// Keep the phone proportions, but cap the unit on tablets via app.wxss.
const length = s => s.replace(/(-?\d*\.?\d+)rem\b/g,(_,n)=>`${scale(Number(n)*16)}rpx`).replace(/(-?\d*\.?\d+)px\b/g,(_,n)=>`${scale(n)}rpx`).replace(/(-?\d*\.?\d+)rpx\b/g,(_,n)=>`calc(${n} * var(--layout-unit))`).replace(/100dvh/g,'100vh');
const sources = pages.map(p=>({...p,html:fs.readFileSync(path.join(root,`stitch_only_us/_${p.id}/code.html`),'utf8')}));
const classes = new Map();
const iconJobs = new Map();
const specs = {};
const getClass = s => { if(!classes.has(s)) classes.set(s,`u${classes.size}`); return classes.get(s); };
for (const source of sources) {
  const $=cheerio.load(source.html);
  $('[class]').each((_,el)=>($(el).attr('class')||'').split(/\s+/).filter(Boolean).forEach(getClass));
}

function bind($,selector,action,value) {
  $(selector).attr('bindtap','onAction').attr('data-action',action);
  if(value!==undefined) $(selector).attr('data-value',String(value));
}
function textAt($,selector,value) { $(selector).first().text(`{{${value}}}`); }
function annotate($,page) {
  const s=page.key;
  specs[s]={ fields:{} };
  const buttons=$('button');
  const match=(label)=>buttons.filter((_,el)=>$(el).text().includes(label));
  const action=(label,name,value)=>{ const el=match(label);el.attr('bindtap','onAction').attr('data-action',name);if(value!==undefined)el.attr('data-value',String(value));return el; };
  const route=(label,key)=>action(label,'route',key);
  const field=($el,name,max)=>{specs[s].fields[name]=$el.attr('value')||$el.text().trim(); $el.attr('value',`{{${name}}}`).attr('bindinput','onField').attr('data-field',name);if(max)$el.attr('maxlength',String(max));if($el.is('textarea'))$el.empty().attr('auto-height','true').attr('adjust-position','true').attr('cursor-spacing','24');};
  $('textarea').each((i,e)=>field($(e),s==='compose'?'content':s==='editor'?'content':'moodNote',s==='compose'?10000:s==='editor'?300:60));
  if(s==='cabin') {
    bind($,'#dayNightToggle','dayNight');bind($,'#hotspotLamp','lamp');bind($,'#hotspotPhotos','route','us');bind($,'#hotspotEnvelope','route','locked');bind($,'#hotspotCouple','route','mood');bind($,'#hugButton','hug');action('写便签','note');
    textAt($,'#toggleLabel',"daytime ? '日间暖阳' : '晚间月光'");textAt($,'#lampStateText',"lampOn ? '台灯开' : '台灯关'");textAt($,'#hugCount',"'今日已互抱 ' + hugs + ' 次'");
    textAt($,'h1','cabinName');
    $('h1').parent().addClass('native-cabin-heading-title').parent().addClass('native-cabin-heading');
    $('#dayNightToggle').parent().addClass('native-cabin-heading-actions');
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>{if(n.data.trim()==='小林')n.data='{{mine}}';if(n.data.trim()==='念念')n.data='{{partner}}';});
    $('#lampGlow').attr('style',"opacity:{{lampOn ? 1 : 0}}");$('#nightOverlay').attr('style',"opacity:{{daytime ? 0 : 1}}");$('#dayOverlay').attr('style',"opacity:{{daytime ? 1 : 0}}");
    $('section').last().attr('bindtap','onAction').attr('data-action','route').attr('data-value','reunion');
    $('section').filter((_,e)=>$(e).text().includes('小屋便签')).find('p').last().text('{{note}}');
    $('section').filter((_,e)=>$(e).text().includes('今天的我们')).find('p').first().text('{{moodNote}}').attr('bindtap','onAction').attr('data-action','route').attr('data-value','mood');
    $('#hugToast').remove();$('#coupleBubble,#toastBanner').remove();
    // Prototype-only synchronisation labels must not imply a real connection.
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>{n.data=n.data.replace('实时互联中','本地演示').replace('正在同步播放：','小屋歌单：');});
  }
  if(s==='moments') {
    route('记录今天','editor'); action('按月筛选','month');
    $('*').contents().filter((_,n)=>n.type==='text'&&n.data.trim()==='查看双图').each((i,n)=>$(n).parent().attr('bindtap','onAction').attr('data-action','previewMoment').attr('data-value',i));
    buttons.filter((_,e)=>$(e).find('[data-icon="favorite"]').length>0).attr('bindtap','onAction').attr('data-action','favoriteMoment');
    $('section').eq(0).append('<button class="native-state-link" bindtap="onAction" data-action="route" data-value="waiting">查看等待状态</button>');
  }
  if(s==='mailbox') {
    route('写一封信','compose').attr('id','mailbox-compose-button');action('收到的信','mailTab','received');action('寄出的信','mailTab','sent');
    $('*').filter((_,e)=>['article'].includes(e.tagName)).each((i,e)=>$(e).attr('bindtap','onAction').attr('data-action','route').attr('data-value',i===0?'locked':'letter'));
    // Some exported cards are divs rather than articles.
    const seal=$('*').filter((_,e)=>$(e).children().length===0&&$(e).text().trim()==='来自小林的未来信件').first();seal.closest('article').attr('bindtap','onAction').attr('data-action','route').attr('data-value','locked');
    $('article').attr('wx:if',"{{mailTab === 'received'}}");
    $('main').append('<view wx:if="{{mailTab === \'sent\'}}" class="local-sent-card"><view class="local-card-heading">寄出的信</view><view>{{sentTitle || "写给五百天后的我们"}}</view><text>本地投递示例 · 尚未连接对方</text><button bindtap="onAction" data-action="route" data-value="compose">继续写信 ›</button></view>');
    match('收到的信').attr('style',"background:{{mailTab === 'received' ? '#ffffff' : 'transparent'}}");
    match('寄出的信').attr('style',"background:{{mailTab === 'sent' ? '#ffffff' : 'transparent'}}");
  }
  if(s==='reunion') {
    $('#wishlist-container button').each((i,e)=>{
      $(e).attr('bindtap','onAction').attr('data-action','wish').attr('data-value',i).attr('style',`background:{{wishes[${i}] ? '#edb8ce' : 'transparent'}};border:1px solid #cac4cf;`);
      $(e).find('span').attr('wx:if',`{{wishes[${i}]}}`).attr('style','color:#ffffff');
      $(e).parent().addClass('native-wish-row').attr('style',`opacity:{{wishes[${i}] ? 0.65 : 1}}`);
    });
    action('添加心愿','addWish');
    $('*').contents().filter((_,n)=>n.type==='text'&&n.data.includes('1/4 已兑现')).each((_,n)=>n.data='{{wishCount}}/4 已兑现');
    $('section').filter((_,e)=>$(e).text().includes('下次见面想做的事')).append('<view wx:for="{{extraWishes}}" wx:key="id" class="extra-wish" bindtap="onAction" data-action="extraWish" data-value="{{item.id}}">{{item.done ? "✓ " : "○ "}}{{item.text}}</view>');
  }
  if(s==='us') action('add','story');
  if(s==='bind') {
    $('#invite-code-text').text('{{inviteCode}}');
    $('#view-state-waiting').attr('wx:if',"{{pairState === 'waiting' && pairMode === 'create'}}");
    $('#view-state-input-join').removeClass('hidden').attr('wx:if',"{{pairState === 'waiting' && pairMode === 'join'}}");
    for(const state of ['request','success','error'])$(`#view-state-${state}`).removeClass('hidden').attr('wx:if',`{{pairState === '${state}'}}`);
    $('#main-tab-bar').attr('wx:if',"{{pairState === 'waiting'}}");
    field($('#partner-input'),'inviteInput',20);
    for(const state of ['waiting','request','success','error'])bind($,`#state-btn-${state}`,'pairState',state);
    bind($,'#tab-create-btn','pairMode','create');bind($,'#tab-join-btn','pairMode','join');
    $('#tab-create-btn').attr('style',"background:{{pairMode === 'create' ? '#ffffff' : 'transparent'}}");
    $('#tab-join-btn').attr('style',"background:{{pairMode === 'join' ? '#ffffff' : 'transparent'}}");
    $('button[onclick]').each((_,e)=>{
      const fn=$(e).attr('onclick');const map={refreshCodeAction:'newCode',copyCodeAction:'copyCode',shareToPartner:'copyCode',confirmJoinPairing:'join',rejectPairRequest:'reject',acceptPairRequest:'accept',goToProfileSetup:'profile',regenerateNewCode:'newCode',retryInputMode:'retryJoin'};
      for(const [name,a]of Object.entries(map))if(fn.startsWith(name+'('))$(e).attr('bindtap','onAction').attr('data-action',a);
    });
    $('#toast-pill').remove();
    $('main').prepend('<view class="mock-notice">本地绑定演示：密令不会连接真实账号</view>');
  }
  if(s==='profile') {
    const inputs=$('input');field(inputs.eq(0),'mine',16);field(inputs.eq(1),'partner',16);field(inputs.eq(2),'cabinName',24);
    action('开启我们的小屋','saveProfile');
    const avatars=$('img');avatars.each((i,e)=>{$(e).attr('src',`{{avatar${i}}}`).attr('bindtap','onAction').attr('data-action','avatar').attr('data-value',i);});
    buttons.filter((_,e)=>$(e).text().includes('photo_camera')).each((i,e)=>$(e).attr('bindtap','onAction').attr('data-action','avatar').attr('data-value',i));
    $('button[onclick]').each((_,e)=>{const raw=$(e).attr('onclick')||'';const value=raw.match(/\.value='([^']*)'/);if(value)$(e).attr('bindtap','onAction').attr('data-action','cabinSuggestion').attr('data-value',value[1]);});
    // Replace the decorative web-only wheel with a real native date picker.
    const section=$('section').filter((_,e)=>$(e).text().includes('滑动滚轮')).first();
    const wheel=section.find('[class*="grid-cols-3"]').first();
    if(wheel.length)wheel.replaceWith('<picker mode="date" value="{{anniversary}}" end="{{today}}" bindchange="onDate" data-field="anniversary"><view class="date-picker">{{anniversary}} <text>选择纪念日 ›</text></view></picker>');
    else section.append('<picker mode="date" value="{{anniversary}}" end="{{today}}" bindchange="onDate" data-field="anniversary"><view class="date-picker">{{anniversary}} · 选择日期</view></picker>');
    $('*').contents().filter((_,n)=>n.type==='text'&&n.data.trim()==='1').each((_,n)=>{if($(n).parent().hasClass('text-primary'))n.data='{{loveDays}}';});
  }
  if(s==='editor') {
    action('取消','back');action('更换照片','photo');action('切换排版','layout');action('存为草稿','saveMoment');action('定格这一刻','publishMoment');action('更多','tag');
    $('img').first().attr('src','{{photo}}');
    const frame=$('img').first().parent().addClass('native-photo-frame');
    frame.wrap('<view class="native-photo-pair" style="display:{{photo2 && layout === \'双图并排\' ? \'flex\' : \'block\'}}"></view>');
    frame.after('<view wx:if="{{photo2}}" class="native-photo-frame native-second-frame"><image src="{{photo2}}" mode="aspectFill" class="native-second-image" bindtap="onAction" data-action="previewDraft"/></view>');
    const camera=$('span').filter((_,e)=>$(e).text().trim()==='添加对比视角').first();camera.parent().attr('bindtap','onAction').attr('data-action','photo2');
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>{n.data=n.data.replace('85 / 300','{{content.length}} / 300').replace('内容本地安全加密','内容保存在本机缓存').replace('已同步与北京的距离：','演示距离：').replace('延迟 < 0.2s','未连接云端');});
    const area=$('textarea').first().parent();area.append('<text class="selection-hint">{{layout}} · {{stamp}}</text><textarea wx:if="{{privateEnabled}}" value="{{privateNote}}" bindinput="onField" data-field="privateNote" maxlength="300" auto-height="true" placeholder="给这一刻留一句悄悄话（本机保存）" class="native-private-note"/>');
    buttons.filter((_,e)=>['☕','🍃','💭','✨'].includes($(e).text().trim())).each((_,e)=>$(e).attr('bindtap','onAction').attr('data-action','stamp').attr('data-value',$(e).text().trim()));
  }
  if(s==='mood') {
    buttons.first().attr('bindtap','onAction').attr('data-action','back');
    for(const mood of ['开心','平静','疲惫','想你','需要抱抱','想独处']){
      const label=$('*').filter((_,e)=>$(e).children().length===0&&$(e).text().trim()===mood).first();
      const card=label.closest('[class*="cursor-pointer"]');
      const target=card.length?card:label.parent();
      target.attr('bindtap','onAction').attr('data-action','mood').attr('data-value',mood).attr('style',`outline:{{mood === '${mood}' ? '2px solid #eab5cb' : 'none'}};outline-offset:2px;`);
      target.removeClass('active border-2 border-[#EAB5CB] shadow-[0_4px_16px_rgba(234,181,203,0.35)]').addClass('border');
      target.children('.absolute').remove();
      target.append(`<view wx:if="{{mood === '${mood}'}}" class="mood-selected"><span class="material-symbols-outlined text-white text-[12px]">check</span></view>`);
    }
    action('确认保存','saveMood');action('喝了甜水','quickMood','今天喝到了好喝的奶茶，想分你一半。');action('听到了你的歌','quickMood','在听你推荐的歌，想你。');action('正在看黄昏','quickMood','正在看黄昏，好想你也在身旁。');
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>n.data=n.data.replace('18 / 60 字','{{moodNote.length}} / 60 字').replace('实时同步展示','展示（本地演示）'));
    const alone=$('*').filter((_,e)=>$(e).children().length===0&&$(e).text().includes('独处模式守护提示')).first();
    $('#alone-mood-note').attr('wx:if',"{{mood === '想独处'}}");
  }
  if(s==='compose') {
    field($('input[type="text"]').first(),'letterTitle',60);buttons.first().attr('bindtap','onAction').attr('data-action','back');
    action('存草稿','saveLetter');action('寄出信件','sendLetter');action('重试','sendLetter');action('附上思念贴纸','sticker');
    ['月牙星梦','落日余晖','手作棉纸'].forEach((label,i)=>action(label,'paper',i).attr('style',`outline:{{paper === ${i} ? '2px solid #cdbef8' : 'none'}}`));
    for(const [label,val]of [['立即送达','now'],['未来开启','future']]){
      const el=$('*').filter((_,e)=>$(e).children().length===0&&$(e).text().trim()===label).first().closest('[class*="cursor-pointer"]');
      el.attr('bindtap','onAction').attr('data-action','delivery').attr('data-value',val).attr('style',`outline:{{delivery === '${val}' ? '2px solid #9184ba' : 'none'}}`);
    }
    const paper=$('.cotton-texture');paper.attr('style',"background-color:{{paper === 0 ? '#f3eeff' : paper === 1 ? '#fff0e9' : '#fbf7f2'}}");
    paper.append('<view class="selection-hint">{{delivery === "future" ? "模拟未来开启" : "模拟立即投递"}} · {{content.length}} 字</view>');
    $('main').append('<picker wx:if="{{delivery === \'future\'}}" mode="date" start="{{today}}" value="{{openAt}}" bindchange="onDate" data-field="openAt"><view class="date-picker">约定启封：{{openAt}} ›</view></picker>');
    buttons.filter((_,e)=>$(e).text().trim()==='calendar_month').replaceWith('<picker mode="date" start="{{today}}" value="{{openAt}}" bindchange="onDate" data-field="openAt"><view class="native-calendar-trigger">选日期 ›</view></picker>');
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>{n.data=n.data.replace('2025年06月01日','{{openAt}}').replace('倒计时 68 天','{{delivery === "future" ? "按约定日期开启" : "本机立即投递"}}').replace('儿童节见面前夜 🌙','约定的那一天 🌙').replace('状态说明：未来封印倒计时中（68天后可开启）','{{delivery === "future" ? "未来启封日期：" + openAt : "本机模拟立即投递"}}');});
    // Remove static success/error demo banners; native state-panel shows actual action result.
    const demo=$('*').filter((_,e)=>$(e).children().length===0&&$(e).text().trim()==='状态反馈演示').first();demo.closest('section').remove();
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>n.data=n.data.replace('双向加密密信','本地信件演示').replace('由星光信使准时派送','在接入云端后支持定时开启'));
  }
  if(s==='waiting') {
    $('img').first().attr('src','{{photo}}');
    $('p').filter((_,e)=>$(e).text().includes('下午在公司楼下')).first().text('{{content}}');
    $('main').prepend('<view class="mock-notice">单方完成 · 本地演示 <text bindtap="onAction" data-action="route" data-value="editor">继续编辑 ›</text></view>');
    action('全部 128 天','route','moments');
  }
  if(s==='locked') {
    action('返回邮局','route','mailbox');action('返回月亮邮局','route','mailbox');bind($,'#touch-button','heartbeat');
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>n.data=n.data.replace('对方的小屋将收到感应','本次仅在本机演示').replace('正文已安全加密并封存于时光节点','本页为锁定态演示，不包含信件正文'));
  }
  if(s==='letter') {
    buttons.first().attr('bindtap','onAction').attr('data-action','back');bind($,'#favorite-btn','favoriteLetter');bind($,'#save-btn','favoriteLetter');route('给TA回一封信','compose');
    $('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>n.data=n.data.replace('本信件已存入「小小宇宙 · 双人永久记忆库」','示例信件 · 珍藏状态仅保存在本机'));
  }
  // All remaining controls explicitly report local-only capability; never silently dead.
  $('button').each((_,e)=>{if(!$(e).attr('bindtap'))$(e).attr('bindtap','onAction').attr('data-action','info').attr('data-value',$(e).attr('aria-label')||$(e).text().trim());});
  $('input[type="checkbox"]').each((i,e)=>{
    const parent=$(e).parent(); parent.empty().append(`<switch checked="{{${s==='mood'?'shareMood':'privateEnabled'}}}" color="#605487" bindchange="onToggle" data-field="${s==='mood'?'shareMood':'privateEnabled'}" class="native-switch"/>`);
  });
}

async function main() {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/resource-manifest.json'),'utf8'));
  const photoMap=new Map(manifest.images.map(p=>[p.url,p.local]));
  const configContext={tailwind:{}};
  for(const source of sources){
    const script=source.html.match(/tailwind.config\s*=\s*([\s\S]+?)<\/script>/)?.[1];
    if(script){const ctx={tailwind:{}};vm.runInNewContext('tailwind.config = '+script,ctx,{timeout:1000});
      const cfg=ctx.tailwind.config;
      configContext.tailwind.theme ||= {extend:{}};
      for(const[k,v]of Object.entries(cfg.theme?.extend||{}))configContext.tailwind.theme.extend[k]={...configContext.tailwind.theme.extend[k],...v};
    }
  }
  const config={...configContext.tailwind,content:[{raw:sources.map(s=>s.html).join('\n'),extension:'html'}],corePlugins:{preflight:false},darkMode:'class'};
  const built=await postcss([tailwind(config)]).process('@tailwind utilities;',{from:undefined});
  const cssRoot=postcss.parse(built.css);const computed=new Map();
  const seenStyles=new Set();
  for(const source of sources)for(const match of source.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)){
    if(seenStyles.has(match[1]))continue;seenStyles.add(match[1]);
    const custom=postcss.parse(match[1]);
    custom.walkRules(r=>{if(r.selector==='body'||r.selector.includes('material-symbols')||r.selector.includes('*')||r.selector.includes('scrollbar'))r.remove();});
    cssRoot.append(custom.nodes);
  }
  cssRoot.walkRules(rule=>{
    if(rule.selector.startsWith('.')&&!rule.selector.includes(':')&&!rule.selector.includes('>')&&!rule.selector.includes('~')&&!rule.selector.includes(',')){
      try{let cls;selectorParser(s=>s.walkClasses(n=>cls=n.value)).processSync(rule.selector);if(cls){const styles={};rule.walkDecls(d=>styles[d.prop]=d.value);computed.set(cls,styles);}}catch{}
    }
  });
  const icon=async(name,color,filled)=>{
    if(!name)return '/assets/icons/favorite.png';
    const identity=`${name}:${color}:${filled}`;const filename=`${name}-${crypto.createHash('sha1').update(identity).digest('hex').slice(0,8)}.png`;
    if(!iconJobs.has(filename))iconJobs.set(filename,{name,color,filled});
    return '/assets/icons/'+filename;
  };
  // Use sync registration while rendering, asynchronously rasterize the official icon files afterward.
  const iconPath=(name,color,filled)=>{
    const identity=`${name}:${color}:${filled}`;const filename=`${name}-${crypto.createHash('sha1').update(identity).digest('hex').slice(0,8)}.png`;
    if(!iconJobs.has(filename))iconJobs.set(filename,{name,color,filled});return '/assets/icons/'+filename;
  };
  void icon;
  const inherited=(el,prop,def)=>{
    const chain=[];for(let n=el;n&&n.type!=='root';n=n.parent)chain.unshift(n);
    let value=def;for(const n of chain){for(const c of(n.attribs?.class||'').split(/\s+/)){if(computed.get(c)?.[prop])value=computed.get(c)[prop];}const inline=n.attribs?.style?.match(new RegExp(`(?:^|;)\\s*${prop}:([^;]+)`));if(inline)value=inline[1].trim();}return value;
  };
  for(const page of sources) {
    const $=cheerio.load(page.html);
    $('script,style,nav,header').remove();
    // Exported phone shells and fake device chrome are replaced with actual native safe areas.
    if(!$('body').children('div').length) $('body').wrapInner('<div></div>');
    const shell=$('body').children('div').first();
    shell.attr('class',`native-screen native-page-${page.key} ${page.tab===undefined?'native-secondary':'native-tab-page'}`);
    shell.children('div').each((_,e)=>{if(!$(e).text().trim()&&!$(e).children().length&&/^h-\d+$/.test($(e).attr('class')||''))$(e).remove();});
    $('body').find('[onclick]').each((_,e)=>$(e).attr('data-web-action',$(e).attr('onclick')));
    annotate($,page);
    // Stable layout hooks survive regenerated utility identifiers.
    $('[class*="flex"][class*="items-center"][class*="justify-between"]').addClass('native-between');
    $('[class*="grid-cols-2"]').addClass('native-pair-grid');
    $('[class*="flex-1"]').addClass('native-flexible');
    $('*').contents().filter((_,n)=>n.type==='text'&&!n.data.includes('{{')).each((_,n)=>{
      n.data=n.data.replace(/小林 & 念念/g,'{{mine}} & {{partner}}').replace('2024.05.20 至今','{{anniversary}} 至今').replace(/第 520 天/g,'第 {{loveDays}} 天');
      if(page.key==='us'&&n.data.trim()==='520')n.data='{{loveDays}}';
    });
    const main=$('main'); main.attr('class',((main.attr('class')||'').split(/\s+/).filter(c=>!/^pt-|^mt-|^w-\[390|^min-h-/.test(c)).join(' '))+' native-content');
    if(page.key==='mood'){
      shell.children().last().attr('class',((shell.children().last().attr('class')||'').split(/\s+/).filter(c=>!/^max-h-|^mt-auto/.test(c)).join(' '))+' native-mood-sheet');
      shell.children().first().remove(); // The real app header owns the capsule; remove the fake underlay chrome.
      shell.children().first().attr('class','native-mood-backdrop');
    }
    $('footer[class*="fixed"],div[class~="fixed"][class*="bottom-"]').each((_,e)=>$(e).addClass('native-fixed-action'));
    if(page.key==='mailbox')$('#mailbox-compose-button').parent().addClass('native-fixed-action native-mail-action');
    // Type-safe rendering spec captures initial textarea content separately from markup.
    const render=(node)=>{
      if(!node || node.type==='comment')return '';
      if(node.type==='text')return esc(node.data.replace(/\s+/g,' '));
      if(!node.tagName)return(node.children||[]).map(render).join('');
      let tag=node.tagName,a={...node.attribs};
      if(['script','style','nav','header','svg','path'].includes(tag))return '';
      const cls=(a.class||'').split(/\s+/).filter(Boolean);
      if(cls.includes('material-symbols-outlined')) {
        const name=$(node).text().trim();let color=inherited(node,'color','#605487');const size=inherited(node,'font-size','24px');
        const rgb=color.match(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/);
        if(rgb){const alpha=color.match(/\/\s*([\d.]+)\s*\)/)?.[1];color=alpha&&Number(alpha)<1?`rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`:'#'+rgb.slice(1).map(v=>Number(v).toString(16).padStart(2,'0')).join('');}
        const src=iconPath(name,color,(a.style||'').includes("'FILL' 1")||cls.includes('fill-icon'));
        return `<image ${a['wx:if']?`wx:if="${esc(a['wx:if'])}" `:''}src="${src}" class="native-icon ${cls.filter(c=>!c.startsWith('text-')).map(getClass).join(' ')}" style="width:${length(size)};height:${length(size)};" mode="aspectFit"/>`;
      }
      const bg=(a.style||'').match(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/);
      if(bg&&photoMap.has(bg[1])){tag='img';a.src=photoMap.get(bg[1]);a.style=a.style.replace(bg[0],'');}
      if(tag==='img')tag='image';
      else if(!['view','text','image','button','input','textarea','picker','switch','block'].includes(tag))tag=(tag==='span'&&!(node.children||[]).some(n=>n.type==='tag'))?'text':'view';
      if(tag==='image'&&photoMap.has(a.src))a.src=photoMap.get(a.src);
      const out={};
      for(const[k,v]of Object.entries(a)){
        if(k.startsWith('wx:')||k.startsWith('bind')||k.startsWith('catch')||k.startsWith('data-')&&!['data-alt','data-icon','data-weight','data-web-action'].includes(k)||['id','src','value','placeholder','maxlength','checked','color','mode','end','start','auto-height','adjust-position','cursor-spacing'].includes(k))out[k]=v;
      }
      out.class=cls.filter(c=>!/^w-\[390/.test(c)).map(c=>c.startsWith('native-')||['date-picker','selection-hint','mock-notice','second-photo','extra-wish','mood-selected','local-sent-card','local-card-heading'].includes(c)?c:getClass(c)).join(' ');
      if(tag==='button')out['hover-class']='native-pressed';
      if(tag==='input'){out.type=['number','digit'].includes(a.type)?a.type:'text';out['adjust-position']='true';out['cursor-spacing']='24';}
      if(tag==='textarea'){out['show-confirm-bar']='false';out['disable-default-padding']='true';out['adjust-position']='true';out['cursor-spacing']='100';}
      if(tag==='image'){out.mode=cls.includes('object-contain')?'aspectFit':'aspectFill';out['lazy-load']='true';out.binderror='onImageError';}
      let style=a.style||'';
      style=style.split(';').filter(d=>d.trim()&&!/font-variation-settings|animation-delay|filter:|mix-blend/.test(d)).join(';');
      if(a['data-action']==='wish')style+=';min-width:38rpx;min-height:38rpx;';
      if(cls.includes('aspect-[4/3.2]'))style+=';height:548rpx;';
      // Preserve ratio using native aspect-ratio support; ensure height on full-size photo children.
      if(cls.includes('h-full')&&tag==='image')style+=';position:absolute;inset:0;';
      if(a.id==='cabinBgImage')style+=';position:absolute;inset:0;';
      if(tag==='textarea')style+=';min-height:'+(page.key==='compose'?'380':'155')+'rpx;';
      if(style)out.style=length(style);
      const attrs=Object.entries(out).map(([k,v])=>`${k}="${esc(v)}"`).join(' ');
      const children=['image','input','switch'].includes(tag)?'':(node.children||[]).map(render).join('');
      return `<${tag} ${attrs}>${children}</${tag}>`;
    };
    const headerTitle=page.tab===undefined?page.title:'此间有你';
    const view=`<!-- Native reconstruction of stitch_only_us/_${page.id}; no Web HTML runtime. -->\n<app-header title="${headerTitle}" back="${page.tab===undefined?'{{true}}':'{{false}}'}"/>\n${render(shell[0])}\n<state-panel visible="{{!!feedback}}" message="{{feedback}}" kind="{{feedbackKind}}" binddismiss="dismissFeedback" bindretry="retryAction"/>\n`;
    put(path.join(nativeRoot,page.route+'.wxml'),require('./qa-views.cjs').applyPage(page.key,view));
    const relative=path.relative(path.dirname(path.join(nativeRoot,page.route)),path.join(nativeRoot,'shared/page-controller')).replace(/\\/g,'/');
    put(path.join(nativeRoot,page.route+'.ts'),`import { createPage } from '${relative}';\nPage(createPage('${page.key}'));\n`);
    json(path.join(nativeRoot,page.route+'.json'),{navigationStyle:'custom',usingComponents:{'app-header':'/components/app-header/index','state-panel':'/components/state-panel/index'}});
    put(path.join(nativeRoot,page.route+'.wxss'),`/* Page ${page.id}: shared native design tokens and utilities are in app.wxss. */\n`);
  }
  // CSS class identifiers are encoded; Web selectors, state variants and runtime CSS dependencies are removed.
  cssRoot.walkRules(rule=>{
    if(rule.parent?.type==='atrule' && /keyframes/.test(rule.parent.name))return;
    if(rule.selector.includes(':is(')||rule.selector.includes('.dark')||/:hover|:focus|:active|:selection|:placeholder|\.peer|\.group|\*/.test(rule.selector)){rule.remove();return;}
    if(rule.selector.includes('> :not([hidden])')){
      let original;selectorParser(s=>s.walkClasses(c=>{if(!original)original=c.value;})).processSync(rule.selector);
      const axis=original?.includes('space-y')?'row-gap':'column-gap';
      const declared=rule.nodes.find(n=>n.type==='decl'&&/margin-(top|left)/.test(n.prop))?.value||'0px';
      const raw=declared.match(/(-?\d*\.?\d+(?:rem|px))/)?.[1]||'0px';
      rule.removeAll();rule.selector='.'+getClass(original);rule.append({prop:axis,value:length(raw)});return;
    }
    try{rule.selector=selectorParser(selectors=>{
      selectors.walkClasses(c=>c.value=getClass(c.value));
      selectors.walkTags(t=>t.value=['text','view','image','button','input'].includes(t.value)?t.value:'view');
    }).processSync(rule.selector);}catch{rule.remove();}
  });
  cssRoot.walkDecls(d=>{d.value=length(d.value);if(['font-variation-settings','--tw-ring-offset-shadow','--tw-ring-shadow','--tw-ring-color','--tw-ring-offset-color'].includes(d.prop))d.remove();});
  // Native transforms use the same CSS variables but do not rely on Tailwind's universal preflight.
  const vars=`page,view,text,image,button,input,textarea { --tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-gradient-from-position:0%;--tw-gradient-via-position:50%;--tw-gradient-to-position:100%;--tw-border-opacity:1;--tw-text-opacity:1;--tw-bg-opacity:1;--tw-shadow:0 0 #0000;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000; }\n`;
  put(path.join(nativeRoot,'styles/design.wxss'),require('./qa-views.cjs').auditCss(vars+cssRoot.toString()));
  put(path.join(root,'docs/utility-map.json'),JSON.stringify(Object.fromEntries(classes),null,2));
  const iconDir=path.join(nativeRoot,'assets/icons');fs.mkdirSync(iconDir,{recursive:true});
  for(const [filename,job]of iconJobs){
    let file=path.join(root,'node_modules/@material-symbols/svg-400/outlined',job.name+(job.filled?'-fill':'')+'.svg');
    if(!fs.existsSync(file))file=path.join(root,'node_modules/@material-symbols/svg-400/outlined',job.name+'.svg');
    if(!fs.existsSync(file))file=path.join(root,'node_modules/@material-design-icons/svg/outlined',(job.name==='magic_button'?'auto_fix_high':job.name)+'.svg');
    if(!fs.existsSync(file))throw new Error('Missing official icon: '+job.name);
    const svg=fs.readFileSync(file,'utf8').replace('<svg ',`<svg fill="${job.color}" `);
    await sharp(Buffer.from(svg)).resize(72,72).png().toFile(path.join(iconDir,filename));
  }
  json(path.join(root,'docs/icon-manifest.json'),[...iconJobs].map(([file,j])=>({file,...j})));
  for(const name of ['cottage','photo_library','mail','flight_takeoff','diversity_1'])for(const state of ['active','idle']){
    const color=state==='active'?'#605487':'#79757f';
    const file=path.join(root,'node_modules/@material-symbols/svg-400/outlined',name+(state==='active'?'-fill':'')+'.svg');
    const svg=fs.readFileSync(file,'utf8').replace('<svg ',`<svg fill="${color}" `);
    const dest=path.join(nativeRoot,`assets/tab/${name}-${state}.png`);fs.mkdirSync(path.dirname(dest),{recursive:true});
    await sharp(Buffer.from(svg)).resize(72,72).png().toFile(dest);
  }
  json(path.join(root,'docs/routes.json'),pages);
  require('./prune-data-assets.cjs').pruneDataAssets();
  await require('./optimize-package-media.cjs').optimizeMedia();
  console.log(`Generated ${pages.length} native pages, ${classes.size} styles, ${iconJobs.size} official icons.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

