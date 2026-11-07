# 云开发接入、兼容与备份说明

2026-11-07 更新。`gateway` 已包含可测试的业务实现；当前客户端为 `mode: 'local'`、空 `cloudEnvId`、`storageEnabled: false`。本次没有连接、部署或修改任何线上环境。代码级模拟测试不代表真实云服务验收通过。

## 先备份，优先使用独立测试环境

1. 使用自己的微信小程序 AppID 和 CloudBase **测试环境**，不要复用其他人的环境或凭据。项目当前已有 AppID，未改动。
2. 若目标环境已经有数据，先在控制台导出相关集合及规则、索引、函数配置，保存导出时间与环境 ID；存储文件另备份对象清单及文件。核对导出可读后再考虑部署。代码恢复点不能替代云数据备份。
3. 本次未提供自动迁移脚本。旧 `spaces` 缺少 `schemaVersion: 1`、`state` 时，业务会返回 `SCHEMA_REVIEW_REQUIRED`，拒绝覆盖旧数据；需要先逐字段制定兼容映射并在独立副本验证，不能直接给生产文档补版本字段绕过门禁。
4. 云数据库和存储规则继续默认拒绝客户端读写，禁止为解决报错改成公开。服务端 SDK 有管理员权限，必须保留网关自己的 OPENID、成员及记录鉴权。

## 实现实际使用的集合

以下是**新增代码所需模型**，不是对线上现状的断言。没有自动创建这些集合。未使用历史规划中的独立 `moods/wishes/notes` 集合，这些数据在空间状态中。

| 集合 | 关键字段 / 主键 | 用途 |
| --- | --- | --- |
| users | `_id=服务器OPENID`, spaceId | 账号所在空间，前端不能选择授权身份 |
| spaces | schemaVersion=1, status, memberOpenids, version, state, inviteId, requestedBy | pending时仅创建者，active时恰两名唯一成员 |
| invites | `_id=SHA256(24位随机密令)`, ownerOpenid, spaceId, expiresAt, used, revoked | 24小时密令，申请和确认分离 |
| operations | `_id=SHA256(OPENID:requestId)`, fingerprint, result, createdAt | 重试幂等；不保存明文邀请密令 |
| rate_limits | `_id=SHA256(join:OPENID)`, at | 邀请尝试限速 |
| files | 空间/所有者/内容哈希主键, spaceId, ownerOpenid, fileID, createdAt | 上传归属、签名、内容去重 |
| moments | 空间/日期/作者哈希主键, spaceId, authorOpenid, dayKey, content, photos, privateNote, createdAt, deleted | 每人每天一份日常，可修改 |
| letters_meta | 幂等操作主键, spaceId, authorOpenid, recipientOpenid, title, status, openAt, paper, createdAt, deleted | 列表不含正文 |
| letters_body | 与metadata相同主键, spaceId, content, deleted | 权限及服务器时间校验后才读取 |
| stories | 幂等操作主键, spaceId, authorOpenid, content, createdAt, deleted | 回忆列表/详情/作者删除 |

`spaces.state` 含 names[2]、avatars[2]、anniversary、cabinName、note、meetingDate、wishes[4]、extraWishes、moods、hugs、favorites。names/avatars按成员顺序保存，返回时映射为调用者的mine/partner。共同状态通过整数version防止旧版本覆盖，不进行隐式合并。

对 `moments / letters_meta / stories` 验证 `spaceId + deleted + createdAt(desc)` 查询索引，实际网关使用 `deleted != true`，每页10条；索引是否需要额外字段以测试环境实际提示为准。旧记录字段差异必须先审查。新增心愿上限100个、每人珍藏最多200个，正文有长度校验。

## 测试环境接入步骤（本次未执行）

1. 备份/创建测试环境及上表10个集合，设置查询索引。集合数据库读写使用 `database.rules.json` 的拒绝策略，存储应用 `storage.rules.json`，函数调用参考 `functions.rules.json`；规则模板不会自行生效。
2. 在 `cloudfunctions/gateway` 执行 `npm ci` 安装锁定依赖，再使用微信开发者工具上传/部署 gateway。锁文件解析 `wx-server-sdk 3.0.4`，运行时、事务、单文档set语义和函数调用限制要在测试环境验收。推荐选择平台支持的 Node.js 18或更高版本。
3. 将 `miniprogram/config/env.ts` 设置为 `mode: 'cloud'`、自己的 `cloudEnvId`。完成存储规则后设置 `storageEnabled: true`。没有启用存储时不会伪报上传成功。
4. 以两名真实测试者 A/B 打开：A生成密令并自行发给B，B提交申请，A核对后确认；不使用演示状态按钮代替绑定。不通过工具代发微信消息。
5. 云模式从空空间开始，手动设置双方昵称、纪念日、见面日期。不会把本机演示草稿、样例照片或假历史自动迁入云端。
6. 执行 QA_TEST_REPORT 中 A/B/C 权限、读写、故障与真机矩阵，通过后再决定生产部署。

## 安全协议与边界

- 身份唯一来源为 `cloud.getWXContext().OPENID`；`event.userId/openid/spaceId` 不能授权访问。
- 所有共享读写先查users，再校验active空间及恰两名唯一成员；逐记录核对spaceId；删除只允许作者，采用逻辑删除，不物理清空记录或文件。
- 绑定在事务内更新双方users与空间成员，不能并发加入第三人。邀请明文只返回给创建者、保存在其本机；服务端仅保留密令哈希。创建邀请响应丢失后可能需要重新生成密令，旧密令随再生成撤销。
- 未来信件列表只有元数据。作者可读自己的信；收件人必须到服务器北京时间openAt后才读取正文。修改本机日期、页面data或猜记录ID不能授权读取。
- 平行时刻私语只在作者本人查看或双方当日记录均存在时返回；删除配对记录后重新锁定。照片本身属于共同空间，不属于未来信件附件系统；当前没有信件附件功能。
- 图片经网关验证JPEG/PNG头和≤1MB大小，内容哈希去重后写入空间路径；下载URL在成员检查后生成，有效300秒。客户端最多缓存100个签名、240秒，撤权错误时清除。已签出的URL在有效期内仍可能有效，不能把它描述为即时撤销。
- 草稿和请求重试签名存于本机未加密缓存；云端快照不落磁盘缓存。云环境与演示草稿使用不同键前缀。
- 前台每15秒重取，显示/下拉/按钮可立即刷新；隐藏和卸载取消轮询。没有使用数据库watch，不开放客户端集合读取权限。同步不是后台实时推送，也没有微信订阅消息或音乐播放。
- 自动文件回收、账号转移、编辑已寄出信件、未来信件附件均未实现。解绑会保留原空间数据，但撤销双方访问；本机清理不删除云端数据。不要用它们作为当前可用功能；旧文件/幂等记录清理必须先备份和分析引用关系。

SDK依据：[微信服务端SDK类型与接口](https://github.com/wechat-miniprogram/wx-server-sdk/blob/master/index.d.ts)、[CloudBase事务限制](https://docs.cloudbase.net/database/transaction)、[存储签名说明](https://docs.cloudbase.net/en/storage/sdk)。这些说明用于代码适配，不能替代本项目目标环境的实际验证。
