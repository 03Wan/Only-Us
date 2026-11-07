# 此间有你 · Only Us

此间有你是一款使用 TypeScript、WXML 和 WXSS 开发的原生微信小程序，为两个人提供记录心情、日常、信件和相聚计划的共同空间。

项目默认运行在**本机模式**。本机记录保存在当前设备，不会自动同步给另一位用户。双人共享需要自行配置微信云开发环境并部署云函数；云端功能已通过代码级测试，尚未完成真实双设备及线上环境验收。

| 日间模式 | 夜间模式 |
| --- | --- |
| ![日间小屋](miniprogram/assets/photos/cabin-day.jpg) | ![夜间小屋](miniprogram/assets/photos/cabin-night.jpg) |

## 功能概览

| 模块 | 功能 |
| --- | --- |
| 小屋 | 查看双方资料、心情及相伴天数；切换日夜场景和灯光；记录互动次数；管理分类便签。 |
| 瞬间 | 发布文字和照片，添加标签，按日期查看或收藏日常记录。 |
| 信箱 | 编写信件、保存本机草稿，选择立即送达或约定未来启封。 |
| 见面 | 设置见面日期，管理相见车票，以及添加、编辑和完成共同心愿。 |
| 我们 | 管理相识、相恋、百天和周年日期，记录包含文字、照片、地点及天气的故事。 |
| 设置 | 管理小屋资料、心情分享、账号与连接，查看隐私说明，并清除本机数据。 |

云端模式下，双方需通过密令申请和确认建立连接。解绑后，原共同空间的数据保留，但双方无法继续通过账号访问；已获取的临时照片链接可能在其有效期内继续使用，最长约五分钟。

## 技术栈

- **客户端**：微信原生小程序、TypeScript、WXML、WXSS。
- **云端**：微信云开发、CloudBase 数据库与云存储、Node.js 云函数。
- **开发与测试**：Node.js、TypeScript、Node.js 内置测试运行器及微信开发者工具。

## 环境要求

- Node.js 22 或更高版本及 npm。
- 支持 TypeScript 编译插件的微信开发者工具。
- 使用云端功能时，需要自己的微信小程序 AppID 和云开发环境。

## 快速开始

### 1. 获取代码并安装依赖

```bash
git clone https://github.com/03Wan/Only-Us.git
cd Only-Us
npm ci
```

### 2. 创建开发者工具配置

根据操作系统复制配置模板：

```powershell
# Windows PowerShell
Copy-Item project.config.example.json project.config.json
```

```bash
# macOS / Linux
cp project.config.example.json project.config.json
```

在微信开发者工具中导入**仓库根目录**。小程序源码位于 `miniprogram/`，项目配置模板已启用 TypeScript 编译插件。使用自己的 AppID 时，请修改本机 `project.config.json` 中的 `appid`。

`project.config.json` 和开发者工具私有配置已由 `.gitignore` 排除，不应提交个人 AppID、密钥或其他环境凭据。

### 3. 运行本机模式

默认配置位于 `miniprogram/config/env.ts`：

```ts
export const environment = {
  mode: 'local',
  cloudEnvId: '',
  gatewayFunction: 'gateway',
  storageEnabled: false,
};
```

在开发者工具中编译并运行即可。本机模式无需部署云函数；本机记录和草稿不会自动迁移至云端。

## 云端部署

1. 准备独立的微信云开发测试环境，按[云开发接入说明](docs/CLOUDBASE.md)创建所需集合、索引，并配置数据库、存储和函数访问规则。如目标环境已有数据，应先备份并核对数据结构。
2. 在 `cloudfunctions/gateway/` 安装云函数依赖，并通过微信开发者工具部署 `gateway`：

   ```bash
   cd cloudfunctions/gateway
   npm ci
   ```

3. 将 `miniprogram/config/env.ts` 的 `mode` 设置为 `cloud`，填写自己的 `cloudEnvId`。需要上传图片时，完成云存储配置并启用 `storageEnabled`。
4. 使用两个真实测试账号验证绑定、共享、隐私设置、未来信件、图片访问、解绑及异常恢复，再决定是否用于正式环境。

云数据库与存储规则模板默认禁止客户端直接读写；共享业务通过网关进行微信身份、空间成员和记录权限校验。部署步骤、集合结构、兼容性限制及安全边界详见[云开发接入说明](docs/CLOUDBASE.md)。

## 开发与验证

在仓库根目录执行：

```bash
npm run check          # 检查项目结构、资源引用及 TypeScript 类型
npm test               # 运行自动化测试
npm run qa:static      # 检查页面模板中的事件绑定与交互入口
npm run check:native   # 使用微信官方编译器检查 WXML / WXSS
```

`check:native` 需要安装微信开发者工具；也可以通过 `WECHAT_COMPILER_DIR` 指定包含 `wcc.exe` 和 `wcsc.exe` 的目录。其他模拟器交互检查可通过 `package.json` 中的 `qa:*` 脚本执行，具体依赖和环境要求请参阅对应脚本。模拟器与代码级测试不能替代真实设备及云环境验收。

需要重新处理资源或生成页面时，可执行：

```bash
npm run assets:optimize
npm run generate:views
```

重新生成页面可能影响手工修改，执行后应检查差异并重新验证。发布包中的图片和音频总量由自动化测试检查；素材来源见[第三方与素材说明](docs/THIRD-PARTY.md)。

## 项目结构

```text
miniprogram/
  pages/                 五个主页面
  subpackages/           连接、资料、心情、瞬间与信件等二级页面
  components/            公共组件
  shared/                页面控制、日期、心情与交互逻辑
  services/              本机存储、数据兼容与云端调用
  styles/                公共样式
  assets/                小程序使用的图片和图标
cloudfunctions/
  gateway/               云端业务网关与身份校验
  *.rules.json           云开发访问规则模板
scripts/                 页面生成、资源处理和质量检查脚本
tests/                   自动化测试
docs/                    架构、接入与验证文档
stitch_only_us/          原始设计参考
```

## 数据与隐私

- 本机数据存放于设备的小程序存储，未提供端到端加密；清理缓存或卸载可能导致数据丢失。
- 设置中的“清除本机数据”会清除本机模式的记录、草稿及可识别的专用关联照片，不会删除云端记录；部分历史缓存文件可能保留。
- 云端模式下，共同空间的访问权限由服务端基于微信身份及空间成员关系校验。心情分享关闭时，对方不会收到该心情内容。
- 云端未来信件由服务器时间控制收件人读取；本机模式的信件仅作为本机记录，不会投递至另一台设备。
- 当前未提供账号注销、云端数据一键清空、订阅消息或后台推送。

## 相关文档

- [项目架构](docs/ARCHITECTURE.md)
- [云开发接入、兼容与备份](docs/CLOUDBASE.md)
- [本机数据与兼容说明](docs/DATA_ONLY.md)
- [第三方依赖与素材来源](docs/THIRD-PARTY.md)
- [验证说明](docs/VALIDATION.md)
