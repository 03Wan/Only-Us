# 素材与依赖

- 原始设计素材来自项目提供的 Stitch 导出 HTML；来源、用途、哈希记录在 `resource-manifest.json`。发布目录只保留实际使用的图片和供旧故事引用的兼容图片，其余设计资源保留在原始设计目录中。
- 当前小屋白天、夜晚插画通过内置图像生成工具基于原插画编辑，处理了人物面部、太阳与月亮及光照。生成提示词见 `CABIN_AND_MOOD_UPDATE.md`；发布版本经过裁边、等比缩放及 JPEG 压缩。
- Material Symbols：`@material-symbols/svg-400`，Apache-2.0。部分旧名称从 `@material-design-icons/svg`（Apache-2.0）读取；`magic_button` 使用同系列 `auto_fix_high`，含义与轮廓接近，登记为图标差异。只在构建时转为 PNG，运行时无需字体 CDN 或 SVG 解析。
- 系统中文字体回退到 PingFang SC / Microsoft YaHei；原稿 Plus Jakarta Sans 未打包，拉丁文字与数字可能有字形差异。
- 构建用 Tailwind CSS（MIT）、Cheerio（MIT）、PostCSS（MIT）、Sharp（Apache-2.0）；均不在小程序运行时执行。原型辅助纹理、投影与渐变来自原始设计样式。
- TypeScript（Apache-2.0）、miniprogram-api-typings（MIT）仅用于编译和检查。

素材归档不是将整页截图作为 UI。页面文字、按钮、输入、热点均为原生组件。
