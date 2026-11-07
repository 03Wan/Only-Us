const fs=require('node:fs'),cheerio=require('cheerio');
const action=(label,name,value='')=>`<button class="qa-link" bindtap="onAction" data-action="${name}" data-value="${value}">${label}</button>`;
const notice=require('./sync-status-view.cjs');
const examples=action('{{showExamples ? "收起设计示例" : "查看设计示例（非真实数据）"}}','showExamples');
const history=action('{{moreHistory ? "收起历史记录" : "展开历史记录"}}','moreHistory')+`<button wx:if="{{cloudMode && hasMore}}" class="qa-link" bindtap="onAction" data-action="loadMore" disabled="{{busy}}">加载更多</button>`;
const momentCards=`<view class="qa-toolbar"><view class="qa-section-title">日常记录</view>${action('{{monthFilter}}','month')}</view><view wx:if="{{!visibleMoments.length}}" class="qa-card qa-empty">还没有记录，拍下今天想分享的一刻吧。</view><view wx:for="{{visibleMoments}}" wx:key="id" class="qa-card"><view class="qa-toolbar"><text>{{item.mine ? mine : partner}} · {{item.dayKey}}</text><button bindtap="onAction" data-action="favoriteMoment" data-value="{{item.id}}" disabled="{{busy}}" class="qa-link">{{item.favorite ? '已珍藏 · 取消' : '珍藏'}}</button></view><view class="qa-photo-grid"><image wx:for="{{item.photos}}" wx:for-item="photoUrl" wx:key="*this" src="{{photoUrl}}" mode="aspectFill" binderror="onImageError" bindtap="onAction" data-action="previewMoment" data-value="{{item.id}}"/></view><view class="qa-body">{{item.content}}</view><view class="qa-toolbar"><button class="qa-link" bindtap="onAction" data-action="previewMoment" data-value="{{item.id}}">查看详情</button><button wx:if="{{item.mine}}" class="qa-link" bindtap="onAction" data-action="deleteRecord" data-value="moments:{{item.id}}">删除</button></view></view>`;
const storyCards=`<view class="qa-toolbar"><view class="qa-section-title">我们的回忆馆</view>${action('留下一页故事','story')}</view><view wx:if="{{!visibleStories.length}}" class="qa-card qa-empty">还没有自己的篇章，记住今天的一件小事吧。</view><view wx:for="{{visibleStories}}" wx:key="id" class="qa-card"><view class="qa-body">{{item.content}}</view><view class="qa-toolbar"><button class="qa-link" bindtap="onAction" data-action="storyDetail" data-value="{{item.id}}">回忆详情</button><button wx:if="{{item.mine}}" class="qa-link" bindtap="onAction" data-action="deleteRecord" data-value="stories:{{item.id}}">删除</button></view></view>`;
function applyDesignPage(key,source){
 if(source.includes('qa-audited'))return require('./feature-views.cjs').upgradePage(key,source);
 const $=cheerio.load(source,{xmlMode:true,decodeEntities:false}),content=$('.native-content'),children=content.children().toArray();
 function replaceText(find,value){$('*').contents().filter((_,n)=>n.type==='text'&&n.data.trim()===find).each((_,n)=>{n.data=value;});}
 if(key==='cabin'){
  $(children[3]).insertBefore($(children[1]));
  $('#hotspotPhotos').attr('data-action','photos').removeAttr('data-value');$('#hotspotEnvelope').attr('data-value','mailbox');replaceText('照片墙 42张','照片墙');replaceText('今天喝了生椰拿铁，好想分你一口 ☕️','{{partnerMood}}');replaceText('本地演示','{{cloudMode ? "共同空间" : "本机模式"}}');
  for(const label of ['杭州','成都'])replaceText(label,'未采集位置');for(const label of ['85%','90%'])replaceText(label,'未读取电量');replaceText('微凉夜风 · 21℃','小屋里的温柔时光');replaceText('小屋歌单：恋人絮语','歌单装饰 · 暂无播放功能');
  replaceText('念念留 · 约定 2025.06.01 开封','共同便签');replaceText('今天 19:42','保存后更新');replaceText('2025.06.01 · 杭州东站','{{meetingDate || "去设置见面日期"}}');replaceText('12','{{meetingDate ? meetingDays : "—"}}');replaceText('天后','{{meetingDate ? "天" : ""}}');
 }
 if(key==='moments'){
  const old=children.slice(1).map(n=>$.xml(n)).join('');$(children.slice(1)).remove();replaceText('双向同步完成','{{cloudMode ? "共同空间" : "本机记录"}}');content.append(momentCards+history+examples+`<view wx:if="{{showExamples && !cloudMode}}" class="qa-examples"><view class="qa-caption">以下为 Stitch 设计示例</view>${old}</view>`);
 }
 if(key==='mailbox'){
  // Keep the original moon-post hero and native tab styling; replace all fabricated counts and cards.
  replaceText('云端守候中：静候下一次银河启信','{{cloudMode ? "字句由云端守候" : "本机模式 · 尚未投递给对方"}}');
  $(children[0]).find('.u81').remove();
  const tabs=$(children[1]);for(const [value,label]of [['received','收到的信'],['sent','寄出的信']]){const button=tabs.find('[data-value="'+value+'"]');button.find('text').remove();button.contents().filter((_,n)=>n.type==='text').remove();button.append('<text>'+label+'</text>');}
  $(children.slice(2)).remove();content.append(`<view wx:if="{{!visibleLetters.length}}" class="qa-card qa-empty">{{mailTab === 'sent' ? '还没有寄出的信。写下想对TA说的话吧。' : '还没有收到信件，月亮邮局会安静等候。'}}</view><view wx:for="{{visibleLetters}}" wx:key="id" class="qa-card"><button class="qa-letter-open" bindtap="onAction" data-action="openLetter" data-value="{{item.id}}"><view class="qa-section-title">{{item.title}}</view><text>{{item.locked ? '尚未到启封时间 · 查看信封' : '打开信件 ›'}}</text></button><button wx:if="{{item.mine}}" class="qa-link" bindtap="onAction" data-action="deleteRecord" data-value="letters_meta:{{item.id}}">删除寄出记录</button></view><view class="local-sent-card qa-caption" wx:if="{{mailTab === 'sent' && sentTitle}}">最近寄出：{{sentTitle}}</view><view class="qa-card qa-caption" wx:if="{{!cloudMode && mailTab === 'sent' && legacySentTitle && !letters.length}}">历史演示标题：{{legacySentTitle}}。旧版未保存这封信的完整正文。</view>`+history);
 }
 if(key==='reunion'){
  replaceText('2025.06.01 · 杭州东站出站口','{{meetingDate || "还没有约定见面日期"}}');replaceText('小林','{{mine}}');replaceText('念念','{{partner}}');replaceText('距离相见倒计时','{{meetingLabel}}');replaceText('12','{{meetingDate ? meetingDays : "—"}}');replaceText('08 小时 45 分钟 18 秒','{{meetingDate || "点击下方设置日期"}}');
  $(children[1]).append('<picker mode="date" value="{{meetingDate || today}}" start="{{today}}" bindchange="onDate" data-field="meetingDate"><view class="qa-date-action">设置 / 修改见面日期 ›</view></picker>');
  $(children[2]).attr('wx:if','{{showExamples && !cloudMode}}').before(examples);$(children[4]).attr('wx:if','{{showExamples && !cloudMode}}');
  replaceText('全部记录','设计示例记录');replaceText('已在春日微风里完成 ✨','{{wishes[0] ? "已完成 ✨" : "期待一起完成"}}');
  $('.extra-wish').replaceWith('<view wx:for="{{extraWishes}}" wx:key="id" class="qa-wish"><button class="qa-wish-text" bindtap="onAction" data-action="extraWish" data-value="{{item.id}}">{{item.done ? "✓ " : "○ "}}{{item.text}}</button><button class="qa-link" bindtap="onAction" data-action="deleteWish" data-value="{{item.id}}">删除</button></view>');
 }
 if(key==='us'){
  replaceText('FOREVER','相伴');replaceText('距下一个年鉴还有 245 天','距下一个纪念日还有 {{anniversaryDays}} 天');
  const grid=$(children[1]).children().eq(1);grid.addClass('qa-milestones');grid.children().eq(0).remove();
  replaceText('2023.12.28','{{anniversary || "待设置"}}');replaceText('2024.04.06','{{hundredDate || "待设置"}}');replaceText('2024.12.28','{{yearDate || "待设置"}}');
  $(children[2]).remove();$(children[3]).attr('wx:if','{{showExamples && !cloudMode}}');$(children[1]).after(storyCards+history+examples);
 }
 if(key==='bind'){
  $('#state-btn-waiting').parent().addClass('qa-debug');$('#state-btn-waiting').parent().parent().attr('wx:if','{{showExamples && !cloudMode}}').before(examples);
  $('.mock-notice').text('{{cloudMode ? "仅限两个账号；请核对申请后确认" : "本机绑定演示：密令不会连接真实账号"}}');
  replaceText('晴空 (我)','{{mine}}（我）');replaceText('念念','申请者');$('#partner-input').attr('maxlength','32').attr('placeholder',"{{cloudMode ? '输入24位密令' : 'STAR-520-LOVE'}}");
  $('#countdown-timer').text('{{cloudMode ? "24小时内有效" : "仅本机演示"}}');
  replaceText('30分钟内有效 · 单次使用后立即销毁加密','{{cloudMode ? "24小时有效 · 确认后失效" : "本机密令不能邀请另一台手机"}}');replaceText('微信一键发送给 TA','复制密令，发给 TA');replaceText('输入对方发给你的 6 位邀请码或星空密令','{{cloudMode ? "输入对方发给你的24位密令" : "输入本机演示密令"}}');replaceText('点击连接后双方将即时收到双向通知，完成空间激活','提交后需由创建者确认；前台定时刷新申请状态');replaceText('实时监测中','前台刷新');replaceText('已向宇宙天网发射星光共振信号。对方打开专属链接或输入密令时，星宿即可瞬间交汇。','请先生成密令并发给对方；收到申请后核对，再确认绑定。');replaceText('该星光密令已超出30分钟有效期，或密令已被使用/输入错误。','请检查密令是否正确、已过期或已使用。');
 }
 if(key==='editor'){
  $('image[src="{{photo}}"]').attr('wx:if','{{photo}}');content.prepend('<button wx:if="{{!photo}}" class="qa-card qa-empty" bindtap="onAction" data-action="photo">添加今天的照片 ＋</button>');
  content.append('<view class="qa-caption">{{selectedTag}}</view>');
 }
 if(key==='compose'){
  replaceText('致亲爱的念念：','致亲爱的{{partner}}：');replaceText('寄件人：小林','寄件人：{{mine}}');replaceText('写于 2024.05.20','写于 {{today}}');replaceText('预定开启：2025.06.01 儿童节',"{{delivery === 'future' ? '预定开启：' + openAt : '立即投递'}}");replaceText('186 字','{{content.length}} 字');replaceText('2025.SPEC','ONLY US');replaceText('本地信件演示','{{cloudMode ? "云端投递" : "本机信件"}}');replaceText('当前：第 3 阶段','当前：草稿');
  replaceText('月亮邮局信件将在设定的时刻在接入云端后支持定时开启','{{cloudMode ? "未来信件由服务器校验启封时间" : "本机模式，信件不会投递到另一台手机"}}');
  $('.selection-hint').text("{{delivery === 'future' ? '按约定日期启封' : '立即投递'}} · {{content.length}} 字");
  const life=content.children().filter((_,e)=>$(e).text().includes('信件时光生命周期'));life.attr('wx:if','{{showExamples}}').before(examples);content.prepend(action('保存草稿到本机','saveLetter'));
 }
 if(key==='waiting'){

  // The real list is authoritative; waiting must never assert that a draft was delivered.
  content.prepend('<view class="qa-card"><view class="qa-section-title">{{moments.length ? "已记录的平行时刻" : "还没有发布今天"}}</view><text>{{cloudMode ? "以共同空间的记录为准，双方发布后可开启悄悄话" : "本机模式：另一台手机不会收到这些记录"}}</text></view>');
  content.children().slice(1).attr('wx:if','{{!cloudMode}}');
  if(true)content.append(`<view wx:if="{{cloudMode}}">${momentCards}</view>`);
 }
 if(key==='letter'||key==='locked'){
  // Sample prose is visually separated from actual records, including direct route access.
  $('.native-screen').children().wrapAll('<view wx:if="{{!cloudMode && !recordId}}" class="qa-examples"/>');
  $('.native-screen').prepend(`<view class="qa-reader" wx:if="{{recordId}}"><view class="qa-card"><view class="qa-section-title">{{letterTitle || '月亮邮局'}}</view><view wx:if="{{!recordLoaded}}" class="qa-empty">正在加载信件…</view><view wx:elif="{{letterLocked}}" class="qa-empty">尚未到服务器设定的启封时间。下拉刷新再次检查。</view><view wx:else class="qa-letter-body">{{letterBody}}</view><text wx:if="{{openAt}}" class="qa-caption">启封日期：{{openAt}}</text></view><button class="qa-primary" bindtap="onAction" data-action="refresh">重新检查启封状态</button><button wx:if="{{!letterLocked}}" class="qa-link" bindtap="onAction" data-action="favoriteLetter">珍藏 / 取消珍藏</button><button class="qa-link" bindtap="onAction" data-action="back">返回月亮邮局</button></view><view wx:elif="{{cloudMode}}" class="qa-card qa-empty">请从月亮邮局选择一封真实信件。</view>`);
  replaceText('珍藏信件（永久留存）','珍藏信件');
 }
 // Every page exposes honest mode and recovery controls; no placeholder cloud success.
 $('.native-screen').prepend(notice);
 $('button[data-action]').each((_,e)=>{const el=$(e);if(['sendLetter','publishMoment','saveProfile','saveMood','newCode','join','accept','reject','hug','wish','extraWish','loadMore'].includes(el.attr('data-action')))el.attr('disabled','{{busy}}');if(!el.attr('aria-label'))el.attr('aria-label',el.attr('data-action'));});
 $('state-panel').attr('retryable','{{!!retry}}');
 return require('./feature-views.cjs').upgradePage(key,'<!-- qa-audited: keep behavior in scripts/qa-views.cjs -->\n'+$.xml()+'\n');
}
function auditCss(source){return source.replace(/(?<![\w-])color: rgb\(121 117 127/g,'color: rgb(109 102 118').replace(/(?<![\w-])color: rgb\(124 82 101/g,'color: rgb(105 66 83').replace(/font-size:\s*calc\(([-\d.]+) \* var\(--layout-unit\)\)/g,(_,n)=>`font-size: max(14px, calc(${n} * var(--layout-unit)))`);}
const applyPage=(key,source)=>require('./clean-live-views.cjs').cleanPage(key,applyDesignPage(key,source));
function pruneUnusedUtilities(source){
 const path=require('node:path'),used=new Set();
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='assets')scan(file);}else if(/\.(wxml|ts)$/.test(entry.name))for(const match of fs.readFileSync(file,'utf8').matchAll(/\bu\d+\b/g))used.add(match[0]);}}
 scan(path.resolve(__dirname,'../miniprogram'));
 const root=require('postcss').parse(source);
 root.walkRules(rule=>{const match=rule.selector.match(/^\.(u\d+)(?::[\w()-]+)*$/);if(match&&!used.has(match[1]))rule.remove();});
 root.walkAtRules(rule=>{if(rule.nodes&&!rule.nodes.some(node=>node.type!=='comment'))rule.remove();});
 return root.toString();
}
module.exports={applyPage,auditCss,pruneUnusedUtilities};
if(require.main===module){for(const p of require('./design-map.cjs')){const file='miniprogram/'+p.route+'.wxml';fs.writeFileSync(file,applyPage(p.key,fs.readFileSync(file,'utf8')));}const file='miniprogram/styles/design.wxss';fs.writeFileSync(file,pruneUnusedUtilities(auditCss(fs.readFileSync(file,'utf8'))));}
