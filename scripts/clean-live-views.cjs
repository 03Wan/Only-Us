const fs=require('node:fs'),cheerio=require('cheerio');
const serialize=$=>$.xml().replace(/\{\{[\s\S]*?\}\}/g,s=>s.replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"'));
const action=(text,name,value='')=>`<button class="qa-link" bindtap="onAction" data-action="${name}" data-value="${value}">${text}</button>`;
function emptyEditor(key,$){if(key==='editor')$('.native-content').children().filter((_,e)=>$(e).find('image').filter((_,img)=>$(img).attr('src')==='{{photo}}').length>0).attr('wx:if','{{photo}}');}
function cleanPage(key,source){
 if(source.includes('live-data-only-v3'))return source;
 if(source.includes('live-data-only-v1')||source.includes('live-data-only-v2')){const $=cheerio.load(source,{xmlMode:true,decodeEntities:false});$('*').filter((_,e)=>($(e).attr('wx:if')||'').includes('legacySentTitle')).remove();emptyEditor(key,$);return '<!-- live-data-only-v3 -->\n'+serialize($).replace(/<!-- live-data-only-v[12] -->\s*/g,'');}
 const $=cheerio.load(source,{xmlMode:true,decodeEntities:false}),content=$('.native-content'),screen=$('.native-screen');
 $('[data-action="showExamples"],.qa-examples,.qa-debug').remove();
 $('*').filter((_,e)=>($(e).attr('wx:if')||'').includes('showExamples')).remove();
 $('[data-action="mockShare"]').attr('data-action','copyCode');
 $('*').filter((_,e)=>($(e).attr('wx:if')||'').includes('legacySentTitle')).remove();
 const replace=(from,to)=>$('*').contents().filter((_,n)=>n.type==='text').each((_,n)=>{n.data=n.data.split(from).join(to);});
 if(key==='cabin'){
  replace('{{cabinName}}',"{{cabinName || '我们的小屋'}}");
  replace('第 {{loveDays}} 天',"{{anniversary ? '第 ' + loveDays + ' 天' : '设置纪念日'}}");
  replace('{{mine}} & {{partner}} · {{anniversary}} 至今 ✨',"{{anniversary ? (mine || '我') + ' · ' + (partner || 'TA') + ' · ' + anniversary + ' 至今' : '设置你们的昵称与纪念日'}}");
  for(const label of ['未采集位置','未读取电量','充能状态','元气饱满','保存后更新'])$('*').filter((_,e)=>!$(e).children().length&&$(e).text().trim()===label).remove();
  replace('{{moodNote}}',"{{moodNote || '还没有记录心情'}}");replace('{{note}}',"{{note || '还没有便签，写下想对TA说的话吧。'}}");
  for(const [from,to]of [['林','我'],['念','TA']])$('*').contents().filter((_,n)=>n.type==='text'&&n.data.trim()===from).each((_,n)=>{n.data=to;});
  $('#roomContainer').find('text').filter((_,e)=>$(e).text().includes('歌单装饰')).closest('view').remove();
 }
 if(key==='us'){
  replace('相恋第',"{{anniversary ? '相恋第' : '相恋纪念日'}}");replace('{{loveDays}}',"{{anniversary ? loveDays : '—'}}");
  replace('距下一个纪念日还有 {{anniversaryDays}} 天',"{{anniversary ? '距下一个纪念日还有 ' + anniversaryDays + ' 天' : '设置日期，记录你们的相伴时光'}}");
 }
 if(key==='reunion'){
  if(!$('.data-wish-empty').length)$('#wishlist-container').prepend('<view wx:if="{{!wishRows.length}}" class="data-wish-empty qa-empty">还没有心愿，添加一件想一起做的事吧。</view>');
 }
 if(key==='editor'){
  content.children().filter((_,e)=>$(e).text().includes('2025.05.20')).replaceWith('<view class="data-record-heading"><text>{{today}}</text><text>记录今天</text></view>');
  $('*').filter((_,e)=>!$(e).children().length&&$(e).text().includes('演示距离')).remove();
 }
 if(key==='profile'){
  for(const field of ['avatar0','avatar1'])$('image').filter((_,e)=>$(e).attr('src')==='{{'+field+'}}').each((_,e)=>{const image=$(e),placeholder=$('<view/>').attr('class',(image.attr('class')||'')+' data-avatar-empty').attr('wx:else','').text(field==='avatar0'?'我':'TA');image.attr('wx:if','{{'+field+'}}');image.after(placeholder);});
 }
 if(key==='waiting'){
  content.empty().append(`<view class="qa-card"><view class="qa-section-title">今天的记录</view><text class="qa-caption">{{cloudMode ? '以共同空间的记录为准' : '记录保存在当前设备'}} </text></view><view wx:if="{{!moments.length}}" class="qa-card qa-empty">还没有发布记录，先留下今天的一刻吧。</view><view wx:for="{{moments}}" wx:key="id" class="qa-card"><view class="qa-caption">{{item.dayKey}}</view><view class="qa-photo-grid"><image wx:for="{{item.photos}}" wx:for-item="url" wx:key="*this" src="{{url}}" mode="aspectFill"/></view><view class="qa-body">{{item.content}}</view></view>${action('继续记录','route','editor')}${action('返回日常','route','moments')}`);
 }
 if(key==='letter'||key==='locked'){
  screen.children().filter((_,e)=>!$(e).hasClass('qa-reader')&&!$(e).hasClass('qa-status')).remove();
  screen.append(`<view wx:if="{{!recordId}}" class="qa-card qa-empty">请从月亮邮局选择一封信件。${action('返回月亮邮局','route','mailbox')}</view>`);
 }
 if(key==='bind'){
  $('.mock-notice').remove();
  for(const [from,to]of [['念','TA'],['心率共鸣已就绪 · 等待星光锁合','等待另一半连接']])$('*').contents().filter((_,n)=>n.type==='text'&&n.data.trim()===from).each((_,n)=>{n.data=to;});
  content.children().wrapAll('<block wx:if="{{cloudMode}}"/>');
  content.prepend(`<view wx:if="{{!cloudMode}}" class="qa-card data-bind-empty"><view class="qa-section-title">暂未连接云服务</view><view class="qa-body">当前可以在本机记录生活。连接云服务后，才能生成真实邀请并绑定另一半。</view>${action('设置我的资料','route','profile')}</view>`);
 }
 replace('{{mine}}',"{{mine || '我'}}");replace('{{partner}}',"{{partner || 'TA'}}");
 for(const [from,to]of [['例如：初次相识','填写故事标题'],['例如：图书馆、海边、某个街角','记录发生的地点'],['placeholder="晴"','placeholder="记录天气"']]){if(from.startsWith('placeholder='))$('input[data-field="storyWeather"]').attr('placeholder','记录天气');else $('[placeholder]').each((_,e)=>{const v=$(e).attr('placeholder');if(v?.includes(from))$(e).attr('placeholder',v.replace(from,to));});}
 $('picker[data-field="departure"],picker[data-field="arrival"]').each((_,e)=>{$(e).find('.feature-input').text("{{ticketForm."+$(e).attr('data-field')+" || '选择时间'}} ›");});
 replace('（本地演示）','');replace('本机模拟立即投递','立即投递');replace('本地演示','本机记录');
 emptyEditor(key,$);
 return '<!-- live-data-only-v3 -->\n'+serialize($);
}
module.exports={cleanPage};
if(require.main===module)for(const page of require('./design-map.cjs')){const file='miniprogram/'+page.route+'.wxml';fs.writeFileSync(file,cleanPage(page.key,fs.readFileSync(file,'utf8')));}
