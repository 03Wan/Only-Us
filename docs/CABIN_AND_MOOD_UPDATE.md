# 小屋与心情页修复

2026-11-07。本次合并处理同一轮截图反馈。

- 设置面板：为原生滚动区指定明确高度，保留其默认触摸处理，仅在背景遮罩拦截手势。标题固定，底部连接入口可完整显示。
- 小屋信息卡：突出名称，右侧提供日夜切换；下方分开展示双方昵称和相伴天数。点击天数可直接设置相恋日期；与“我们”的相恋纪念日共用同一数据。页面显示期间每 15 秒刷新本机数据，跨午夜自动更新，隐藏页面清理定时器。
- 场景：白天与夜晚使用两张独立插画，太阳与月亮对应实际模式。人物已改为清晰肤色与五官。白天关台灯不会再压暗整个房间；夜晚整体更暗，开灯时保留局部暖光。
- 互动按钮：可选择抱抱、捶背、摸头、牵手、揉肩；选择保存在本机，每种动作分别累计当日次数。原抱抱次数保持兼容，云端新增动作使用共享快照和服务器校验。
- 心情页：心情卡改用整卡按钮并同步选中反馈；快捷短句按内容宽度排布，整条标签换行，文字本身不拆行。保存后返回小屋，未写碎碎念时显示实际选择的心情；云端分享也保留此回显。
- 媒体：发布目录中图片合计 169,349 字节，约 165.4 KB；250 个无引用图标移至 `artifacts/media-originals/`，其余图标使用 48px 调色板 PNG，场景图使用 640px JPEG。高质量原件与被移出资源均有备份。重新生成视图后自动执行优化，测试限制媒体总量低于 200,000 字节。

## 验证

- `npm run check`、`npm run qa:static` 通过；官方原生编译器检查 37 个文件，0 错误。
- `npm test`：103 项测试通过，包括每日动作计数、云端同步、跨午夜刷新、未填写碎碎念的心情回显和媒体体积限制。
- `npm run qa:cabin` 通过。设置面板在 320×568、390×844、430×932 三种尺寸使用真实触摸事件上下滑动，末项完整可见，标题与背景不移动。此处测试针对 Windows 内嵌模拟器校准了触摸坐标，不是直接修改滚动位置。
- 真实点击原生动作菜单选择摸头并累计次数；真实点击心情卡、快捷短句和保存，返回小屋后数据正确回显。快捷标签在三种尺寸均不拆字换行。
- 相恋日期修改后在小屋与我们之间切换，天数一致；另有跨午夜定时器与生命周期测试。
- 四种灯光状态截图的室内采样平均亮度：白天开灯 187.73、白天关灯 187.65、夜晚开灯 143.77、夜晚关灯 101.27。
- 微信开发者工具代码质量重新扫描显示“未发现代码质量问题”。
- 运行记录与截图在 `artifacts/cabin-update/`；所有测试修改的用户本机缓存均已逐键恢复。

云端代码经过内存后端测试；本次未部署云函数，启用云端时需更新 `gateway`。当前项目仍使用本机模式。

## 插画来源与最终提示词

使用内置 `image_gen` 工具编辑现有插画。最终项目资源为：

- [白天插画](../miniprogram/assets/photos/cabin-day.jpg)
- [夜晚插画](../miniprogram/assets/photos/cabin-night.jpg)

原始生成 PNG 保存在 Codex generated_images 目录，项目资源经裁去画面外标题白边、等比缩放及 JPEG 压缩后使用。原场景图仍保留供旧本机故事引用。

夜晚版最终提示词：

```text
Use case: precise-object-edit. Edit the supplied cozy cabin illustration. The user dislikes that the two people have solid dark-brown silhouette faces. Keep the exact scene, layout, all furniture, blanket, hugging pose, hairstyle silhouettes, window frame, moon and stars, lamp, plants, photos, and the original storybook watercolor style. Change ONLY the two people's visible skin (faces, necks and any visible hands/feet) from solid dark silhouette fill to clearly readable warm natural soft peach / light tan skin, with delicate brown line-art facial features, small calm closed eyes and gentle smiles, subtle pink cheeks and soft warm shading. The hair should remain dark chestnut brown and visibly distinct from the skin. The male on the left has his face turned softly toward the female; the female on right has a small closed smile. Faces must look like drawn people, NOT solid-black or dark-brown cutout silhouettes, NOT faceless shapes. Keep clothing and blanket cream colored, do not add body parts, do not change the hugging pose. Preserve the crescent MOON, stars, purple NIGHT sky and cozy warm light exactly as night scene. Preserve aspect ratio and overall image framing. No new UI elements. Single complete night illustration.
```

白天版最终提示词（以已修复人物的夜晚版为输入）：

```text
Use case: lighting-weather. Create the DAYTIME version of this exact night illustration. The supplied image is the edit target. Preserve the two people's faces, peach/light tan skin, delicate facial features, chestnut hair, cream blanket, pose and proportions EXACTLY. Preserve every piece of furniture, table, cups, lamp, photos, plants, window frame, texture, white margin and title and exact geometry. Change ONLY the view through the arched window and the ambient lighting: replace the purple night sky with pale blue daytime sky and soft white clouds; replace the crescent moon in the upper left-center pane with one clearly visible golden CIRCULAR SUN with a few delicate rays at the same position; remove ALL stars and crescent moons. Illuminate the unchanged cabin with natural soft daytime light. Keep lamp but minimize dramatic artificial lamp beam. Keep the same watercolor storybook illustration style and aspect ratio. Do NOT change people into silhouettes: their faces must keep their clearly readable natural skin and facial features. Single complete daytime scene, no comparison sheet.
```
