# WATT 托管 AI 集成改造计划

> 分支：watt（与其他环境的 git 分支隔离，本分支专供 WATT App 嵌入式 WebView 使用）
> 目标：游戏运行在 WATT App 的嵌入浏览器中时，模型连接配置由 App 注入，无需用户在 UI 里手动配置。

## 一、背景

- 本项目是纯前端静态导出（Next.js output: export），模型连接靠玩家自行填入并存进 localStorage（lumavill-model-connection），hybridGuessEngine 在每次猜测时通过 readConnection() 读取。
- WATT App 会在主窗口注入 window.__WATT_HOST__（ai: { apiKey, endpoint, model, provider }，mode: managed），并在加载完成后重复派发 watt:host-ready 事件（详情见 watt-managed-ai-host-integration.md）。
- 注入的 apiKey 属于敏感数据，不能写入持久化介质，也不能打印到 UI/日志。

## 二、改造原则

1. 托管优先：猜测时优先使用 window.__WATT_HOST__.ai，无 Host 时再回退到 localStorage（保留原有回退路径，避免破坏非托管场景）。
2. 零持久化：托管配置只从内存中的 window.__WATT_HOST__ 读取，不写 localStorage/sessionStorage/Cookie。
3. 零泄露：不把 apiKey 写入 localStorage、控制台、错误信息或记忆卡。
4. 可重复初始化：watt:host-ready 可能多次派发，读取逻辑幂等。
5. 最小改动：不重写游戏主循环，只在连接来源这一处做环境判定。

## 三、改动清单

### 1. 新增 app/wattHost.ts
- 声明 WattManagedAiHost 类型与 window.__WATT_HOST__ 全局类型。
- readWattHost()：安全读取并校验 window.__WATT_HOST__（mode 为 managed 且 ai.* 齐全），非浏览器环境返回 null。

### 2. app/modelConnection.ts
- 新增 getManagedConnection()：从 readWattHost() 取 endpoint/model/apiKey，校验为合法 https URL 且 model/key 非空，返回 CustomModelConnection（不截断托管 apiKey）。
- 新增 getActiveConnection()：getManagedConnection() ?? readConnection()，统一猜测入口的连接来源。

### 3. app/hybridGuessEngine.ts
- import 由 readConnection 改为 getActiveConnection；requestHybridGuess 内 connection = getActiveConnection()。
- 行为不变：托管/本地连接都走同一套视觉猜测 + 本地降级。

### 4. app/GameDemo.tsx
- 新增 useWattHost() hook（读 initial + 监听 watt:host-ready，幂等）。
- 初始连接状态由 getActiveConnection() !== null 判定 -> 托管模式下立即自动连接。
- 新增 effect：检测到 wattHost 时自动 setModelConnected(true)，玩家无需手动连接即可开始。
- saveMemory 中 provider/model 改用 getActiveConnection() -> 托管场景正确标记为 visitor（而非误标 local-fallback）。

### 5. ModelCenter 弹窗
- 新增 managedHost prop。存在托管 Host 时，展示「AI 模型由 WATT App 托管」提示与模型名/提供方，隐藏可编辑的连接表单（避免用户误改托管配置）；否则沿用原表单。

## 四、安全与兼容性确认

- apiKey 不经任何持久化，不在 UI/错误中展示。
- 保留 localStorage 回退，非托管环境行为不变。
- SSRF：托管校验仅要求 https + 非空（端点由 App 可信提供，非手输易错）；用户自填连接仍走原 validateConnection 内网拦截。

## 五、验证方式（交测试人员）

- 在 WATT App 中打开页面：读取到完整 window.__WATT_HOST__.ai，无需配置即可开始游戏。
- 首次同步与 watt:host-ready 两条路径都能完成初始化；重复事件不重复请求/监听。
- 普通浏览器无 Host 时，仍可用原有 localStorage 配置（或提示连接）。
- 刷新后仍可重新完成托管初始化。
- 确认监控系统/日志/记忆卡未记录 apiKey。
