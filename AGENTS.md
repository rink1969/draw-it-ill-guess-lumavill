# AGENTS.md

## 项目概述

`draw-it-ill-guess-lumavill` 是一个「你画我猜」暖系小游戏（品牌 **LumaVill**，角色 **Kaka** 一只 AI 鳄鱼）。
玩家根据题目在画布上作画，AI 通过**视觉模型**猜测所画内容；玩家可确认对错，猜不中则提供文字提示继续，直到猜中或用完 8 次机会。

关键设计约束：**目标答案对视觉模型完全不可见**，正确性判断全部在游戏端逻辑中完成。网站**不自带也不提供任何模型**——玩家自行接入自己的 OpenAI 兼容视觉服务。

- **仓库**：`git@github.com:rink1969/draw-it-ill-guess-lumavill.git`
- **最低 Node**：`>=22.13.0`（`type: module`，ESM）
- **文档主源**：`README.md`（功能与部署，面向用户）；本文件聚焦代码结构与架构（面向开发者）

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 应用框架 | Next.js 16 (App Router) + React 19 |
| 构建目标 | **纯静态导出**（`next.config.ts` 中 `output: "export"`），产物在 `./out`，无后端服务器、无 API 路由 |
| UI | Tailwind CSS 4 |
| 模型网关 | 自研客户端直连，兼容 OpenAI `/v1/chat/completions`（OpenAI / Claude / Gemini 视觉） |
| 持久化 | 纯浏览器 `localStorage`（模型连接、记忆卡、近一轮回词） |
| 本地预览 | `static-server.mjs`（零依赖 Node 静态服务器） |
| 类型/Lint | TypeScript 5.9 + ESLint 9 (flat config) |

> 本项目是纯前端静态站点，**没有** Cloudflare Workers / vinext / Vite / Vercel Sites / D1 / Drizzle 等任何后端或部署工具链。

---

## 目录结构

```text
.
+-- app/                      # Next.js App Router 入口 + 应用逻辑
|   +-- layout.tsx            # 根布局（lang=en、全局 CSS）
|   +-- page.tsx              # 首页 = 渲染 <GameDemo />
|   +-- globals.css           # 全局样式（@keyframes floaty、thinking-preview、scan-line 等）
|   +-- GameDemo.tsx          # 游戏主组件（~1228 行），所有 UI 与游戏状态机在此
|   +-- mockAgentService.ts   # 词库(50+ 词)、题目选择、提示匹配、降级猜测、正确性判定
|   +-- hybridGuessEngine.ts  # 客户端：请求视觉猜测 + 失败时本地降级（"use client"）
|   +-- modelGateway.ts       # 客户端：OpenAI/Claude/Gemini 视觉猜测 + 连接测试 + 错误脱敏
|   +-- modelConnection.ts    # 客户端：模型连接信息的 localStorage 存储 + SSRF 安全校验
|   +-- drawingCodec.ts       # 画布结构化编解码（SVG/ASCII 网格 + 笔触）
|   +-- i18n.ts               # 中英翻译、对话台词池、猜测词归一化/转写
|   +-- memoryStore.ts        # 记忆卡的 localStorage 读写（saveKey 去重）
+-- static-server.mjs         # 零依赖静态服务器，用于本地预览 ./out（npm start）
+-- next.config.ts            # output: "export"（静态导出）
+-- package.json / tsconfig.json / eslint.config.mjs / postcss.config.mjs
+-- public/                   # 静态资源（mimi-gator.png、cozy-room-reference.png、midday-in-the-plaza.mp3 等）
```

---

## 核心模块职责

### `app/GameDemo.tsx`（游戏主组件）
单一负责文件，承担游戏 UI 与全部状态机。

- **状态机 `GameState`**：`INVITE -> WORD_REVEAL -> DRAWING -> GUESSING -> RESULT -> MEMORY -> SUMMARY`。
- **本地状态**：绘制数据 (`drawing`)、Kaka 对话/情绪 (`dialogue`/`mood`)、思考动画、提示输入、模型中心开关与连接状态、保存状态、背景音乐开关、会话统计 (`SessionStats`：场次/尝试数/银矿/石头)。
- **`requestNextGuess`**（`useCallback`）：推进一次猜测回合；维护 `attempts`，达到 8 次则进入结算。
- **`gameDirector`**：第 6 轮有 28% 概率对真实模型猜测做"游戏总监"式修正；第 1-5 轮尊重原始猜测。
- **`getGameReward`**：3 次内猜中奖励 Silver Ore，5 次内奖励 Stone，其余为 `none`。
- **子组件**：InviteScreen、WordReveal、DrawingScreen/DrawingCanvas（canvas + PointerEvent 手绘）、GuessScreen、ResultScreen、MemoryScreen、SessionSummary、ModelCenter（模型中心弹窗）等。
- **偏好持久化**：`lumavill-language`（UI 语言）、`lumavill-music`（背景音乐开关）。

### `app/mockAgentService.ts`（游戏引擎/词库）
纯逻辑、可测试，**不接触网络或 DOM（除 localStorage 外）**。

- `wordBank`：50+ 词条，含 `emoji/category/difficulty/aliases/fallbackGuesses`。
- `pickWord(isFirstRound)`：从词库随机取题；用 `localStorage`(`lumavill-recent-words`) 去重近期词；支持 `?demoWord=...` 首回合演示。
- `isCorrectGuess(guess, target)`：归一化后与 `word + aliases` 匹配（含子串）。
- `normalizeGuess`：小写、去标点/冠词、单数化，用于跨语言/拼写比较。
- `getFallbackGuess(...)`：纯本地降级猜测，依据提示是否命中目标、轮次、历史猜测，按概率选择候选（含同类词/易混词）。
- `hintMatchesTarget`：按类别关键词（中英）判断提示是否与目标相关。

### `app/hybridGuessEngine.ts`（客户端混合猜测）
`"use client"`。直连玩家接入的视觉模型，60s `AbortController` 超时兜底。

- 成功：返回 `source="vision"` 的 `GuessAttempt`，并用 `isCorrectGuess` 判定。
- 失败/超时：区分 `connection_missing`（直接抛，提示重新连接）与其他错误（走 `getFallbackGuess`，`source="fallback"`，置信度 `0.28 + random*0.28`）。

### `app/modelGateway.ts`（客户端模型网关）
- `runCustomVisionGuess`：向 `baseUrl` 的 `/v1/chat/completions` POST 文本+`image_url`，解析 `{guess, confidence, reaction}` JSON。
- `testCustomModelConnection`：最小探通请求（`Reply with READY.`）。
- `providerError`：构造 `provider_<status>` 错误，并对 `sk-`/`key-`/`Bearer token` 脱敏。
- `buildVisionPrompt`：组装"目标藏匿"提示（含轮次、历史猜测、提示、SVG/ASCII 结构化数据）。

### `app/modelConnection.ts`（模型连接存储）
- 连接信息（`baseUrl/model/apiKey`）以**纯文本**存于 `localStorage`(`lumavill-model-connection`)。
- `validateConnection`：校验 URL 协议（仅 https/localhost）、屏蔽内网与元数据地址（SSRF 安全），截断模型名与 Key 长度。
- 注意：明文存储意味着页面内任意脚本（XSS）均可读取 Key——`README.md` 已提示共享浏览器前先断开。

### `app/drawingCodec.ts`（画布结构化编解码）
- `strokesToStructuredDrawing`：将笔触数组转为结构化绘制数据（含 SVG + ASCII 网格），供视觉模型理解。

### `app/i18n.ts`（国际化）
- 仅 `en`/`zh`；`localizeGuess` 把模型英文猜测转中文显示，`canonicalGuess` 反向转写用于正确性判定；`dialoguePools` 为对话台词池。

### `app/memoryStore.ts`（记忆持久化）
- 纯 localStorage 存储记忆卡（key `lumavill-memories`），`saveMemory` 按 `saveKey` 去重并截断至 20 条；`createMemory` 做必填校验与 `data:image/` 格式/大小检查。

---

## 数据流 / 游戏流程

```text
玩家进入 (INVITE)
  [可选] ModelCenter 接入自己的视觉模型 -> localStorage(lumavill-model-connection)
WordReveal（Kaka 出题，看不到答案）
  -> DRAWING: canvas 手绘 -> toDataURL(image/png) + strokesToStructuredDrawing (SVG/ASCII)
  -> GUESSING:
       requestHybridGuess(直连模型) -> 真实模型猜测
         [成功] -> isCorrectGuess 判定 -> 玩家确认
             [对] -> 结算（奖励）-> MEMORY（localStorage）-> SUMMARY（每日伙伴报告）
             [错] -> <=3 次错误后请求提示 -> 再猜，最多 8 轮
         [失败/超时/无连接] -> getFallbackGuess 本地降级猜测
  -> gameDirector：第 6 轮 28% 概率修正
  -> 8 轮全错 -> RESULT（无实质奖励）
MEMORY: saveMemory(localStorage，saveKey 去重)
SUMMARY: 展示场次/亲密度/收集材料/关系进度
```

---

## 关键架构决策 / 约定

1. **目标答案对模型隐藏**：`modelGateway` 只接收画布与结构化数据，不接收目标词；正确性在客户端 `mockAgentService.isCorrectGuess` 判定。
2. **真实模型可缺省，游戏可完整游玩**：无连接/失败/超时自动降级到本地 `getFallbackGuess`；`hybridGuessEngine` 区分 `connection_missing` 与其他错误以提示重连。
3. **连接信息安全**：连接信息存于 `localStorage`（明文），经 `validateConnection` 做 SSRF 安全校验（https/localhost + 屏蔽内网/元数据地址）；`providerError` 对密钥脱敏。
4. **纯静态导出**：`next.config.ts` 设 `output: "export"`，产物为 `./out`，部署到任意静态托管即可；无运行时服务器。
5. **i18n**：仅 `en`/`zh`；`localizeGuess` 把模型英文猜测转中文显示，`canonicalGuess` 反向转写用于正确性判定。
6. **输入净化**：`memoryStore.clean` 对所有持久化字段做截断/类型检查。

---

## 环境变量

- **本地开发无需任何环境变量**。模型连接、记忆、语言/音乐偏好全部存于浏览器 `localStorage`，没有服务端密钥需要配置。
- **GitHub Pages 部署**：`.github/workflows/deploy.yml` 在构建时设置 `BASE_PATH`（仓库名），让静态导出的资源链接指向项目站点子路径；本地 `npm start` 不设置该变量，资源保持根路径。详见 `next.config.ts` 与 `app/basePath.ts`。

---

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖（Node >=22.13.0） |
| `npm run dev` | Next.js 本地开发（`127.0.0.1:3000`，热更新） |
| `npm run build` | 静态导出到 `./out` |
| `npm start` | 用零依赖静态服务器预览 `./out`（`127.0.0.1:3000`） |
| `npm run lint` | ESLint（忽略 `out` 等构建产物） |

---

## 测试

项目**目前没有自动化测试**。验证构建与功能的方式：

```bash
npm run build   # 生成 ./out
npm start       # 在 http://127.0.0.1:3000 预览
```

或直接打开 `./out/index.html`。手动覆盖：连接真实视觉模型、完整 8 轮流程、提示与降级猜测、记忆卡存取、中英文切换。

---

## 改动检查清单

- 改动游戏逻辑后：`npm run build` + `npm start` 手动回归。
- 新增记忆卡字段：更新 `app/memoryStore.ts`（`GameMemory` 接口 + `createMemory` 读写）。
- 改动 `mockAgentService`/`i18n`/`drawingCodec`（纯函数）时注意保持目标隐藏与正确性判定不变。
- 改动 `modelConnection`：确认 SSRF 安全校验（https/localhost + 屏蔽内网地址）与密钥脱敏不变。
