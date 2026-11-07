const fs = require('node:fs');
const cheerio = require('cheerio');
const icon = (file, cls = '') => `<image class="${cls}" src="/assets/icons/${file}.png" mode="aspectFit"/>`;
const serialize = $ => $.xml().replace(/\{\{[\s\S]*?\}\}/g, s => s.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"'));

const milestones = [
  ['firstMet', '故事开篇', '初次相识', 'menu_book-5d2fb1ef'],
  ['anniversary', '告白纪念', '正式在一起', 'favorite-876e38f1'],
  ['hundredDate', '百日光阴', '百天纪念', 'celebration-319fc4ed'],
  ['yearDate', '四季轮转', '周岁年鉴', 'cake-8177d80e'],
].map(([field, caption, title, image]) => `<picker class="milestone-picker milestone-${field}" mode="date" value="{{${field} || today}}" ${['firstMet','anniversary'].includes(field) ? 'end="{{today}}"' : ''} bindchange="onDate" data-field="${field}" disabled="{{busy}}" aria-label="设置${title}日期"><view class="milestone-card"><view class="milestone-top"><text>${caption}</text><view class="milestone-icon">${icon(image)}</view></view><view class="milestone-title">${title}</view><view class="milestone-date">{{${field} || '选择日期'}}</view><view class="milestone-edit">${icon('edit_calendar-e1ac7a37')}<text>设置日期</text><text class="milestone-arrow">›</text></view></view></picker>`).join('');

const settingsRow = (title, description, image, route, tone = '') => `<button class="settings-item ${tone}" bindtap="onAction" data-action="settingsRoute" data-value="${route}" disabled="{{busy}}" hover-class="settings-item-pressed"><view class="settings-item-icon">${icon(image)}</view><view class="settings-item-copy"><view class="settings-item-title">${title}</view><view class="settings-item-description">${description}</view></view><text class="settings-item-arrow">›</text></button>`;
const settings = `<view class="settings-home"><view class="settings-home-top"><view class="settings-home-symbol">${icon('cottage-5955f0b4')}</view><text class="settings-home-label">只属于我们的空间</text><view class="settings-connection"><view class="settings-status-dot {{bound ? 'settings-status-connected' : ''}}"/><text>{{bound ? '已连接' : '待连接'}}</text></view></view><view class="settings-home-name">{{cabinName || '我们的小屋'}}</view><view class="settings-home-people"><view class="settings-avatar"><image wx:if="{{avatar0}}" src="{{avatar0}}" mode="aspectFill"/><text wx:else>我</text></view><view class="settings-avatar settings-avatar-partner"><image wx:if="{{avatar1}}" src="{{avatar1}}" mode="aspectFill"/><text wx:else>TA</text></view><text>{{(mine || '我') + ' · ' + (partner || 'TA')}}</text></view></view><view class="settings-group-label">我们的小屋</view><view class="settings-group">${settingsRow('小屋资料', '昵称、头像与小屋名称', 'cottage-5955f0b4', 'profile')}${settingsRow('值得纪念的日子', '相识、相恋、百天与周年', 'calendar_month-5205f342', 'us', 'settings-tone-rose')}${settingsRow('下一次相见', '见面日期、车票与共同心愿', 'flight_takeoff-474d0a7d', 'reunion')}</view><view class="settings-group-label">记录与连接</view><view class="settings-group">${settingsRow('故事与照片', '收藏每一个一起走过的瞬间', 'photo_library-81543b9e', 'us')}${settingsRow('心情与分享', '今日心情与对方可见范围', 'favorite-876e38f1', 'mood', 'settings-tone-rose')}${settingsRow('{{bound ? "双人连接" : "连接另一半"}}', '{{bound ? "查看你们的连接状态" : "让两个小宇宙相遇"}}', 'diversity_1-5264f20e', 'bind')}</view><view class="settings-footnote">把平凡的日子，慢慢过成我们的故事。</view>`;

const deliveryOptions = ['now', 'future'].map(value => `<button class="delivery-option {{delivery === '${value}' ? 'delivery-option-selected' : ''}}" bindtap="onAction" data-action="delivery" data-value="${value}" disabled="{{busy}}" hover-class="delivery-option-pressed" aria-label="${value === 'now' ? '立即送达' : '未来开启'}{{delivery === '${value}' ? '，已选择' : ''}}"><view class="delivery-option-top"><view class="delivery-radio {{delivery === '${value}' ? 'delivery-radio-selected' : ''}}">${`<image wx:if="{{delivery === '${value}'}}" src="/assets/icons/check-d216fb8a.png" mode="aspectFit"/>`}</view>${icon(value === 'now' ? 'forward_to_inbox-61bffeb1' : 'hourglass_top-f46c3971', 'delivery-option-icon')}</view><view class="delivery-option-title">${value === 'now' ? '立即送达' : '未来开启'}</view><view class="delivery-option-description">${value === 'now' ? '寄出即可阅读' : '在约定的日子启封'}</view></button>`).join('');
const deliveryDate = `<picker wx:if="{{delivery === 'future'}}" class="delivery-date-picker" mode="date" start="{{tomorrow}}" value="{{openAt}}" bindchange="onDate" data-field="openAt" disabled="{{busy}}"><view class="delivery-date-row"><view class="delivery-date-icon">${icon('calendar_month-5205f342')}</view><view class="delivery-date-copy"><view class="delivery-date-label">约定启封日期</view><view class="delivery-date-value">{{openAt}}</view></view><text class="delivery-date-edit">修改 ›</text></view></picker><view wx:else class="delivery-now-note">${icon('forward_to_inbox-61bffeb1')}<text>{{cloudMode ? '寄出后，对方就能打开这封信。' : '封缄后，即可在本机信箱中阅读。'}}</text></view>`;
const reunion = `<button class="cabin-meeting-card" bindtap="onAction" data-action="route" data-value="reunion" hover-class="settings-item-pressed" aria-label="设置下次见面日期"><view class="cabin-meeting-heading"><view class="cabin-meeting-icon">${icon('flight_takeoff-474d0a7d')}</view><text>下一次，见到你</text><text class="cabin-meeting-arrow">›</text></view><view class="cabin-meeting-body"><view class="cabin-meeting-copy"><view class="cabin-meeting-title">下次见面倒计时</view><view class="cabin-meeting-date">{{meetingDate ? meetingDate + ' · ' + meetingLabel : '把期待，留给一个确定的日子'}}</view></view><view wx:if="{{meetingDate}}" class="cabin-meeting-count"><text>{{meetingDays}}</text><text class="cabin-meeting-unit">天</text></view></view><view wx:if="{{!meetingDate}}" class="cabin-meeting-cta">去设置见面日期 <text>→</text></view></button>`;
const cabinSummary = `<view class="cabin-summary"><view class="cabin-summary-top"><view class="cabin-summary-home">${icon('cottage-5955f0b4')}</view><view class="cabin-summary-name"><view class="cabin-summary-kicker">OUR LITTLE HOME</view><view class="cabin-summary-title">{{cabinName || '我们的小屋'}}</view></view><button id="dayNightToggle" class="cabin-mode-toggle {{daytime ? 'cabin-mode-day' : ''}}" bindtap="onAction" data-action="dayNight" hover-class="native-pressed" aria-label="{{daytime ? '当前白天，切换到夜晚' : '当前夜晚，切换到白天'}}"><image src="{{daytime ? '/assets/icons/wb_sunny-d6cc1085.png' : '/assets/icons/dark_mode-12b14477.png'}}" mode="aspectFit"/><text id="toggleLabel">{{daytime ? '日间暖阳' : '晚间月光'}}</text></button></view><view class="cabin-summary-bottom"><view class="cabin-summary-people"><view class="cabin-summary-avatars"><view class="cabin-summary-avatar"><image wx:if="{{avatar0}}" src="{{avatar0}}" mode="aspectFill"/><text wx:else>我</text></view><view class="cabin-summary-avatar cabin-summary-avatar-partner"><image wx:if="{{avatar1}}" src="{{avatar1}}" mode="aspectFill"/><text wx:else>TA</text></view></view><view class="cabin-summary-person-copy"><view class="cabin-summary-names">{{(mine || '我') + ' 与 ' + (partner || 'TA')}}</view><view class="cabin-summary-caption">把每一天，过成我们的故事</view></view></view><picker class="cabin-summary-days" mode="date" value="{{anniversary || today}}" end="{{today}}" data-field="anniversary" bindchange="onDate" disabled="{{busy}}" aria-label="设置相恋纪念日"><view class="cabin-summary-count"><text class="cabin-summary-count-label">相伴</text><text class="cabin-summary-count-number">{{anniversary ? loveDays : '—'}}</text><text class="cabin-summary-count-unit">天</text></view><view class="cabin-summary-since">{{anniversary ? '自 ' + anniversary : '设置相恋日期'}}<text> ›</text></view></picker></view></view>`;
const moodCards = [
  ['开心','happy','暖阳黄 · 活力充沛','sentiment_very_satisfied-ff630384'],
  ['平静','calm','淡天蓝 · 安宁放松','air-7fce5d6e'],
  ['疲惫','tired','灰紫云 · 需要充电','bedtime-5f43f774'],
  ['想你','miss_you','想把今天分享给你','favorite-876e38f1'],
  ['需要抱抱','hug','奶油珊瑚 · 求安慰','diversity_1-4150d8e0'],
  ['想独处','alone','月下猫咪 · 安静发呆','nightlight-ca1de066'],
].map(([label,value,description,image])=>`<button class="mood-option mood-tone-${value} {{mood === '${label}' ? 'mood-option-selected' : ''}}" bindtap="onAction" data-action="mood" data-value="${label}" data-mood="${value}" disabled="{{busy}}" hover-class="native-pressed" aria-label="${label}{{mood === '${label}' ? '，已选中' : ''}}"><view class="mood-option-top"><view class="mood-option-icon">${icon(image)}</view><view wx:if="{{mood === '${label}'}}" class="mood-option-check">${icon('check-d216fb8a')}</view></view><view class="mood-option-title">${label}</view><view class="mood-option-description">${description}</view></button>`).join('');
const settingsExtra=`<view class="settings-group-label">更多</view><view class="settings-group">${settingsRow('账号与连接','微信身份及双人连接状态','diversity_1-5264f20e','account').replace('settingsRoute','settingsInfo')}${settingsRow('隐私与数据','了解保存、共享与删除方式','lock-bd0eb68c','privacy').replace('settingsRoute','settingsInfo')}${settingsRow('关于小屋','版本、功能与项目主页','cottage-5955f0b4','about').replace('settingsRoute','settingsInfo')}</view>`;
const infoBack=`<button class="settings-info-back" bindtap="onAction" data-action="settingsInfo" data-value="menu">‹ 返回小屋设置</button>`;
const settingsPrivacy=`<view wx:elif="{{settingsSection === 'privacy'}}" class="settings-info-page" id="settings-privacy">${infoBack}<view class="settings-info-intro"><view class="settings-info-symbol">🔒</view><view class="settings-info-title">让记录安心留在小屋</view><view class="settings-info-subtitle">当前为{{cloudMode ? '云端模式' : '本机模式'}} · 更新于 2026-11-07</view></view><view class="settings-info-card"><view class="settings-info-heading">记录保存在哪里</view><view>本机模式下，资料、心情、信件、照片和故事保存在当前设备，不会自动发送给另一台手机。清理小程序缓存或卸载可能导致本机记录丢失。</view><view>连接云端后，你选择保存的共同资料与记录会同步到小屋的云端空间，供已连接的双方查看；本机记录不会自动导入云端。</view></view><view class="settings-info-card"><view class="settings-info-heading">由你决定分享什么</view><view>关闭“同步给TA看”后，对方看不到你的心情及碎碎念。未来信件按约定日期启封，双方私语按相应规则显示。</view><view>照片仅在你主动更换头像或添加图片时选择；不会主动读取相册、通讯录或位置，目前也不采集电量。</view></view><view class="settings-info-card"><view class="settings-info-heading">管理与删除</view><view>已发布的日常、故事和信件可在对应页面删除。清理本机缓存不会删除已有的云端记录。</view><view>可清除本机模式的记录及其专用关联照片，历史缓存文件可能保留；云端数据不受影响。账号注销和云端数据一键清空暂未提供。</view><button class="settings-info-back" bindtap="onAction" data-action="clearLocalData" disabled="{{busy}}">清除本机数据 ›</button></view></view>`;
const settingsAccount=`<view wx:elif="{{settingsSection === 'account'}}" class="settings-info-page" id="settings-account">${infoBack}<view class="settings-info-intro"><view class="settings-info-symbol">♡</view><view class="settings-info-title">账号与连接</view><view class="settings-info-subtitle">{{cloudMode ? '微信云端模式' : '本机模式'}}</view></view><view class="settings-info-card"><view class="settings-info-heading">微信身份</view><view>{{cloudMode ? '云端服务通过当前微信身份识别账号，无需单独输入账号密码。' : '当前使用本机模式，尚未连接微信云端账号；记录只保存在此设备。'}}</view></view><view class="settings-info-card"><view class="settings-info-heading">双人连接</view><view>{{cloudMode ? (bound ? '已连接双人空间。' : '尚未连接双人空间。') : '本机模式无法连接另一台设备。'}}</view><view>解除后原共同空间保留，双方失去访问权限；已获取的临时照片链接最多约 5 分钟后失效。</view><button wx:if="{{cloudMode &amp;&amp; bound}}" class="settings-info-back" bindtap="onAction" data-action="unlink" disabled="{{busy}}">解除双人连接 ›</button></view><button wx:if="{{cloudMode &amp;&amp; !bound}}" class="settings-info-back" bindtap="onAction" data-action="settingsRoute" data-value="bind">前往双人连接 ›</button></view>`;
const settingsAbout=`<view wx:else class="settings-info-page" id="settings-about">${infoBack}<view class="settings-info-intro"><view class="settings-about-logo">${icon('cottage-5955f0b4')}</view><view class="settings-info-title">此间有你 · Only Us</view><view class="settings-info-subtitle">把平凡的日子，慢慢过成我们的故事。</view><text class="settings-version">版本 0.1.0</text></view><view class="settings-info-card"><view class="settings-info-heading">只属于两个人的日常</view><view>一间可以切换日夜的小屋，一份可以分享的心情，一封写给未来的信，还有每次相见前的小小期待。</view><view>抱抱、摸头、捶背，或者记下一页故事，把想念变成看得见的陪伴。</view></view><view class="settings-info-card"><view class="settings-info-heading">当前使用方式</view><view>{{cloudMode ? '你正在使用云端模式。完成双人连接后，共同记录通过云端同步。' : '你正在使用本机模式。记录保存在当前设备，另一半暂时不会收到；连接云端后才能使用跨设备共享。'}}</view></view><button class="settings-project-button" bindtap="onAction" data-action="copyProjectUrl"><view><view class="settings-info-heading">项目主页</view><view>github.com/03Wan/Only-Us</view></view><text>复制 ›</text></button><button class="settings-info-back" bindtap="onAction" data-action="settingsInfo" data-value="privacy">查看隐私与数据说明 ›</button></view>`;

function refinePage(key, source) {
  const $ = cheerio.load(source, { xmlMode: true, decodeEntities: false });
  $('.qa-status').replaceWith(require('./sync-status-view.cjs'));
  if (key === 'us') {
    $('.qa-milestones').attr('class', 'qa-milestones milestone-grid').empty().append(milestones);
    $('button[data-value="profile"]').filter((_, e) => $(e).text().includes('修改相恋纪念日')).replaceWith('<view class="milestone-section-hint">轻点卡片，设置属于你们的纪念日</view>');
  }
  if (key === 'cabin') {
    $('*').contents().filter((_,n)=>n.type==='text'&&n.data.includes("{{moodNote || '还没有记录心情'}}")).each((_,n)=>{n.data=n.data.replace("{{moodNote || '还没有记录心情'}}","{{mood ? (moodNote || mood) : '还没有记录心情'}}");});
    $('view[data-action="route"][data-value="mood"]').filter((_,e)=>$(e).text().includes('moodNote')).replaceWith('<view class="cabin-mood-line" bindtap="onAction" data-action="route" data-value="mood"><text wx:if="{{moodEmoji}}" class="cabin-mood-emoji">{{moodEmoji}}</text><view class="cabin-mood-copy"><view class="cabin-mood-status">{{mood || "还没有记录心情"}}</view><view wx:if="{{moodNote}}" class="cabin-mood-note">{{moodNote}}</view></view><text class="cabin-mood-arrow">›</text></view>');
    $('view').filter((_,e)=>$(e).text()==='{{partnerMood}}'&&!$(e).closest('.cabin-mood-partner').length).replaceWith('<view class="cabin-mood-line cabin-mood-partner"><text wx:if="{{partnerMoodEmoji}}" class="cabin-mood-emoji">{{partnerMoodEmoji}}</text><view class="cabin-mood-copy"><view class="cabin-mood-status">{{partnerMoodKind || partnerMood}}</view><view wx:if="{{partnerMoodKind && partnerMood !== partnerMoodKind}}" class="cabin-mood-note">{{partnerMood}}</view></view></view>');
    const heading = $('.native-cabin-heading').parent();
    if (heading.length) heading.replaceWith(cabinSummary);
    $('#cabinBgImage').attr('src', "{{daytime ? '/assets/photos/cabin-day.jpg' : '/assets/photos/cabin-night.jpg'}}");
    $('#cabinBgImage').attr('style',"position:absolute;inset:0;filter:{{daytime ? 'brightness(1.06) saturate(1.04)' : (lampOn ? 'brightness(0.82) saturate(0.90)' : 'brightness(0.60) saturate(0.80)')}};transition:none;");
    $('#dayOverlay').attr('style',"opacity:{{daytime ? 0.28 : 0}}");
    $('#nightOverlay').attr('style',"opacity:{{daytime ? 0 : (lampOn ? 0.14 : 0.28)}}");
    $('#lampGlow').attr('style',"opacity:{{lampOn ? (daytime ? 0.12 : 1) : 0}}");
    $('#lampShadow').attr('style',"opacity:{{daytime || lampOn ? 0 : 0.35}}");
    $('#hugButton').parent().replaceWith(`<view class="cabin-affection-bar"><button id="hugButton" class="cabin-affection-main" bindtap="onAction" data-action="affection" disabled="{{busy}}" hover-class="cabin-affection-pressed" aria-label="{{affectionLabel}}"><text class="cabin-affection-symbol">{{affectionSymbol}}</text><view><view class="cabin-affection-label">{{affectionLabel}}</view><view id="hugCount" class="cabin-affection-count">今日{{affectionNoun}} {{affectionCount}} 次</view></view></button><button class="cabin-affection-choose" bindtap="onAction" data-action="chooseAffection" disabled="{{busy}}" hover-class="cabin-affection-pressed" aria-label="选择互动动作"><text>换个动作</text><text>⌄</text></button></view>`);
    $('[data-action="route"][data-value="reunion"]').filter((_, e) => $(e).text().includes('下次见面倒计时')).replaceWith(reunion);
  }
  if (key === 'profile') {
    $('button[data-action="avatar"]').each((_,e)=>{const old=$(e);if(old.hasClass('profile-avatar-picker'))return;const i=old.attr('data-value'),field='avatar'+i;old.parent().replaceWith(`<button id="avatar-picker-${i}" class="profile-avatar-picker" bindtap="onAction" data-action="avatar" data-value="${i}" disabled="{{busy}}" hover-class="profile-avatar-pressed" aria-label="${i==='0'?'更换我的头像':'更换另一半的头像'}"><view class="profile-avatar-frame ${i==='1'?'profile-avatar-frame-partner':''}"><image wx:if="{{${field}}}" class="profile-avatar-image" src="{{${field}}}" mode="aspectFill" binderror="onImageError"/><view wx:else class="profile-avatar-placeholder">${i==='0'?'我':'TA'}</view><view class="profile-avatar-camera">${icon('photo_camera-5019a0da')}</view></view><view class="profile-avatar-change"><text>更换头像</text><text>›</text></view></button>`);});
  }
  if (key === 'mood') {
    $('[data-action="mood"]').first().parent().attr('class','mood-grid').empty().append(moodCards);
    const share=$('switch[data-field="shareMood"]');if(share.length&&!share.closest('.mood-share-card').length)share.parent().parent().replaceWith(`<view class="mood-share-card"><view class="mood-share-top"><view class="mood-share-title"><view class="mood-share-icon"><image src="/assets/icons/cottage-6b41a068.png" mode="aspectFit"/></view><text>同步给 TA 看</text></view><switch checked="{{shareMood}}" color="#605487" bindchange="onToggle" data-field="shareMood" class="native-switch" aria-label="同步心情给对方"/></view><view class="mood-share-description">保存后，可在小屋页「今天的我们」查看心情。</view><view class="mood-share-status">{{cloudMode ? (bound ? (shareMood ? '保存后 TA 可以查看' : '保存后 TA 看不到你的心情') : '完成双人连接后可同步给 TA') : '本机模式：不会同步给 TA'}}</view></view>`);
    const quick=$('[data-action="quickMood"]');quick.first().parent().attr('class','mood-quick-options');
    quick.first().parent().parent().addClass('mood-note-card');
    quick.each((i,e)=>{const el=$(e),value=el.attr('data-value');el.attr('class',`mood-quick-chip {{moodNote === '${value}' ? 'mood-quick-chip-selected' : ''}}`).attr('disabled','{{busy}}').attr('aria-label',value).empty().append(`<text>${['☕ 喝了甜水','🎧 听你的歌','✨ 看看黄昏'][i]}</text>`);});
    $('[data-action="saveMood"]').attr('class','mood-save-button').empty().append(`${icon('check_circle-cd96a6de')}<text>{{busy ? '保存中…' : '保存此刻的心情'}}</text>`);
  }
  if (key === 'compose') {
    const options = $('[data-action="delivery"]').first().parent();
    options.attr('class', 'delivery-options').empty().append(deliveryOptions);
    // Replace the original date row and remove the second, duplicate picker.
    if (!$('.delivery-date-picker').length) {
      const pickers = $('picker[data-field="openAt"]');
      pickers.first().parent().replaceWith(deliveryDate);
      pickers.slice(1).remove();
    }
  }
  const summary = $('.feature-settings-summary');
  if (summary.length) summary.parent().empty().append(settings);
  if ($('.settings-home').length && !$('.settings-menu').length) {
    const container=$('.settings-home').parent();container.children().wrapAll('<view class="settings-menu" wx:if="{{settingsSection === \'menu\'}}"/>');
    container.find('.settings-footnote').before(settingsExtra);container.append(settingsPrivacy+settingsAccount+settingsAbout);
  }
  if ($('.settings-menu').length && !$('#settings-account').length) {
    $('.settings-menu [data-action="settingsInfo"][data-value="privacy"]').first().before(settingsRow('账号与连接','微信身份及双人连接状态','diversity_1-5264f20e','account').replace('settingsRoute','settingsInfo'));
    $('#settings-about').before(settingsAccount);
  }
  $('.feature-sheet-header>view').each((_,e)=>{const el=$(e),title=el.text();if(!title.includes('settingsSection'))el.text(title.replace("'小屋设置'","(settingsSection === 'privacy' ? '隐私与数据' : settingsSection === 'about' ? '关于小屋' : '小屋设置')"));});
  $('.feature-sheet-scroll').attr('scroll-top','{{settingsScrollTop}}');
  // Keep the native scroll-view's default touch handling. Only the backdrop
  // should swallow gestures intended to scroll the page behind the sheet.
  $('.feature-overlay').removeAttr('catchtouchmove');
  $('.feature-backdrop').attr('catchtouchmove', 'stopFeatureTouch');
  $('.feature-sheet').each((_, e) => {
    if (!$(e).attr('class').includes('feature-sheet-settings')) $(e).attr('class', $(e).attr('class') + " {{editorKind === 'settings' ? 'feature-sheet-settings' : ''}}");
  });
  return serialize($);
}
module.exports = { refinePage };
if (require.main === module) for (const page of require('./design-map.cjs')) {
  const file = 'miniprogram/' + page.route + '.wxml';
  fs.writeFileSync(file, refinePage(page.key, fs.readFileSync(file, 'utf8')));
}
