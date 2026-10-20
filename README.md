<div align="center">

# 词根积木工坊 · Etymology Network

**每个英语单词都是用积木拼出来的 — 打开盒子，看看积木能拼出什么词**

[![在线体验](https://img.shields.io/badge/在线体验-Live_Demo-00E5FF?style=for-the-badge&logo=github&logoColor=white)](https://yunningtang.github.io/EtymologyNetwork3D/)
[![版本](https://img.shields.io/badge/v3.0-正式版-69F0AE?style=for-the-badge)]()
[![词汇量](https://img.shields.io/badge/6,000+-考试核心词-FFD740?style=for-the-badge)]()
[![词素](https://img.shields.io/badge/200+-词素-FF80AB?style=for-the-badge)]()

<br/>

*把前缀、词根、后缀做成积木，面向小学到初中的中文母语学习者。*

<br/>

### [>>> 立即体验在线版 <<<](https://yunningtang.github.io/EtymologyNetwork3D/)

<br/>


</div>

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **积木工坊** | 首页是 16 个积木盒（否定、方位、动作、感知……），打开盒子看到里面的积木（词素），点一块积木看它拼出来的「单词墙」，每个单词都是一行拼好的积木 |
| **智能搜索** | 6,000+ 核心词汇即时搜索，支持中英双语，下拉实时匹配 |
| **单词详情** | 点击任意单词查看词源拆解、词素构成、词典释义、音标与考试等级（中考/高考/四六级/考研/托福/雅思） |
| **发音朗读** | 内置 Text-to-Speech，点击即可听到单词发音 |
| **收藏夹** | 收藏感兴趣的单词，追踪学习进度 |
| **分类筛选** | 按 Prefix / Root / Suffix 筛选，支持细分子类别（否定、方向、动作等） |
| **等级筛选** | 默认只看初高中（中考+高考）单词，也可切到四六级 / 考研 / 托福雅思 / 全部 |
| **今天探索** | 10 道小题闯关：猜释义、按顺序拼词素、找同根词；即时反馈、撒彩纸、记录最高分 |
| **积木拼词** | 词素是会"咔哒"拼起来的积木：前缀红、词根绿、后缀紫；点一下拆开看每块的意思，"换一块"前缀立刻变成另一个真实单词；闯关里把积木拖进框里拼词 |
| **先猜后看** | 单词卡先给词素拆解，猜过再揭晓词典释义（可关闭） |
| **词素故事** | 206 个词素各一句来历，例如 salary 本义是"买盐的钱" |
| **同根对比** | 同一词根换前缀排成一列：import / export / transport / report |
| **键盘操作** | `/` 搜索，`Esc` 逐级返回（关卡片 → 回盒子 → 回工坊） |
| **双语界面** | 全程中英文对照 |

## 快速开始

**在线版**：[yunningtang.github.io/EtymologyNetwork3D](https://yunningtang.github.io/EtymologyNetwork3D/)

**本地预览**：clone 后直接双击 [`index.html`](index.html) 用浏览器打开即可（不依赖任何 CDN、字体服务或第三方库）。需要本地静态服务器的话：

```bash
git clone https://github.com/yunningtang/EtymologyNetwork3D.git
cd EtymologyNetwork3D
python3 -m http.server 8000   # 然后访问 http://localhost:8000
```

## 产品逻辑

```
浏览 / 搜索  →  理解（词源拆解）  →  练习（发音朗读）  →  记忆（收藏 + 进度追踪）
```

每个英语单词都由 **morphemes（词素）** 构成 — 来自拉丁语、希腊语和古英语的最小意义单元。本工具将这些联系可视化呈现：

- **Prefixes 前缀**（`pre-`, `un-`, `re-`）— 修饰方向或程度
- **Roots 词根**（`struct`, `ject`, `duct`）— 承载核心语义
- **Suffixes 后缀**（`-tion`, `-ly`, `-able`）— 决定词性

探索一个词素，就能发现数十个相关单词。在整个词汇体系中看到规律。

## 技术栈

| 层级 | 技术方案 |
|------|---------|
| 架构 | 纯静态页面 — 逻辑按模块拆分在 `src/`（经典脚本、共享全局作用域，双击 `index.html` 即可运行），词汇数据独立为 `data/words.js`，无构建步骤、无任何第三方库 |
| 界面 | 纯 HTML/CSS 文档视图，无 WebGL。两套主题：默认「探险」（奶油色厚边面板、可按压按钮、词素表情图标）和「夜间」（Liquid Glass 毛玻璃）；在学习面板里切换 |
| 字体 | 系统字体栈（PingFang / 微软雅黑 / SF Mono 等），不加载 Google Fonts |
| 数据 | 206 个词素；6,000+ 个中考/高考/CET4/CET6/考研/TOEFL/IELTS 核心词，每个词的词素映射都经过校验，释义与音标来自 [ECDICT](https://github.com/skywind3000/ECDICT) |
| 存储 | `localStorage` 持久化收藏夹和学习进度 |

## 项目结构

```
EtymologyNetwork3D/
├── index.html                # 页面骨架，按顺序加载 src/ 下的脚本
├── src/
│   ├── style.css             # 样式
│   ├── morphemes.js          # 206 个词素：来源、双语释义、语义分类
│   ├── data.js               # 读取 data/words.js；音标回退
│   ├── search.js             # 搜索（前缀 / 包含 / 三元组模糊）
│   ├── graph.js              # 词素节点与每块积木的单词列表
│   ├── study.js              # 收藏与学习进度（localStorage）
│   ├── tooltip.js            # 词素 / 单词详情卡
│   ├── ui.js                 # 搜索框、筛选、学习面板、交互事件、开场动画
│   ├── workshop.js           # 积木工坊：盒子 → 积木 → 单词墙
│   ├── bricks.js             # 积木组件（拼装动画、换前缀、拖拽）+ 合成音效
│   ├── quest.js              # 「今天探索」闯关小游戏 + 彩纸/提示
│   ├── icons.js              # 词素表情图标
│   ├── theme-kid.css         # 「探险」主题与闯关面板样式
│   └── main.js               # 启动流程
├── data/
│   ├── words.js              # 词汇数据：单词、词素映射、释义、音标、等级（由 scripts/vocab/build.js 生成）
│   └── images.js             # 词素配图的文件名与署名（由 scripts/images/fetch-commons.js 生成）
├── assets/morphemes/         # 词素配图（Wikimedia Commons，自由许可）
├── scripts/vocab/
│   ├── fetch.js              # 下载 ECDICT 词典与词根库到 scripts/output/（已 gitignore）
│   ├── build.js              # 生成 data/words.js
│   ├── rootmap.js            # 本项目词素 ↔ ECDICT 词根库条目的对应表
│   ├── patterns.js           # 正则候选规则（只产生候选，不直接入库）
│   └── review/reviewed.tsv   # 人工校验结果：单词 → 词素（覆盖其它来源）
├── docs/
│   └── product-notes.md      # 产品方向笔记（SRS 复习、拍照识词等设想）
└── package.json
```

### 词汇数据是怎么来的

```bash
npm run data:fetch    # 下载 ECDICT（约 66 MB）与 wordroot.txt
npm run data:build    # 生成 data/words.js，并在 scripts/output/ 输出覆盖报告
```

1. **选词**：取 ECDICT 中带 中考/高考/CET4/CET6/考研/TOEFL/IELTS 标签的单词（约 11,000 个），释义、音标、词频均来自词典。
2. **词素映射，三层来源，精度优先**：
   - *已核实*：ECDICT 词根库（611 个词根、9,000+ 人工例词）中的例词，经 `rootmap.js` 对应到本项目词素；
   - *推导*：透明的词缀剥离，且剩余词干本身是词典词（happiness = happy + -ness，unpredictable 继承 predict 的词素）；
   - *人工校验*：正则命中但以上两层都无法确认的候选（约 3,800 词）逐词审核，结果记录在 `review/reviewed.tsv`，拼写巧合一律剔除（uniform 不是 un-，ability 不是 ab-，mission 不是 mis-）。
3. 只有至少映射到一个词素的单词才会进入 `data/words.js`（约 6,100 词）；例词极少的词素会从词根库补充少量非考纲例词（无等级标记）。

音标缺失的少数单词会显示规则估算音标，并以 `≈` 标出。

### 词素配图

```bash
node scripts/images/fetch-commons.js        # 按 scripts/images/queries.tsv 从 Wikimedia Commons 取图
```

只接受公有领域 / CC0 / CC BY / CC BY-SA 的照片，每张压成 480px 宽的 webp 放到 `assets/morphemes/`，作者与许可证写入 `data/images.js`，卡片上显示带链接的署名。

## 16 个积木盒

词素按语义分进 16 个盒子：

> **Create 创造** · **Action 动作** · **Sense 感知** · **Mind 认知** · **Language 语言** · **Nature 自然** · **Society 社会** · **Number 数量** · **Direction 方向** · **Negation 否定** · **Degree 程度** · **Noun 名词** · **Adj 形容词** · **Verb 动词** · **Adv 副词** · **Auxiliary 辅助** · **Fidelity 忠诚**

---

<div align="center">

### 作者

**Yunning Tang** · [tangyunning27@gmail.com](mailto:tangyunning27@gmail.com)

<br/>

MIT License

</div>
