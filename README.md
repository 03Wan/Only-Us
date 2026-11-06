# 小小宇宙 · Only Us

使用 **TypeScript、WXML、WXSS** 开发的原生微信小程序，把两个人的日常装进一间温暖的小屋：分享心情、写信、收藏故事，记录下一次相见。

**当前默认使用本机模式**，可以离线保存和查看自己的记录。跨设备共享需要自行配置微信云开发环境并部署 `gateway` 云函数；仓库中的云端实现已通过代码级测试，尚未完成真实双设备验收。

| 日间暖阳 | 晚间月光 |
| --- | --- |
| ![白天小屋](miniprogram/assets/photos/cabin-day.jpg) | ![夜晚小屋](miniprogram/assets/photos/cabin-night.jpg) |

## 功能

| 页面 | 可以做什么 |
| --- | --- |
| 小屋 | 切换太阳白天与月亮夜景、开关台灯，选择抱抱、捶背、摸头、牵手或揉肩，查看双方带表情的心情和见面倒计时 |
| 瞬间 | 记录文字与照片、添加标签、收藏日常，按日期查看记录 |
| 信箱 | 编写和保存草稿，选择立即送达或约定未来启封，查看与收藏信件 |
| 见面 | 设置见面日期，编辑跨天车票，添加、修改与完成共同心愿 |
| 我们 | 编辑相识、相恋、百天与周年日期，保存带照片、地点、天气和说明的故事 |
| 小屋设置 | 修改昵称、头像与小屋名称；进入心情、故事、连接等功能，查看隐私与数据说明、关于小屋和项目主页 |

相伴天数与相恋日期共用同一份数据；页面停留期间会刷新日期，跨午夜自动更新。百天与周年默认自动计算，也可分别修改。互动动作分别统计当日次数。

## 快速开始

需要 Node.js 22 或更新版本，以及支持 TypeScript 编译插件的微信开发者工具。

```powershell
git clone https://github.com/03Wan/Only-Us.git
cd Only-Us
npm ci
Copy-Item project.config.example.json project.config.json
```

在微信开发者工具中导入**仓库根目录**，将 `project.config.json` 中的 `appid` 改为自己的小程序 AppID，并保留 TypeScript 编译插件。小程序源码目录为 `miniprogram/`。本机模式不需要配置云环境，也不需要构建 npm。

macOS / Linux 可用 `cp project.config.example.json project.config.json` 复制配置模板。实际 AppID、本机私有配置、依赖目录和测试备份不提交到仓库。

## 本机与云端

| 项目 | 本机模式（默认） | 云端模式（需部署） |
| --- | --- | --- |
| 保存位置 | 当前设备的小程序缓存 | 配置的 CloudBase 环境 |
| 双人共享 | 不会自动发送到另一台手机 | 确认绑定后访问共同空间 |
| 未来信件 | 用于当前设备的本机记录 | 收件人按服务器时间校验启封权限 |
| 记录迁移 | 保留本机资料与草稿 | 不会自动导入本机记录 |

云端接入：

1. 按 [云开发说明](docs/CLOUDBASE.md) 准备自己的测试环境、集合、索引及访问规则。
2. 在 `cloudfunctions/gateway` 执行 `npm ci`，再通过微信开发者工具部署 `gateway`。
3. 修改 `miniprogram/config/env.ts`：设置 `mode: 'cloud'` 和自己的 `cloudEnvId`；需要上传照片时完成存储配置并启用 `storageEnabled`。
4. 使用两个真实测试账号验证邀请确认、共享记录、隐私开关、未来信件、照片权限和断网恢复，再考虑正式使用。

云数据库和存储规则默认拒绝客户端直接读写，业务通过服务端身份与小屋成员校验。请勿通过开放数据库规则绕过权限检查。

## 开发与验证

```powershell
npm run check          # 项目结构、资源引用与 TypeScript
npm test               # 本机、云端、日期、权限、交互与媒体体积测试
npm run qa:static      # 扫描模板中的事件绑定与交互入口
npm run check:native   # 使用已安装的微信官方 WXML/WXSS 编译器
```

`check:native` 可通过 `WECHAT_COMPILER_DIR` 指定含 `wcc.exe`、`wcsc.exe` 的目录；该检查需要安装微信开发者工具，不属于普通 Node.js 环境自带功能。

打开项目并启用开发者工具 CDP 端口 `9222` 后，可执行 `npm run qa:cabin` 验证模拟器中的实际点击、滚动、日夜亮度、心情保存和相伴天数。其他流程检查见 `package.json` 中的 `qa:*` 命令。模拟器结果不等同于实体手机或线上云环境验收。

测试产生的截图、原图及缓存备份仅存放在被 Git 忽略的 `artifacts/`。UI 测试会备份并恢复本机数据，建议使用独立测试环境。含用户记录的原始运行报告也不上传。

### 资源与重新生成

```powershell
npm run assets:optimize  # 压缩插画和图标，检查发布媒体总量
npm run generate:views  # 从设计稿重新生成，并重新应用交互、样式和资源优化
```

发布目录的图片与音频总量限制在 **200,000 字节以内**，测试会检查这一限制。原始设计在 `stitch_only_us/`，新增小屋日夜插画由 AI 基于现有插画编辑；图标来自 Material Symbols / Material Design Icons。来源与第三方依赖见 [素材说明](docs/THIRD-PARTY.md)。

## 目录

```text
miniprogram/
  pages/                 五个主页面
  subpackages/           资料、绑定、心情、编辑器和信件详情
  shared/                页面控制器、日期、心情与互动逻辑
  services/              本机数据、兼容处理和云调用
  components/            导航与反馈组件
  styles/                设计样式与公共布局
  assets/                发布所需插画与图标
cloudfunctions/          网关业务、身份校验及访问规则
scripts/                 视图生成、资源优化、检查与模拟器验证
tests/                   Node.js 自动测试
docs/                    架构、接入说明及版本记录
stitch_only_us/           原始设计文件
```

## 数据与隐私

本机缓存没有端到端加密；清理缓存或卸载可能造成记录丢失。云端模式下，关闭心情分享后不会向另一半返回心情内容及表情。未来信件通过服务器时间校验，删除记录遵守成员及作者权限。

设置中可以查看“隐私与数据”及“关于小屋”。当前未实现账号注销、解绑和云端数据一键清空，也未接入订阅消息、后台推送、位置追踪或电量采集。

更多说明：[架构](docs/ARCHITECTURE.md) · [数据兼容](docs/DATA_ONLY.md) · [小屋与心情更新](docs/CABIN_AND_MOOD_UPDATE.md) · [GitHub 项目主页](https://github.com/03Wan/Only-Us)
