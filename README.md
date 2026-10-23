# Mingyang Sun · Personal website

保留原网站的淡灰紫背景、动态 logo 和留白，移除区块的渐变底色。首页姓名与两段 bio 居中，介绍保持单列。精选项目采用无外框的 Spatial 空间预览，与文字列表上下对齐。Projects、Writing 与 Design 使用相同的页面标题、内容起点和作品网格：桌面三列，平板两列，手机一列，页面最大宽度为 1280px。网站由 Astro 静态生成，可以发布到 GitHub Pages。

本次视觉调整的设计思路、CSS 和交互实现说明见 [DESIGN_NOTES.md](./DESIGN_NOTES.md)。

正式域名：[www.myangsun.com](https://www.myangsun.com/)。源码仓库：[Myangsun/Myangsun.github.io](https://github.com/Myangsun/Myangsun.github.io)。网站由 GitHub Pages 托管，域名和 DNS 继续由 Squarespace 管理。

## 本地预览

需要 Node.js 22.12 或更新版本，推荐 Node.js 24。

```sh
npm install
npm run dev
```

终端会显示预览地址，通常是 `http://127.0.0.1:4321/`。本次完成版预览使用 `http://127.0.0.1:4323/`。

```sh
npm run build
npm run preview
```

## 修改网站内容

- 个人介绍与联系方式：`src/lib/site.ts`、`src/pages/index.astro`。
- 项目与设计作品：`src/data/portfolio.json`。已经迁入原网站的 8 个项目与 10 个设计作品。
- 图片：`public/assets/`。现有图片已经复制到本地，页面不依赖原平台的图片服务器。
- 配色、间距、排版：`src/styles/global.css`。
- 字体与全站导航：`src/layouts/Layout.astro`。Space Grotesk 使用本地字体文件。
- 滚动渐入、导航关闭和页头状态：`src/scripts/interactions.ts`。移动导航选择链接、按 Escape 或点击菜单外部时关闭；系统开启减少动态效果时，网站关闭动画。

新增项目时，把 `templates/project.json` 中的对象复制到 `portfolio.json` 数组里，填写真实内容，并把图片放进 `public/assets/`。`category` 为 `projects` 或 `design`。`slug` 必须唯一。研究问题、个人贡献、方法、结果、代码和 demo 都是可选字段，不填写就不会显示。

首页当前显示 Projects 的前六项，可在 `src/pages/index.astro` 调整精选项目。

首页的两段 bio 在 `src/lib/site.ts` 的 `introduction` 中修改，五项研究兴趣在同一文件的 `researchInterests` 中修改，由 `src/components/ResearchInterests.astro` 显示。首页顺序为个人介绍 → 精选项目 → 研究兴趣 → 最新文章（发布后显示）→ 联系方式。介绍区不再放置重复的精选项目跳转链接。

精选项目由 `src/components/SelectedProjects.astro` 显示。桌面上左侧是无边框的作品预览，右侧是六行文字列表，两侧共享顶部和底部基线。手机上预览与列表上下排列。

- 桌面悬停或键盘聚焦项目名称：切换作品图像与简介。
- 点击项目编号：选择预览并触发波纹；手机上自动回到预览。
- 点击项目名称或预览下方的名称：进入项目详情。
- 移动鼠标：图像轻微倾斜和弯曲，光圈跟随指针。
- 点击作品图像：产生立体波纹；点击页面其他位置：产生三层淡紫色扩散圆环。
- 图像按钮支持左右方向键切换项目，Enter 和空格触发波纹。

Three.js 场景在 `src/scripts/project-scene.js`，选择逻辑在 `src/scripts/selected-projects.ts`，项目样式在 `src/styles/project-explorer.css`。场景只有一张曲面图像，使用顶点着色器处理鼠标和点击变形；不再使用卡片边框、立方体或设计切换器。3D 模块在预览进入视野时载入，离开视野或切换标签页时暂停，手机限制渲染像素比。不支持 WebGL 时使用普通封面和 CSS 点击反馈。

全站鼠标效果在 `src/scripts/pointer-effects.ts`，样式在 `global.css`。所有页面共用同一套弹性光圈、三点拖尾和三层点击圆环，移除旋转轨道。光圈在链接上扩大、在首页作品预览上显示 Play。光圈和点击圆环不拦截事件，链接和键盘焦点正常可用；输入区域保留系统指针，触摸设备和系统开启减少动态效果时使用普通指针并关闭跟随与点击动画。Projects 与 Design 的作品图像共用轻微的鼠标透视倾斜。所有项目始终保留真实链接，禁用 JavaScript 时也可以浏览。之前带 `view` 参数的设计对比地址会显示同一个 Spatial 页面，并移除该参数。

## 发布文章

复制 `src/content/writing/first-post.md`，改成文章的文件名，填写文章标题、简介、日期和标签。保留 `draft: true` 时，文章不会出现在网站，也不会生成可访问的文章页面。写好后改为 `draft: false`。

```yaml
---
title: "文章标题"
description: "一句话简介"
date: 2026-10-08
tags: [AI, Engineering]
draft: false
---
```

正文支持 Markdown、代码高亮、图片、表格；`.mdx` 文件可以使用交互组件。文章发布后，会自动出现在 Writing 和首页的 Latest writing，按日期从新到旧排列。多节文章自动显示目录。

图片放进 `public/assets/`。在 Markdown 中可以直接使用 `/assets/文件名.jpg`；如果发布到带仓库前缀的 GitHub 项目地址，需要在图片路径中添加该前缀，或使用 MDX 的 `url()` 辅助函数。使用个人根站点或自定义域名时无需前缀。

## 发布到 GitHub Pages

1. 建立 GitHub 仓库。个人主页推荐命名为 `你的用户名.github.io`，也支持普通项目仓库。
2. 把网站源码推送到 `main` 分支，包含 `package-lock.json`。
3. 在仓库 Settings → Pages 中，把 Source 设为 **GitHub Actions**。
4. 在 Actions 页面运行 **Deploy website to GitHub Pages**，或推送新提交。工作流会读取 GitHub 实际提供的站点地址和路径，然后自动构建和发布。

发布配置在 `.github/workflows/deploy.yml`。源码默认使用 `www.myangsun.com` 生成本地构建的 canonical 链接；GitHub Actions 会自动改用实际 Pages 地址，避免预览阶段把 canonical 指向旧站。

`www.myangsun.com` 已配置为 Pages 的 Custom domain。Squarespace 中的 `www` CNAME 指向 `myangsun.github.io`，根域名的四条 A 记录指向 GitHub Pages。根域名会跳转到 `www` 地址。HTTPS 证书由 GitHub 自动签发。

以后修改内容并推送到此仓库的 `main` 分支，GitHub Actions 会自动重新构建和发布。域名切换前的记录及新记录保存在本地、未提交的 `artifacts/domain-migration.json`；需要回退时，可在 Squarespace 恢复 Squarespace Defaults 预设。原 Squarespace 网站内容没有删除。

参考：[Astro GitHub Pages 指南](https://docs.astro.build/en/guides/deploy/github/)、[GitHub 自定义域名指南](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)。

## 旧链接与迁移记录

原 `/ai-more/项目名` 路径会生成静态跳转页面，指向新版 `/projects/项目名/`。Design 的原项目路径保持一致。GitHub Pages 的静态跳转使用 HTML meta refresh，不是服务器端 HTTP 301。

迁移脚本：`scripts/import-original.py`。原站下载的 HTML 和 CSS 放在被 Git 忽略的 `reference/` 中，供本地核对；迁移来源还记录在每个项目的 `sourceUrl` 字段。旧页面中的学业或工作状态没有自动写进新首页，个人介绍需要按当前情况更新。

本初版的 Writing 没有虚构文章，私有草稿只是写作模板。旧项目内容按原站迁入；要更清晰地突出你本人的研究贡献，可以逐项填写新的结构化字段。
