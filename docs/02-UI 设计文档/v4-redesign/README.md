# 驴酱杯 v4 重构设计稿

苹果风格、克制大气的全站重构方案。两个 viewport 各一份完整稿, 共享同一套设计系统。

## 文件

```
v4-redesign/
├── README.md       本文件
├── desktop.html    桌面端完整页面 (1440 视口代表稿)
└── mobile.html     移动端完整页面 (iPhone 380 视口)
```

直接用浏览器打开任一 `.html` 即可预览, 无需构建。文件外部依赖:

- `cdn.jsdelivr.net` — 加载 `cover_01..04.webp` / `mobile_cover_01.webp` / 位置图标 / Motion One 库
- 离线打开仍能看到完整布局, 仅图片和入场动画无法加载

## 设计系统

### 色板

| Token             | Hex / rgba                  | 用途                       |
| ----------------- | --------------------------- | -------------------------- |
| `bg-deepest`      | `#030305`                   | 浏览器 chrome / footer     |
| `bg-page`         | `#050508`                   | 整页基底                   |
| `bg-surface-1`    | `linear surface 0.025→0`    | 卡片背景 (微微提亮)        |
| `text-primary`    | `#F5F5F7`                   | 标题、强调                 |
| `text-secondary`  | `rgba(245,245,247,0.65-0.78)` | 正文                       |
| `text-tertiary`   | `rgba(245,245,247,0.4-0.5)` | 提示、说明                 |
| `border-hairline` | `rgba(255,255,255,0.07-0.10)` | 全部分隔线 0.5px           |
| `border-emphasis` | `rgba(255,255,255,0.18-0.22)` | hover/active 边框          |
| `accent-live`    | `#FF3B30` (Apple 系统红)    | 直播脉冲点 / 进行中比赛    |
| `accent-win`     | `rgba(60,210,140,0.6-0.85)` | 晋级条                      |
| `accent-elim`    | `rgba(255,59,48,0.55-0.7)`  | 淘汰条                      |
| `level-S`        | `#FFD56A`                   | 选手 S 级                  |
| `level-A`        | `#A8E0FF`                   | 选手 A 级                  |
| `level-B`        | `#9DD5B1`                   | 选手 B 级                  |
| `level-C`        | `#C8B8E0`                   | 选手 C 级                  |
| `level-D`        | `#9C9C9C`                   | 选手 D 级                  |
| `gold-sponsor`   | `rgba(255,213,106,0.85-0.95)` | 赞助 / 奖项 / 队长徽章    |

### 区域 ambient 光晕 (径向渐变)

每个 section 顶部都有一层非常微弱的径向光晕, 营造层次, 配合 hairline 切分:

| Section      | Hue                    |
| ------------ | ---------------------- |
| 数据条         | `rgba(80,90,140,0.18)` 蓝灰 |
| 02 视频        | `rgba(70,140,180,0.13)` 蓝   |
| 03 主播        | `rgba(150,90,160,0.14)` 紫粉 |
| 04 战队        | `rgba(120,90,180,0.13)` 紫蓝 |
| 05 赛程        | `rgba(80,160,140,0.13)` 青绿 |
| 06 鸣谢        | `rgba(220,180,90,0.12)` 金   |

光晕全部用 `<svg>` 内联 `<radialGradient>` 输出, 不用 CSS background-image 渐变 (避免 streaming 闪烁、确保和上方区平滑过渡)。

### 字体栈

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
             "PingFang SC", "Helvetica Neue", system-ui, sans-serif;

/* 数字 / 英文 / 日期 / mono 标签 */
font-family: ui-monospace, "SF Mono", Menlo, monospace;
font-feature-settings: "tnum"; /* 等宽数字 */
```

字重只用 `400` 和 `500`。所有大标题用 `letter-spacing: -0.04em` 苹果式紧凑。

### 字号节奏

| 级别       | 桌面     | 移动  |
| ---------- | -------- | ----- |
| Hero 主标题 | 64px     | 48px  |
| Section h2 | 26px     | 19px  |
| Stats 大数 | 30px     | 24px  |
| 卡片标题   | 13-16px  | 12-13px |
| 正文       | 13-15px  | 11-13px |
| Eyebrow / mono 标签 | 10-11px | 9-10px |

### 切分

- 区与区之间: `0.5px hairline` (`rgba(255,255,255,0.07)`)
- 同一区内的子分隔: `0.5px` (`rgba(255,255,255,0.04-0.06)`)
- 永不使用粗框 / 阴影 / 发光
- 唯一的"光晕"是上面的 radial gradient ambient, 强度 ≤ 0.18 alpha

### 圆角

| 尺度 | 用途 |
| ---- | ---- |
| 999px (pill) | 按钮 / 标签 / segmented control / live 指示 |
| 12px         | 大卡片 (鸣谢双卡 / 视频主卡 / hero 玻璃卡) |
| 10px         | 中卡片 (战队 hover 浮层 / 主播卡) |
| 8px          | 战队卡 / 视频缩略图 / 赛程列卡 |
| 6px          | 战队成员行 |
| 4px          | 时长徽章 / 浏览器地址栏 |
| 3px          | 等级徽章 / 比分胶囊 |

### 动效

- 通用过渡曲线: `cubic-bezier(0.2, 0.7, 0.2, 1)` (苹果式 ease-out)
- Hover: `translateY(-2~3px)` + 边框透明度提升, 0.4-0.5s
- 入场: stagger 上移淡入, 0.7-1.0s, 用 `Motion One`
- 直播脉冲: 2.4s 缩放 1↔0.85 + 不透明度变化
- Marquee: 60-80s 线性匀速横滚
- 轮播: 5s 自动切换, 1.4s ease-in-out 交叉淡入
- 移动端 accordion: 0.3s ease 旋转箭头 180°

## 内容映射 (沿用项目现有数据)

| 设计稿元素         | 项目源码                                                          |
| ------------------ | ----------------------------------------------------------------- |
| Hero 桌面轮播     | `frontend/public/assets/cover_0[1-4].webp`                        |
| Hero 移动封面      | `frontend/public/assets/mobile_cover_01.webp`                     |
| 视频主图           | `frontend/public/assets/驴酱双人组.webp`                          |
| 位置图标           | `frontend/public/{top,jungle,mid,bot,support}.png`                |
| 战队 / 队员等级 / 直播间 URL | `frontend/src/mock/data.ts` `initialTeams`                |
| 瑞士轮 / 淘汰赛比分 | `frontend/src/mock/data.ts` `swissMatches` / `eliminationMatches` |
| 主播分组 (驴酱 / 嘉宾) | `Streamer.streamerType` (`internal` / `guest`)                  |
| 赞助 / 特殊奖项     | 站点运行时 `window.THANKS_DATA` (后端 `THANKS_DATA` 常量)         |

## 关键改造点 vs 原站

### Hero
- **改前**: 三个大字"驴酱杯"硬居中, hero-bg 单张幻想美术  
- **改后**: poster 式 bottom-left 排版 (eyebrow + 64px 标题 + mono 角标 + tagline + 日期 + 双 CTA), 4 张原始 cover 自动轮播 (5s), 多层 SVG 渐变保证图融入下方区不撞边

### 战队 (用户主诉)
- **改前**: 卡片右上角一个字母代表整支队伍的"等级", 不准确; 点击弹模态  
- **改后**: 右上角换成瑞士轮战绩 (`3-0` 等); 5 个色点示意 5 名队员**各自**等级 (S 金 / A 蓝 / B 绿 / C 紫 / D 灰); hover 浮层展开 5 行队员明细, 每行 = 位置图标 + 昵称 + 队长徽章 + 个人等级 + ↗ 一键跳转**该选手**斗鱼直播间 (来自 `Player.liveUrl`)

### 区与区过渡
- **改前**: hero 图直接撞上死黑底, 视觉断层  
- **改后**: hero 底部 SVG `linearGradient` 三层渐隐, 下方接同款 `radial` ambient 光晕, 整页通过细线 + 微光层叠保证视觉连续

### 赛程
- **改前**: 4 列横排大表, 移动端被挤压  
- **改后** (桌面): 5 列对应 5 轮, 内部按战绩组分块 (`0-0` / `1-0` / `2-0` 等), 每组顶部细线颜色编码晋级 / 淘汰  
- **改后** (移动): accordion 5 行, 默认展开"进行中"轮, 其他收起带摘要

### 主播
- **改前**: 1 大 + 2 小固定 3 卡式, 嘉宾 / 驴酱用 tab 切换看不到对方  
- **改后** (桌面): 5 列等宽 portrait 卡, 同时呈现, segmented control 标明数量 (5 / 3); 卡片 hover 浮出"进入直播间"玻璃按钮  
- **改后** (移动): 横向滑动列表 (一次显 2.5 张)

### 鸣谢
- **改前**: marquee + 双卡, 双卡内容时常被挤  
- **改后**: marquee 加左右"擦入擦出"渐变端 (不是硬切); 移动端双卡纵向堆叠; 增加金色 ambient 光晕首尾呼应 hero

### Footer
- **改前**: 移动端无 footer, 桌面 hover 触发 (体验差)  
- **改后**: 永久可见; 移动端纵向多行展开, 桌面端单行排布; 邮箱、B 站、公众号、ICP 全部齐全

## 移动端响应式映射

| 区块         | 桌面端          | 移动端                                |
| ------------ | --------------- | ------------------------------------- |
| Hero 封面    | 4 图轮播        | 单张真人海报 (`mobile_cover_01.webp`) |
| 顶部 nav     | 6 项文字横排    | logo + 直播 pill + 汉堡按钮           |
| Stats        | 4 列横排        | 2×2 格, 中间双向 hairline 切分        |
| 视频缩略     | 4 张并排        | 横向滑动 + "右滑提示"                 |
| 主播         | 5 列固定网格    | 横向滑动 (2.5 张 / 屏)                |
| 战队         | 4×4 hover 浮层  | 2×8, 卡片底部"展开 →", 点击展开队员明细 |
| 赛程         | 5 列对照        | 5 行 accordion, 默认展开当前轮         |
| 鸣谢         | 双卡左右        | 双卡纵向堆叠                          |
| Footer       | 单行            | 多行纵向                              |

对应 Tailwind breakpoint 建议:
- 移动 ≤ `sm` (640px)
- 桌面 ≥ `md` (768px)
- Hero 字号 / Stats 列数 / 战队卡列数 / 赛程布局 都按这个断点切换

## 落地建议

### 第一阶段 — 视觉系统
1. 把上面色板写成 Tailwind config / CSS variable
2. 引入 `Motion` (代替 `framer-motion` 也行, API 类似), 或保留 framer-motion
3. 字体栈直接走 system stack, 不引入 web font (Apple 设备本来就是 SF Pro)
4. 删除原 `esports-theme.css` 里的金色/蓝色霓虹效果

### 第二阶段 — 组件重做
按区块顺序: Header → Hero (含 Carousel) → Stats → Videos → Streamers → Teams → Schedule → Thanks → Footer

各区块都对应已有组件:

| v4 区块 | 现有组件 (`frontend/src/components/features/`) |
| --- | --- |
| Header | (新建, 替换 `Layout.tsx` 内的 nav) |
| Hero + Carousel | `StartBox/`, `BackgroundCarousel.tsx` 已有, 改文案排版 |
| Stats | (新建) |
| Videos | `video-carousel/` |
| Streamers | `StreamerSection.tsx`, `streamer-section/` |
| Teams | `TeamSection.tsx`, `team/MemberCard.tsx` |
| Schedule | `ScheduleSection.tsx`, `swiss/`, `EliminationStage.tsx` |
| Thanks | `ThanksSection/` |
| Footer | `layout/Footer/` |

### 第三阶段 — 交互/动效
1. Hero carousel 自动播放 + 手动指示点
2. 战队卡 hover 浮层 (桌面) / 点击展开 (移动)
3. 队员行点击跳转 `liveUrl`
4. 赛程 mobile accordion
5. 主播卡 hover 浮"进入直播间"按钮
6. 直播指示点脉冲 / Marquee 滚动

## 已知遗留 (设计稿里没做)

- **淘汰赛 tab 内容**: 现在只做了瑞士轮, 淘汰赛 tab 只有切换 UI, 内容待补 (8 进 4 进 2 的 bracket tree)
- **主播 portrait 占位**: 现在用渐变色块 + 抽象 SVG 头肩, 接入真人照片后会更立体
- **视频缩略图占位**: 现在是纯色块, 接入 B 站 cover API 或本地资源后会更直观
- **Header drawer 展开态**: 移动端汉堡按钮没有展开后的抽屉详细稿
- **战队详情页 / 主播详情页**: 都还没做单独的子页面设计稿

如果之后要补这些, 可以再开一个 `v4.1-redesign/` 或者直接在 `v4-redesign/` 里加文件。
