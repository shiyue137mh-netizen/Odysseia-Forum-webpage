# Odysseia Forum 全仓代码审计 Issue（2026-08-27）

> - 状态：两轮只读审计完成，待按优先级确认修复批次
> - 基线：第一轮为 `main` / `12418267` 且工作区干净；第二轮复核期间曾存在其他未提交业务改动，均未触碰，最终交付时除本文档外工作区干净
> - 范围：运行时与数据流、认证与安全、UI/可访问性、性能、测试、构建发布、Cloudflare Functions、文档与架构边界
> - 非目标：本轮不修改业务代码、不新增依赖、不启动浏览器、不把静态候选描述为运行时实测结果

## 1. 结论摘要

第一轮由三路 `luna high` 子智能体检查运行时/数据与安全、UI/性能与可访问性、工程质量/测试与配置；第二轮再由三路 `luna high` 分别深挖 API 契约、异步状态机、输入与持久化边界。所有候选均由主智能体按当前源码逐项复核并与既有 issue 去重。最终纳入 **1 个 P1、20 个 P2、7 个 P3、4 个 Optimization**。

最应优先处理的不是大规模重构，而是以下五组边界：

1. 生产依赖存在 38 个已公开漏洞，其中 14 个为 high，且三个直接依赖已有兼容补丁版本。
2. 认证退出、普通 401 与 hash token 刷新没有共享同一会话失效 authority，存在旧登录态残留或缓存继续判定已登录的问题。
3. 偏好字段和赛事参赛时间存在可直接从 UI → 请求模型 → 后端存储/序列化证明的契约错误。
4. AI 会话、背景图与通知已读状态在持久化或请求失败时可能误报成功、丢失历史或留下前后端不一致状态。
5. Vite 配置、动态 OG 生产依赖与安全文档存在实现/文档双 authority，容易让开发和部署验证基于错误事实。

| ID | 级别 | 问题 | 建议批次 |
| --- | --- | --- | --- |
| SEC-001 | P1 | 生产依赖存在 38 个漏洞（14 high） | A |
| AUTH-001 | P2 | 登出请求失败时本地会话可能残留 | A |
| AUTH-002 | P2 | 普通 API 401 不会失效认证 Query 缓存 | A |
| AUTH-003 | P2 | hash token 由两层消费并用固定 800ms 等待认证 | A |
| DATA-001 | P2 | “BOT 每页条数”写入错误偏好字段 | A |
| SEC-002 | P2 | OpenAPI 生成脚本禁用 TLS 证书校验 | A |
| OPS-001 | P2 | 生产 OG 默认依赖未完成验收闭环的 Vercel 服务 | A |
| UX-001 | P2 | 通知中心任一数据源失败会遮蔽另一数据源 | B |
| UX-002 | P2 | 书单/赛事详情页丢失 items 错误且错误态不可重试 | B |
| A11Y-001 | P2 | 多个主要入口只支持鼠标点击 | B |
| A11Y-002 | P2 | 自定义预览与移动侧栏焦点管理不完整 | B |
| A11Y-003 | P2 | 自动轮播未遵守 reduced-motion | B |
| A11Y-004 | P2 | 无限列表把焦点移向不可聚焦 article | B |
| TEST-001 | P2 | 测试靠真实 XHR 失败后 fallback 通过 | B |
| DOC-001 | P2 | 安全文档错误描述 Markdown 实现与安全边界 | B |
| DOC-002 | P2 | 动态 OG 路由/部署文档落后于当前实现 | B |
| DATA-002 | P2 | 赛事参赛时间把浏览器本地时间按 UTC 保存 | A |
| DATA-003 | P2 | 超长 AI 输入会使刷新清空全部本地 AI 历史 | A |
| UX-003 | P2 | 无限加载失败后可被可见哨兵持续自动重试 | B |
| UX-004 | P2 | “全部标记已读”失败不回滚且允许并发提交 | B |
| UX-005 | P2 | 本地背景图持久化失败仍提示保存成功 | B |
| BUILD-001 | P3 | Vite 同时跟踪 TS/JS 配置，实际加载 JS | C |
| BUILD-002 | P3 | 默认 lint 被 ignored Playground 产物污染 | C |
| A11Y-005 | P3 | 图片查看器 dialog 没有可访问名称 | C |
| TEST-002 | P3 | 动态 OG 自检未进入 CI，作者 handler 未覆盖 | C |
| SEO-001 | P3 | SPA 路由没有运行时页面标题同步 | C |
| UX-006 | P3 | About 苏醒动画的旧异步序列会覆盖新状态 | C |
| UX-007 | P3 | 恢复浏览位置的延迟任务可写入后续页面 | C |
| PERF-001 | Optimization | 部分 React Query/AI 请求未透传 AbortSignal | C |
| TEST-003 | Optimization | 覆盖率口径缺少 include/threshold | C |
| ARCH-001 | Optimization | 仍有 5 处 FSD 反向依赖 | C |
| BUILD-003 | Optimization | 浏览器支持声明没有被构建 target 执行 | C |

## 2. P1：优先修复

### SEC-001 生产依赖存在 38 个已公开漏洞

**证据**

- `package.json:23-37`：直接依赖包含 `@chenglou/pretext`、`axios`、`react-router-dom`。
- `pnpm-lock.yaml:11-43`：当前锁定 `@chenglou/pretext 0.0.3`、`axios 1.13.2`、`react-router-dom 6.30.1` / `@remix-run/router 1.23.0`。
- `pnpm audit --prod --audit-level high`：失败；共 38 个漏洞，`1 low / 23 moderate / 14 high`。

**影响链**

- `@chenglou/pretext <=0.0.4` 存在文本分析算法复杂度 DoS；当前 `ThreadListItem` 会把后端帖子标题交给它计算截断。
- React Router 当前版本命中开放重定向/XSS 相关公告；现有登录 redirect 已额外经过 `sanitizeInternalRedirect`，降低了已知入口风险，但不能替代依赖补丁。
- Axios 公告同时包含浏览器与 Node adapter 场景；并非每条都能在当前前端路径直接利用，但当前版本已落后于多个安全补丁线。

**最小修复**

只升级到同一主版本内的已修复版本，优先 `@chenglou/pretext >=0.0.5`、`react-router-dom >=6.30.4`、Axios 当前安全版本；不要借安全升级顺手迁移 React Router 7、Zod 4 等大版本。

**关闭条件**

`pnpm audit --prod --audit-level high` 通过；类型检查、221 条现有测试、生产构建通过；定向复核登录 redirect、帖子标题截断和 Axios 拦截器行为。

## 3. P2：功能、安全与用户可达性问题

### AUTH-001 登出请求失败时本地会话可能残留

**证据链**

- `src/features/auth/api/authApi.ts:42-46` 只有后端 `/auth/logout` 成功后才清理本地 token 和 `use_auth_header`。
- `src/pages/AuthPage/RequiredSetupPage.tsx:164-169` 在 `finally` 中只跳转登录页，没有本地清理。
- `src/widgets/layout/AppSidebar.tsx:66-74` 则无论后端是否成功都会额外执行 `clearStoredAuthToken()`，两个入口语义不一致。

网络超时或 5xx 时，首次配置页会跳到登录页，但 Bearer token 仍可能保留；后续 `checkAuth` 可以再次回退到旧 token，形成“用户点了退出但旧会话又恢复”的状态。

**最小修复与关闭条件**

把本地会话清理收敛到 `authApi.logout()` 的 `finally`，调用方只负责展示错误和导航。定向测试后端成功、401、500、网络异常四条路径，均必须清理本地 token/header 标志。

### AUTH-002 普通 API 401 不会失效认证 Query 缓存

**证据链**

- `src/shared/api/client.ts:58-65` 的 401 拦截器只清理 localStorage token。
- `src/features/auth/hooks/useAuth.ts:5-13` 的 `['auth']` 缓存 5 分钟，并关闭 mount/focus/reconnect 重取。
- `src/app/providers/ProtectedRoute.tsx:8-45` 只读取该 Query 的 `isAuthenticated`。

受保护请求返回 401 后，React Query 内仍可能保留 `loggedIn: true`；`ProtectedRoute` 因此继续展示私有路由，直到某条独立路径重新验证认证。清理 token 与失效认证状态不是同一原子动作。

**最小修复与关闭条件**

建立一个窄的会话失效入口，同时清理本地凭据并把 `['auth']` 更新为未登录或失效；避免在底层 Axios 模块直接反向导入 App 的 QueryClient。用集成测试证明普通 API 401 后受保护路由进入登录态，`checkauth` 自身错误仍保留原有优先级。

### AUTH-003 hash token 存在双消费 authority 与固定等待竞态

**证据链**

- `src/app/App.tsx:83-95` 消费 hash token 并 invalidate `['auth']`。
- `src/app/providers/ProtectedRoute.tsx:12-27` 再次检测/消费同一 hash，并固定等待 800ms。
- `src/features/auth/hooks/useAuth.ts:27-33` 的 `refreshAuth()` 不返回 `invalidateQueries` Promise。

当前正确性依赖 App/子路由 effect 的执行时序和网络在 800ms 内完成。慢网下，旧的 `loggedIn: false` 可以在刷新仍进行时触发重定向；双消费者也增加某层看到 token、另一层看不到 token 的状态分支。

**最小修复与关闭条件**

只保留一个 token 消费 authority，并等待真实的认证刷新 Promise；删除固定计时器。用可控延迟测试覆盖 100ms、2s、认证失败和组件卸载，不能提前跳回登录页或永久停在加载态。

### DATA-001 “BOT 每页条数”写入错误字段

**证据链**

- `src/pages/MePage/MePreferencesSection.tsx:111-129` 控件标签是“BOT 每页条数”，绑定 `form.resultsPerPage`，却允许 `1..100`。
- `src/features/preferences/lib/preferencesMapper.ts:57-69` 正确从 `results_per_page` 读入 `resultsPerPage`。
- 同文件 `82-95` 保存时却固定发送 `results_per_page: 5`，并把输入写入 `ui_page_size`。
- `src/shared/types/openapi.d.ts:4151-4160` 明确 `results_per_page` 必须小于 10，`ui_page_size` 是网页端分页。
- `src/features/search/hooks/useSearchResults.ts:36` 当前网页搜索仍固定每页 24 条，并不消费这次误写的值。

用户会看到设置保存成功，但 BOT 结果数始终为 5，同时可能无意修改网页分页字段。

**最小修复与关闭条件**

把 `resultsPerPage` 写回 `results_per_page`，输入上限与后端约束一致；`ui_page_size` 使用独立字段或保持原值，不要把两个概念再次合并。增加 mapper round-trip 测试和一次真实 API 请求体检查。

### SEC-002 OpenAPI 生成脚本禁用 TLS 证书校验

**证据链**

- `package.json:15` 的 `gen:api` 会运行 `scripts/export_openapi.py`。
- `scripts/export_openapi.py:14-29` 优先下载远程 OpenAPI，但显式设置 `check_hostname = False` 和 `CERT_NONE`，随后写入生成契约。

这使 API 类型生成接受无效证书或被中间人替换的响应。当前 CI 不自动执行该脚本，因此没有证据表明现有产物已污染；问题是生成链本身不可信。

**最小修复与关闭条件**

恢复 Python 默认 TLS 校验；远程失败继续使用现有本地后端回退。验证正常证书成功、无效证书拒绝、远程不可达时本地回退成功。

### OPS-001 生产 OG 默认依赖尚未完成验收闭环的 Vercel 服务

**证据链**

- `functions/_shared/og.js:1-4, 205-210` 默认把所有动态 `og:image` 指向 `https://odysseia-forum-og.vercel.app/api/og/...`。
- `docs/architecture/dynamic_open_graph.md:472` 仍把 Vercel PNG PoC 描述为暂缓、不修改生产部署。
- `docs/deployment/cloudflare_pages.md` 未把 `OG_IMAGE_BASE_URL` 和该外部服务列为正式生产依赖。
- `pnpm check:og` 只用 mock 断言 URL 字符串，不验证冷启动、图片可访问性、中文字体或 Discord 抓取。

生产分享链已经把外部 PoC 变成默认依赖，但部署和验收事实仍停留在提案阶段。一旦 Vercel 服务冷启动超时、额度/计划不适用或字体渲染失败，Discord 分享图会直接退化。

**最小修复与关闭条件**

先确认该服务是否已正式批准。批准则补齐部署变量、责任边界、缓存和故障回退，并用 Discord UA 对真实 canonical URL 做冷请求验收；未批准则不要保留生产默认改写。

### UX-001 通知中心任一数据源失败会遮蔽另一数据源

**证据链**

- `src/features/notifications/components/NotificationCenter.tsx:140-153` 分别查询关注更新和静态公告。
- 同文件 `382-397` 把 `isError || isStaticError` 合并成全屏错误，并且只有两者都成功时才渲染已有通知。

关注接口临时失败时，即使版本公告已成功，也只显示“加载通知失败”；反向同理。两条独立数据源的部分成功被错误地折叠成整体失败。

**最小修复与关闭条件**

分别渲染两类数据和各自的局部错误；只有两者均失败时显示整体错误。定向测试两种单边失败和双边失败。

### UX-002 详情页丢失 items 错误且错误态不可重试

**证据链**

- `src/pages/BooklistDetailPage/index.tsx:143-153` 与 `src/pages/TournamentDetailPage/index.tsx:147-157` 只处理 detail Query 错误。
- 两页把 items Query 数据缺失归一为空数组，但没有处理 `itemsQuery.isError`。
- detail 错误早退只有文案；成功分支里的刷新按钮无法到达。

结果是详情成功、条目失败时页面会把网络故障伪装成“空书单/无参赛作品”；详情自身短暂失败时用户也只能刷新整个浏览器。

**最小修复与关闭条件**

分别处理 detail 与 items 的错误：detail 错误提供重试；items 错误保留详情主体并在列表区显示局部重试。测试两条 Query 的四种成功/失败组合。

### A11Y-001 多个主要入口只支持鼠标点击

**证据**

- `src/entities/booklist/BooklistListItem.tsx:38-41`：`article onClick`，无链接、`tabIndex` 或键盘处理。
- `src/features/tournaments/components/TournamentListItem.tsx:43-46`：同样只有 `article onClick`。
- `src/features/notifications/components/NotificationCenter.tsx:407-415`：通知条目为 `div onClick`。

内部收藏、作者、关闭按钮可以聚焦，但不能替代“打开书单/赛事/通知”的主要动作。键盘和辅助技术用户无法触发鼠标可用的核心入口。

**最小修复与关闭条件**

优先把标题或卡片主入口改为真实链接；若保留复合卡片，补正确语义、Enter/Space 和内部控件冒泡边界。用键盘完成三类入口的打开、收藏和关闭操作。

### A11Y-002 自定义预览与移动侧栏焦点管理不完整

**证据链**

- `src/widgets/thread-preview/ThreadPreviewOverlay.tsx:81-94, 222-243` 有初始焦点、Escape 和 `aria-modal`，但没有焦点陷阱与关闭后焦点恢复。
- `src/widgets/sidebar/ResizableSidebar.tsx:25-45` 移动侧栏只有遮罩和关闭按钮，没有 dialog 语义、Escape、背景 inert 或 opener 恢复。

键盘焦点可以离开可见模态层进入背景；关闭后也可能丢失原触发位置。帖子预览已完成部分正确实现，因此应补齐而不是另建弹窗框架。

**最小修复与关闭条件**

复用原生 dialog 或项目现有焦点管理模式；记录 opener、限制 Tab、Escape 关闭并恢复焦点。浏览器键盘验收两个入口，不以 jsdom 代替最终焦点检查。

### A11Y-003 自动轮播未遵守 `prefers-reduced-motion`

**证据**

- `src/entities/thread/ImageCarousel.tsx:52-63`
- `src/widgets/layout/BannerCarousel.tsx:96-109`
- `src/pages/TournamentsPage/index.tsx:91-98`
- `src/pages/TournamentDetailPage/index.tsx:113-120`

多图场景无条件建立 4s/5s 定时切换；相邻视差 Hook 已检查 reduced motion，轮播没有共享这条可访问性边界。

**最小修复与关闭条件**

reduced-motion 下停止自动推进并取消弹簧/位移动画，保留手动切换；键盘焦点进入轮播控件时也暂停。系统偏好开/关分别做人工交互验收。

### A11Y-004 无限列表把焦点移向不可聚焦 article

**证据链**

- `src/widgets/layout/RootLayout.tsx:194-216` 加载新结果后执行 `nextCard.focus()`。
- `src/features/threads/components/ThreadListItem.tsx:95-100` 与 `ThreadCard.tsx:162-177` 的目标 article 没有 `tabIndex`。

代码会播报“加载完成”，但焦点调用没有有效落点，键盘用户不能按设计进入新增第一项。

**最小修复与关闭条件**

聚焦卡片内第一个真实交互元素，或给 article 增加 `tabIndex={-1}` 作为程序化焦点目标。验证用户仍停留在 sentinel 时才转移，主动离开后不夺回焦点。

### TEST-001 测试靠真实 XHR 失败后 fallback 通过

**证据链**

- 全量 Vitest 日志多次出现 `/meta/channels` 的 `AxiosError: Network Error`。
- `src/shared/hooks/useChannels.ts:55-116` 捕获错误并返回静态频道，因此测试继续通过。
- `src/tests/setup.ts` 只 stub 浏览器 API，没有隔离 Axios 网络层。

221 条测试通过只能证明 fallback 路径没有使组件崩溃，不能证明频道成功响应、解析和归一化路径正确；日志噪声也掩盖真正的异常。

**最小修复与关闭条件**

不必引入 MSW；定向 mock `apiClient` 即可分别覆盖成功响应和失败 fallback。全量测试不再发真实 XHR，两个分支均有显式断言。

### DOC-001 安全文档错误描述 Markdown 实现与边界

**证据链**

- `docs/development/security.md:15-22` 声称业务禁止 `dangerouslySetInnerHTML`，并称 `MarkdownText` 使用 `react-markdown` AST。
- `package.json` 没有 `react-markdown`。
- `src/shared/ui/MarkdownText.tsx:105-159, 246-252` 实际是自研正则解析、手工转义和 `dangerouslySetInnerHTML`。

当前实现先转义输入，危险协议测试也通过，因此本轮不把它误报为已存在 XSS。真实问题是维护者会基于错误文档修改高风险解析器。

**最小修复与关闭条件**

文档如实描述手工 parser、转义顺序和 URL 协议边界；补 HTML/属性注入、表格单元格、代码块、高亮组合测试。恶意输入只能作为文本或被拒绝。

### DOC-002 动态 OG 路由与部署文档落后于实现

**证据链**

- `docs/deployment/cloudflare_pages.md:96-112` 仍描述 `functions/share/*` 与 `/share/booklists/*`。
- 当前实现是 `functions/booklists/[id].js`、`threads/[id].js`、`tournaments/[id].js`、`u/[id].js`。
- `public/_routes.json:3` 只包含 canonical 路径。

部署人员按文档会验收不存在的旧 URL，同时漏掉帖子、作者和赛事 canonical 路由。

**最小修复与关闭条件**

按当前 Functions 和 `_routes.json` 更新部署/架构文档，所有 curl 示例必须能由 `check:og` 或真实部署验证。

### DATA-002 赛事参赛时间把浏览器本地时间按 UTC 保存

**证据链**

- `src/features/booklists/components/AddThreadsToBooklistModal.tsx:100-142` 与 `BooklistItemEditorModal.tsx:95-103, 122-129` 直接提交 `datetime-local` 产生的无时区字符串。
- 后端 `src/api/v1/schemas/booklist/booklist_item_add_data.py:19-21`、`booklist_item_update_request.py:14-16` 将其解析为普通 `datetime`，`src/core/booklist_repository.py:392-402` 原样写入数据库。
- 响应侧 `src/api/v1/schemas/booklist/booklist_item_detail.py:79-81` 使用 `UTCDateTime`；`src/shared/utc_datetime.py:13-24` 会把数据库中的 naive datetime 标记为 UTC `Z`。
- 前端编辑回填 `BooklistItemEditorModal.tsx:34-40` 再按浏览器本地时区显示该 `Z` 时间。

Asia/Shanghai 用户在 `datetime-local` 输入 `20:00`，请求发送的是无时区的 `20:00`；后端保存后响应为 `20:00Z`，再次编辑会显示次日 `04:00`。UTC 时区用户不受影响，但非 UTC 时区的新增和编辑 round-trip 会稳定偏移。

**最小修复与关闭条件**

在新增/编辑 API 边界把 `datetime-local` 值按浏览器本地时间解析后转换为 `toISOString()`；不要改变后端现有 UTC 响应契约。在至少 UTC、Asia/Shanghai 两个时区覆盖新增、读取、无改动保存和再次编辑，墙上时间/实际 UTC 时刻均必须符合预期。

### DATA-003 超长 AI 输入会使刷新清空全部本地 AI 历史

**证据链**

- `src/features/ai-search/components/AISearchTokenInput.tsx:236-275` 的可编辑输入和纯文本粘贴没有长度限制。
- `src/pages/AISearchPage/index.tsx:428-440` 只执行 `trim()`，随后 `startConversation` / `appendMessage` 会把完整内容写入 Zustand 与 localStorage。
- `src/features/ai-search/lib/session.ts:100-103` 的恢复 schema 限制单条消息最多 100,000 字符，但 `session.ts:259-280` 保存前不执行同一 schema 校验。
- 刷新时 `session.ts:215-255` 解析整个会话集合；任一消息超限会进入统一 `catch`，删除新旧两个 key 并返回空状态。最多 5 个本地会话会被一起清空。

正常输入与 Provider 生成内容已有数量/截断边界；问题只在可直接粘贴或编辑的用户消息越过 100,000 字符时触发，因此不扩大为一般会话可靠性问题。但单条合法写入路径可以破坏其他未损坏历史，数据损失边界明确。

**最小修复与关闭条件**

提交、编辑和保存使用同一最大长度；恢复时隔离或裁剪损坏会话，不因一条消息删除全部历史。定向测试 99,999、100,000、100,001 字符以及“一个损坏会话 + 四个正常会话”，刷新后正常历史必须保留。

### UX-003 无限加载失败后可被可见哨兵持续自动重试

**证据链**

- `src/shared/hooks/useInfiniteScrollTrigger.ts:28-47` 把 `isFetchingNextPage` 放入 effect 依赖；每次请求结束都会重建 `IntersectionObserver`。
- 下一页失败后 `isFetchingNextPage` 恢复为 `false`，`hasNextPage` 仍可为真；若哨兵仍在视口，新 Observer 会再次执行 `fetchNextPage()`。
- 该 Hook 被搜索、书单详情、赛事详情和赛事管理四个页面复用。搜索侧 `src/pages/SearchPage/index.tsx:175-182` 传入的 `requestNextPage` 也未带 `isFetchNextPageError` 门控；`useSearchResults.ts:383-395` 会再次发起前台请求。

React Query 自身的单次请求重试结束后，Observer 仍能开启下一轮请求，因此这里不是“框架按既定次数重试”的同义项。只有哨兵可见、下一页失败且仍有下一页时触发；首屏错误和正常分页不受影响。

**最小修复与关闭条件**

让 Hook 接收下一页错误状态，失败后停止自动触发，只由明确的“重试”动作恢复。模拟分页接口持续 500/网络失败，确认只执行配置内的重试次数，随后稳定停在带可操作重试入口的错误态。

### UX-004 “全部标记已读”失败不回滚且允许并发提交

**证据链**

- `src/features/notifications/components/NotificationCenter.tsx:283-306` 在请求前更新静态通知时间戳，并把所有关注更新写入本地 dismiss map。
- `NotificationCenter.tsx:308-314` 的失败分支只提示错误，没有恢复关注更新快照或重新拉取。
- `NotificationCenter.tsx:349-359` 的按钮未使用 `markAllViewed.isPending` 禁用，连续点击会并发调用 `src/features/follows/api/followsApi.ts:63-69`。

接口失败后，当前挂载周期仍显示“已清空”，服务端却保持未读；组件重挂载后关注通知可能重新出现。静态公告的 `lastOpenedAt` 本来就是本地语义，不应跟随后端回滚；需要回滚的是关注更新的乐观状态。接口通常幂等会降低并发写入破坏性，但不能消除误导和重复请求。

**最小修复与关闭条件**

提交前保存关注 dismiss 快照，失败时回滚并按需刷新 follows；pending 期间禁用按钮。覆盖成功、500、断网和连续点击，失败后本地/服务端未读状态一致且一次操作只产生一个 POST。

### UX-005 本地背景图持久化失败仍提示保存成功

**证据链**

- `src/pages/SettingsPage/index.tsx:36-71` 检查文件与 data URL 长度后调用 `updateSettings`，随后立即提示“已保存”；外层 `try/catch` 预期捕获存储失败。
- `src/shared/lib/settings.ts:120-127` 已在内部吞掉 `localStorage.setItem` 异常，只写 console，调用层永远接不到 `QuotaExceededError`。
- `src/shared/store/settingsStore.ts:26-30` 无论持久化是否成功都会更新内存状态。
- `src/pages/SettingsPage/AtmosphereSettingsSection.tsx:105-113` 对用户承诺最大 5MB 且会保存在浏览器；接近配额、同源已有数据或浏览器禁用存储时，该承诺无法成立。

失败时当前会话背景仍会立即生效并显示成功，刷新后却恢复旧值或丢失。4,500,000 字符的二次上限降低了常见浏览器触发概率，但不能保证同源剩余配额，也没有修复失败被静默吞掉的契约。

**最小修复与关闭条件**

让保存函数返回明确结果或抛出可识别错误；只有持久化成功才提交内存状态并提示成功。复用原生 Storage/IndexedDB 能力，不为此新增依赖。模拟配额不足和存储不可用，界面必须保留旧设置、显示失败，刷新后状态一致。

## 4. P3：工程稳定性与较窄缺陷

### BUILD-001 Vite 配置存在双 authority

仓库同时跟踪 `vite.config.ts`、`vite.config.js`、`vite.config.d.ts`。通过 Vite `resolveConfig` 复核，默认实际加载的是 `vite.config.js`。`pnpm build` 因先运行 `tsc -b` 暂时会同步 JS，但 `pnpm dev` 与 `build:analyze` 不保证先同步；修改文档所称的 TS 配置可能没有生效。

最小修复是只保留一个真实配置源，删除生成物 authority，并让 `pnpm dev`、`vite build`、`build:analyze` 都解析同一文件。

### BUILD-002 默认 lint 被 ignored Playground 产物污染

`package.json:11` 使用 `eslint .`，但 `eslint.config.js:36-42` 没有忽略 `playground/**`；当前本地 `playground/og-satori/.next` 与 JSX 文件造成 10 个 error。干净 CI checkout 因 Playground 被 `.gitignore` 排除，通常不会复现，导致本地与 CI 门禁不一致。

在 ESLint ignores 中加入 `playground/**`，或明确 lint 受控源码范围。保留 Playground 文件时 `pnpm lint` 仍应只报告当前 79 条源码 warning。

### A11Y-005 图片查看器 dialog 没有可访问名称

`src/shared/ui/ImageViewer.tsx:58-81` 的原生 dialog 没有 `aria-label` / `aria-labelledby`，可见标题只是普通 div。给标题稳定 id 并由 dialog 引用，或提供“查看图片”标签；在浏览器可访问性树中确认 dialog 有名称。

### TEST-002 动态 OG 自检未进入 CI

`package.json:20` 已有 `pnpm check:og`，但 `.github/workflows/ci.yml:23-38` 未执行；当前脚本也只调用书单、帖子、赛事 handler，没有调用作者 `u/[id]` handler。把自检加入 CI 并补作者 canonical 场景，使 Functions/HTMLRewriter 回归能够阻止合并。

### SEO-001 SPA 路由没有运行时页面标题同步

`index.html:27` 只有全站静态 title，`src` 内没有 `document.title` 或等价路由 metadata。动态 OG Function 只服务抓取 HTML，不会更新浏览器标签。用一个最小路由标题映射覆盖普通页面，详情页在数据可用后使用实体标题，不需要引入 Helmet 依赖。

### UX-006 About 苏醒动画的旧异步序列会覆盖新状态

`src/pages/AboutPage/index.tsx:153-179` 在进入背景模式后依次等待 600/300/500/400ms 并写入 `isWakingUp`、`isSharpening`，effect 没有取消标记。用户在序列结束前恢复界面时，新 effect 虽立即清零状态，旧 sequence 仍会在后续 await 后重新闭眼或保持模糊；`AboutPage/index.tsx:275-292, 350-355` 会据此覆盖页面、隐藏并禁用主 UI。普通单次动画正常，只有快速切换触发，因此降为 P3。最小修复是在 effect cleanup 取消当前 sequence，并在每次 await 后校验；快速隐藏/显示/再次隐藏时旧序列不得再写入新状态。

### UX-007 恢复浏览位置的延迟任务可写入后续页面

`src/widgets/layout/RootLayout.tsx:55-68` 用 100ms 延迟并最多重试 20 次写共享 `main-scroll-container.scrollTop`，没有任务 token、目标 URL 校验或取消句柄；`RootLayout.tsx:87-90` 在导航后启动它。目标页内容尚未撑高时重试可持续约 2 秒，期间若用户继续导航或改变筛选，旧任务仍会把旧位置写进新页面。单次恢复且不继续操作时是预期行为，故为低频 P3。最小修复是给恢复任务增加导航版本/取消函数，并在路由变化时终止；覆盖“继续浏览后立即跳页、改筛选、返回”三条路径。

## 5. Optimization：可排期优化

### PERF-001 部分请求未透传 AbortSignal

- `src/features/follows/hooks/useFollowsData.ts:12-25` → `followsApi.ts:35-58` 未接收 Query signal。
- `src/features/ai-search/lib/tools.ts:546-552` 调用 `discoveryApi.getRandomThreads` 时没有传 Agent signal。

离开页面、Query Key 改变或停止 AI 回合后，请求仍可能继续占用网络/后端资源。复用 Axios `signal` 参数即可，不需要新增取消层。此项是资源优化，不把未测量成本描述成用户可感知卡顿。

### TEST-003 覆盖率口径缺少 include 与 threshold

独立运行 `CI=1 pnpm exec vitest run --coverage --no-file-parallelism` 通过，报告 `statements 55.7% / lines 57.68%`；但 `vite.config.ts:74-78` 没有 `include` 或阈值，未被测试导入的源文件不会稳定进入分母，导入的图片资产反而以 0% 出现。当前数字不能作为全仓覆盖率结论。

先限定 `src/**/*.{ts,tsx}` 并排除生成类型、纯资产和明确入口，再决定是否设置低而真实的阈值；不要为了抬数字写形式主义测试。

### ARCH-001 仍有 5 处 FSD 反向依赖

ESLint 当前确认以下反向引用：

- `src/entities/booklist/BooklistCard.tsx` → `features/authors`
- `src/entities/booklist/BooklistListItem.tsx` → `features/authors`
- `src/entities/thread/lib/threadFilter.ts` → `features/preferences`
- `src/entities/user/UserHeaderCard.tsx` → `features/auth`
- `src/shared/lib/browseHistory.ts` → `entities/thread`

这些是维护边界而非当前运行时 bug。按最小方式下沉纯类型/纯展示或通过 props 注入；不要为清零 warning 建造新的通用层。

### BUILD-003 浏览器支持声明没有被构建 target 执行

`package.json:72-79` 声明 Safari 15、Chrome 100 等支持范围，但 `vite.config.ts:51-54` 使用 `build.target: 'esnext'`，Vite 不会自动把 browserslist 当 JS 转译目标。当前构建产物未发现已知会立即破坏这些浏览器的语法，因此不升级为兼容性 bug；但支持声明没有自动门禁。

应选择一个真实 authority：要么把 Vite target 改为明确浏览器/基线目标并做最小兼容构建检查，要么收紧 browserslist 文档，不要保留互不约束的两套声明。

## 6. 自动化验证与限制

本轮已完成：

- `pnpm typecheck`：通过。
- `CI=1 pnpm test:run`：65 个文件、221 条测试通过；日志存在真实 XHR fallback 噪声。
- `CI=1 pnpm exec vitest run --coverage --no-file-parallelism`：通过；覆盖率口径见 TEST-003。
- `pnpm lint:styles`：通过。
- `pnpm lint:ox`：失败，`src/shared/ui/CinematicCard.tsx:20` 有 1 条未使用 catch 参数 warning。
- `pnpm exec eslint src --report-unused-disable-directives`：0 error、79 warning。
- `pnpm lint`：失败，原因是 ignored Playground 产物产生 10 个 error，见 BUILD-002。
- `pnpm build`：通过，2681 个模块；主入口约 345.32 kB / gzip 101.26 kB。
- `pnpm check:og`：通过，但仅为 mock 自检。
- `pnpm audit --prod --audit-level high`：失败，见 SEC-001。
- Vite 配置解析：确认默认加载 `vite.config.js`。
- 第二轮针对 7 个新增项完成前后端源码交叉取证与既有 issue 去重；没有因纯文档增量重复运行全量测试/构建。
- 第一轮写入本文档时除本文档外无改动；第二轮复核时工作区已有其他任务的业务改动，均未由本审计修改。

本轮未完成：

- 未启动浏览器，未做键盘、读屏器、移动端、真实触控板或 reduced-motion 人工验收。
- 未对真实 Cloudflare、Vercel、Discord crawler、后端认证与通知接口做线上请求。
- 未采集 10/50 页 DOM、heap、长任务和帧率；`docs/code-review-2026-08-23.md` 的 PERF-401 继续保持测量项。
- 静态审计不能证明生产流量频率、真实漏洞可利用性或用户主观视觉效果。

## 7. 中央复核后不纳入的问题

- 不因文件超过 500/1000 行直接要求拆分；没有独立运行成本或稳定职责边界时，拆文件不自动降低复杂度。
- 不把 79 条 ESLint warning 全部登记为 bug；只保留能形成实际状态、可达性或门禁问题的条目。
- 不把所有 outdated 依赖列为升级任务；只优先处理安全补丁或当前工具明确弃用的路径。
- 不凭静态模型推动无限列表虚拟化；PERF-401 仍需真实 10/50 页数据。
- 不重复报告 2026-08-23 已关闭的 PERF-101～109、201～205、301、402～403。
- 不把自研 Markdown parser 直接定性为 XSS；当前输入先转义且危险协议测试通过，纳入的是文档与安全维护边界错误。
- 不报告“偏好 Snowflake 数组精度丢失”：前端偏好 mapper 与后端 serializer 均会保持字符串；搜索请求的 TypeScript cast 也不会在运行时把字符串转成 Number。
- 不报告“作者主页/同作者推荐会展示全站帖子”：后端虽然忽略独立 `author_name` 字段，但前端同时传入的 `include_authors` 会正常形成过滤条件。
- 不报告 QuickAdd 表单被 Query 刷新重置：当前关闭 focus refetch，modal 内也没有稳定的并发失效链，证据不足。
- 不把可伪造爬虫 UA 直接定性为 OG 安全漏洞：未取得真实缓存、限流、流量与资源消耗证据；当前只能作为部署侧抗滥用测量项。

## 8. 建议实施顺序

```text
批次 A：依赖安全 + 认证 authority + 数据契约/本地历史保护 + TLS + OG 生产边界
  ↓ 定向测试 / audit / 真实 OG 验收
批次 B：错误回滚/分页停止条件 + 背景持久化 + 键盘/焦点/reduced-motion + 测试网络隔离
  ↓ 自动化检查 + 浏览器人工验收
批次 C：过期动画/滚动任务 + Vite/lint/CI/覆盖率/FSD/标题与取消请求
  ↓ 工程门禁稳定后收束 warning 基线
```

任何批次如果需要迁移 React Router 7、引入新的弹窗/状态框架、改变后端协议或更换 OG 托管方案，应停止并单独确认，不以“修复审计问题”为理由自动扩大范围。
