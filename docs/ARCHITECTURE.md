# 小小宇宙 Only Us · 架构与开发验收

规划日期：2026-11-06。仅供一对情侣使用；微信原生 TypeScript / WXML / WXSS；后端微信云开发。先完成本地 UI，再接后端。本文件先于第一阶段页面实现建立。

## 资源边界与还原依据

原始资源保留在 `stitch_only_us/`，不修改。逐份检查全部 13 份 HTML 和设计系统，截图清单由资源脚本重新扫描生成。用户补充的第 9 页已匹配心情选择；完整第 6 页附件另存 `_6/screen-full.png`，此前半幅图保留。全部 13 页已有参考截图。

HTML 与 DESIGN.md frontmatter 使用 `#fdf8ff` 背景、`#605487` 主色；DESIGN.md 正文另写 `#FFF8F3` / `#9184BA`。遵循截图与对应 HTML 的实际呈现，保留第 13 页独立奶油信纸色。保留原始照片、插画、图标语义、圆角、卡片和排版，不增加广告、公开社交或位置监控。原型中的距离、城市、天气、电量、日期均为演示数据，不代表实时采集。

## 目录

```text
37/
├─ stitch_only_us/             原始设计（只读保留）
├─ docs/                      资源/路由/交互/验收/云端权限文档
├─ scripts/                   本地素材归档、原生视图转换、结构校验
├─ tests/                     权限边界及模拟状态行为验证
├─ project.config.json        开发者工具入口，游客 AppID
├─ tsconfig.json
├─ miniprogram/
│  ├─ app.ts / app.json / app.wxss
│  ├─ config/                 默认 mock 与云环境占位
│  ├─ assets/                 本地插画、照片、Material Symbols PNG
│  ├─ styles/                 设计 token、原生公共样式
│  ├─ components/             顶部导航、状态反馈等共享组件
│  ├─ custom-tab-bar/         原生自定义五项 tabBar
│  ├─ pages/                  五个主页面
│  ├─ subpackages/            八个二级/状态页面
│  ├─ services/               本地存储与未来云端适配入口
│  ├─ shared/                 页面行为、路由定义、表单验证
│  └─ types/                  领域类型
└─ cloudfunctions/
   └─ gateway/                权限校验入口骨架；未完成写操作一律拒绝
```

## 完整路由（原始页面无遗漏）

| 来源 | 页面 | 路由 | 类型 |
| --- | --- | --- | --- |
| _3 | 小屋 | pages/cabin/index | 主 tab / 启动页 |
| _1 | 平行时刻（双方完成） | pages/moments/index | 主 tab |
| _2 | 月亮邮局 | pages/mailbox/index | 主 tab |
| _4 | 下一站，见你 | pages/reunion/index | 主 tab |
| _5 | 我们的故事 | pages/us/index | 主 tab |
| _6 | 双人星光绑定 | subpackages/connection/bind/index | 二级，待加入/确认/成功/失效 |
| _7 | 首次资料设置 | subpackages/connection/profile/index | 二级，昵称/日期/小屋名 |
| _8 | 记录今天 | subpackages/moments/editor/index | 二级，草稿/发布/失败 |
| _9 | 心情选择 | subpackages/connection/mood/index | 二级，六种心情/独处/同步开关 |
| _10 | 写给未来的信 | subpackages/mail/compose/index | 二级，信纸/草稿/立即/未来 |
| _11 | 平行时刻等待 | subpackages/moments/waiting/index | 状态页，单方提交 |
| _12 | 未解锁信件 | subpackages/mail/locked/index | 状态页，仅信封元信息 |
| _13 | 已解锁信件 | subpackages/mail/letter/index | 二级，阅读/收藏/回复 |

主页面使用 `wx.switchTab`；二级页面使用 `wx.navigateTo`，返回优先 `navigateBack`，无前序页面时返回所属 tab。等待页回瞬间和编辑器均有明确入口。绑定入口放在小屋品牌菜单和我们页的空间菜单。其他引用（照片墙、全部历史、便签等）优先复用已有页面、原生弹窗或本地交互；设计未给独立页面，不假称存在额外设计稿。

## 公共组件和原生转换

- `app-header`：品牌、返回、原生胶囊避让，读取安全区域；不绘制假的微信胶囊。
- `custom-tab-bar`：五个主目的地、选中点、底部安全区、各 tab 的 onShow 同步选中。
- `state-panel`：空态/加载/失败重试/本地模拟状态说明，真实状态由 Page data 控制。
- 全局 `styles/tokens.wxss` 与原生公共样式：卡片、字级、按钮、背景和字号。页面级内容保持各自布局；重复图标资源、路由和业务操作统一复用。
- `services/local-store.ts`：带版本命名空间、本地演示数据/草稿，页面通过服务访问，未来替换云适配器。
- 原生视图转换：把 Web 标签逐一转为 `view/text/image/button/input/textarea/picker/switch`，删除 script、Web 导航、模拟设备边框，转换 utility 样式到 WXSS；不使用 web-view、HTML 渲染器或 CDN Tailwind。原始 onclick 均替换为 bindtap 和 TS 方法。
- 不把整张页面截图铺成 UI。照片/插画是 image，文字、表单、热点和导航可点击且可编辑。
- 375–430px 为设计基准，rpx 流式伸缩；小尺寸另验 320px；顶部从系统状态栏与胶囊位置计算，底部 `env(safe-area-inset-bottom)`。固定按钮区须预留滚动空间。
- 不引入未经授权字体；先用系统中文字体，拉丁字体如可合法本地归档则登记来源，否则记录差异。

## 开发阶段与验收

### 0：盘点与架构（本次先完成）

交付全部页面/资源/交互清单，路由一一映射；记录缺图、颜色冲突和无独立设计的入口；不猜测真实 AppID/环境 ID。

### 1A：首个可运行里程碑（本次）

微信开发者工具导入根目录，游客模式可编译，启动小屋；5 个 tab 和 8 个二级页均可到达；13 份设计都拥有原生文件；图片离线本地加载；无 HTML/WebView 运行依赖；TypeScript 检查与原生编译通过。提供实际编译、打开与截图记录，受工具/登录限制时明确写“未验证”，不得混同静态检查通过。

### 1B：视觉与本地交互（本次尽量完成，差异如实登记）

逐页与原稿比较布局/颜色/图片/字号/圆角/底部导航；六种心情、开关、日夜/台灯、拥抱计数、心愿勾选、收寄切换、草稿恢复、绑定四态、昵称/日期、小屋命名、写信/收藏/回复均本地可操作。操作成功不得冒称已同步对方或完成加密；本地草稿明确为设备缓存。真实信件到期权限尚未接入。375/390/430px、安全区、长文滚动、键盘遮挡有检查记录。缺截图页面不能宣称像素级验收完成。

### 2：双人身份与绑定

提供真实 AppID 和云环境后，再部署；云函数从 `getWXContext().OPENID` 取身份；服务端生成短期随机邀请码（存哈希），30 分钟失效，一次性消费；绑定需双方确认、事务保证最多两人、防重复使用/并发抢占/重放/暴力尝试；账号已绑定不得再加入第三人。验收包含未登录、非成员、伪造用户/空间 ID、过期/重复邀请码、并发两次确认、撤销与解绑流程。

### 3：私密数据、文件与同步

情绪/瞬间/便签/心愿/故事均加服务端推导的 `spaceId`。所有读取/写入/删除/文件签名/订阅都复用成员校验；对象 ID 查到后再次核对所属空间。数据库和存储拒绝客户端直接访问；云函数上传/签名下载（短期）、校验 MIME/大小/文件归属。默认不开放数据库 watch，未来通过经过鉴权的增量云函数轮询/同步令牌。验收两账号互通、第三账号无法访问任何记录或照片、断网重试幂等、冲突提示、分页与缓存清理。

### 4：信件时光胶囊与稳定性

信封元信息与正文分集合；服务器时间决定开启，锁定前不返回正文/附件/可推断预览；作者访问草稿与收件人到期访问分离。不是客户端隐藏文字。验收修改本机时间/直接函数调用/猜 ID 均无法提前读信；确认真正存储策略后才使用“加密”承诺；错误重试、撤回规则、上传失败恢复、数据导出/删除及双方解除关系后访问撤销单独验收。

### 5：真机与发布准备

iOS/Android 两机登录互验；320/375/390/430 宽度、刘海/无刘海、长昵称/空数据/长文/键盘/慢网；真实隐私声明、仅申请实际必要权限；基础库兼容、主包/分包大小、上传审核另行执行。未经用户明确发布要求，不上传或发布版本。

## 需要用户提供的配置

| 配置 | 当前处理 | 何时需要 |
| --- | --- | --- |
| 小程序 AppID | 初始 `touristappid`；用户导入时已配置自己的 AppID，保留现有值 | 真机与云开发 |
| 微信云环境 ID | `miniprogram/config/env.ts` 空串，默认 mock | 阶段 2 |
| 开发者工具登录/开发权限 | 用户自己的微信账号 | 工具要求时扫码；不用其他项目凭据 |
| 云函数部署运行时与地域 | 部署前从控制台确认 | 阶段 2 |
| 存储桶与安全规则 | 默认拒绝客户端，文档提供模板 | 阶段 3 |
| 关系起始日期、昵称、城市 | 原型数据，本地资料可改 | 真实使用前 |
| 订阅消息模板 ID | 不启用，不申请权限 | 用户需要提醒时再提供 |

AppSecret 不应放入小程序、Git 或发给前端；本次不需要 AppSecret，也不复用其他工作区的 AppID。

## 后端边界

首阶段云开关关闭。gateway 骨架仅提供服务器身份解析和受权空间元信息，不开放未完成的业务写操作。`users` 的文档 ID 采用服务端 OPENID；`spaces.memberOpenids` 恰为两人，状态 active 才允许业务读写。云端不能以客户端提供的 userId/partnerId/spaceId 作为授权依据。任何离线/模拟记录不得在未来切云后自动上传。

参考：[CloudBase 数据库安全规则](https://docs.cloudbase.net/database/security-rules)、[云存储安全规则](https://docs.cloudbase.net/storage/security-rules)、[云函数访问控制](https://docs.cloudbase.net/cloud-function/security-rules)。安全规则不能替代云函数中的双人成员校验。

> 2026-11-06 QA更新：此文件中的原阶段记录为历史背景。当前代码实现、实际测试和未完成项以 [QA_AUDIT.md](QA_AUDIT.md)、[QA_TEST_REPORT.md](QA_TEST_REPORT.md)、[CLOUDBASE.md](CLOUDBASE.md) 为准。

