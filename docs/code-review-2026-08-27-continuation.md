# Odysseia Forum 全仓代码续审 Issue（2026-08-27）

> - 状态：第三轮只读续审完成；2026-08-28 前端范围 7 项已修复，后端参考项 4 项未修改
> - 前端基线：`main` / `d59f0a3b7456`；审计开始时已有 47 项未提交改动，均视为其他任务现场
> - 后端交叉取证基线：`/Users/macbookair/Odysseia-Forum` 的 `dev` / `e46e7ce22fed`；已有 README、文档和 `.DS_Store` 改动，均未触碰
> - 范围：前端运行时、认证、数据契约、通知、可访问性、性能、构建与供应链、Cloudflare Pages；必要时只读检查伴随后端的权限与响应契约
> - 非目标：不修改业务代码、配置、依赖或数据；不启动浏览器；不把静态推导描述为运行时实测

## 1. 结论摘要

本轮由三路 `luna / high` 子智能体分别检查契约与工程质量、运行时与性能、安全与供应链，主智能体随后按当前源码、伴随后端和生产 HTTP 响应逐项复核，并排除以下既有结论：

- `docs/code-review-2026-08-27.md` 已登记的 32 项及其中央复核排除项；
- `docs/code-review-2026-08-23.md` 已关闭的 PERF-101～109、201～205、301、402～403；
- PERF-401 等仍缺少运行时测量的数据项；
- 仅由 lint warning、文件长度、相似 JSX、理论性能成本或“可能过时”推导的低置信候选。

最终纳入 **6 个 P2、4 个 P3、1 个 Optimization**。没有发现新的 P1。

| ID | 级别 | 问题 | 主要仓库 |
| --- | --- | --- | --- |
| SEC-003 | P2 | 用户偏好接口允许已认证用户读写他人偏好 | 后端 |
| SEC-004 | P2 | 未鉴权且不限流的内存诊断端点泄露运行时信息并可强制 GC | 后端 |
| SEC-005 | P2 | 生产 HTML 缺少点击劫持防护 | 前端/部署 |
| NOTIF-001 | P2 | 关注通知使用错误的更新时间字段 | 前后端契约 |
| DATA-004 | P2 | 批量添加弹窗取消后保留旧输入 | 前端 |
| A11Y-006 | P2 | 公共自定义 Select 无法用键盘选择 | 前端 |
| AUTH-004 | P3 | 畸形 hash token 可在根组件初始化前抛错 | 前端 |
| AUTH-005 | P3 | 登出重定向 HTML 与全局 JSON 解析器冲突 | 前后端契约 |
| AUTH-006 | P3 | GET logout 可被第三方页面触发强制登出 | 后端 |
| API-001 | P3 | 创建书单把非法排序参数的 422 转换为 500 | 后端 |
| PERF-002 | Optimization | 设备方向权限异步返回后可能注册已卸载页面的 listener | 前端 |

## 2. P2：权限、安全、数据与可达性

### SEC-003 用户偏好接口允许已认证用户读写他人偏好

**证据链**

- `/Users/macbookair/Odysseia-Forum/src/api/v1/routers/preferences.py:20-30,63-68` 只通过路由级 `Depends(require_auth)` 确认请求者已登录，处理函数没有取得当前用户身份。
- 同文件 `:46,90-92` 直接把 URL 中的任意 `user_id` 传给仓储层。
- `/Users/macbookair/Odysseia-Forum/src/core/preferences_repository.py:22-55` 按传入的 `user_id` 查询或覆盖偏好，没有所有权校验。
- `src/features/preferences/api/preferencesApi.ts:58-89` 也把用户 ID 放在 `/preferences/users/{user_id}` 路径中；正常 UI 使用当前用户 ID，不能阻止攻击者绕过前端直接改写请求。

**触发与影响**

任意已认证用户只要替换路径中的 Discord 用户 ID，就可以读取或覆盖其他用户的搜索偏好。写入会改变受害者后续搜索过滤与结果行为；读取则暴露其频道、作者、标签、关键词等偏好数据。

**反证与边界**

接口摘要写的是“指定用户”，可能来自历史设计；但当前没有管理员权限分支，也没有普通用户修改他人偏好的合理前端入口。即使跨用户读取曾被设计为可用，跨用户写入仍缺少必要授权。

**最小修复**

优先改为 `/preferences/me`，从认证上下文取得用户 ID；或在现有路由注入 `current_user=Depends(require_auth)`，强制路径 ID 与当前用户一致。若确有管理员需求，单独增加显式管理员路由和权限检查，不复用普通用户入口。

**关闭条件**

跨用户 GET/PUT 返回 403 或 404；当前用户自身读写保持正常；新增路由测试覆盖同用户、不同用户与未登录三条路径。

### SEC-004 未鉴权且不限流的内存诊断端点泄露运行时信息并可强制 GC

**证据链**

- `/Users/macbookair/Odysseia-Forum/src/api/main.py:196-375` 直接暴露 `/v1/debug/memory`、`/memory/sources`、`/memory/force-gc` 和 `/memory/pools`，没有认证、API Key 或生产环境开关。
- `memory` 与 `sources` 遍历 `gc.get_objects()`，返回 RSS、对象总数、Python 类型名和模块来源；`pools` 返回 SQLAlchemy 连接池状态。
- `force-gc` 在每次请求中依次执行 `gc.collect(2)`、`gc.collect(1)`、`gc.collect(0)`。
- `/Users/macbookair/Odysseia-Forum/src/api/middleware/rate_limit_middleware.py:24-27,52-55` 将整个 `/v1/debug` 前缀加入限流白名单，因此匿名请求也不会经过全局限流。

**触发与影响**

匿名访问者可以枚举运行时模块、对象和连接池状态，并重复触发全量 GC。前者扩大部署与依赖信息暴露，后者会在 API 事件循环内制造同步 CPU 与延迟抖动；不限流使请求成本可以被持续放大。

**反证与边界**

这些数据不直接包含业务表内容或密钥，单次 GC 也不等同于服务必然不可用；问题在于生产可达、匿名、同步高成本且明确绕过限流的组合。

**最小修复**

生产环境不注册这些路由。若必须保留，增加显式 debug 开关和管理员/API Key 鉴权，将 `/v1/debug` 移出全局白名单，并对 `force-gc` 设置单独的低频限流。

**关闭条件**

生产配置下四个端点返回 404，或未授权请求返回 401/403；`force-gc` 有可验证的独立限流；测试确认普通 `/v1/health` 行为不受影响。

### SEC-005 生产 HTML 缺少点击劫持防护

**证据链**

- `public/_headers:1-2` 只为 `/assets/*` 设置缓存头，没有全站 `Content-Security-Policy: frame-ancestors` 或 `X-Frame-Options`。
- `index.html:1-35` 没有 CSP meta；源码中也没有 frame-busting 逻辑。
- 2026-08-27 对 `https://odysseia-forum-webpage.pages.dev/` 执行只读 `curl -I`：响应包含 `Referrer-Policy: strict-origin-when-cross-origin` 和 `X-Content-Type-Options: nosniff`，但没有 `frame-ancestors` 或 `X-Frame-Options`。

**触发与影响**

第三方站点可以把论坛页面放入 iframe，再用透明或错位覆盖层诱导已登录用户点击关注、收藏、书单管理等真实控件。这是 UI redressing，不依赖攻击者读取跨域响应。

**反证与边界**

本轮没有启动浏览器完成实际 iframe 点击演示；结论基于生产响应与 HTML 的客观缺失。若产品有明确嵌入需求，不能直接使用 `DENY`，但当前仓库与文档未发现此类需求。

**最小修复**

为 HTML 响应增加 `Content-Security-Policy: frame-ancestors 'none'`，并可同时保留 `X-Frame-Options: DENY` 作为旧浏览器回退。若需要同源嵌入，改为 `'self'` 或明确来源列表。

**关闭条件**

生产 HTML 响应包含预期 header；外部 origin 的 iframe 加载被浏览器拒绝；站内正常导航与 Cloudflare Functions 元数据重写保持正常。

### NOTIF-001 关注通知使用错误的更新时间字段

**证据链**

- `/Users/macbookair/Odysseia-Forum/src/api/v1/schemas/follows/followed_thread_response.py:18-35` 明确定义 `latest_update_at` 为“帖子最近一次有新消息的时间”。
- `/Users/macbookair/Odysseia-Forum/src/core/follow_repository.py:363-381` 返回 `latest_update_at`，并以它和 `last_viewed_at` 计算 `has_update`。
- `src/features/notifications/components/NotificationCenter.tsx:174-191,254-260,299-305` 却用 `last_active_at` 作为通知显示时间和本地 dismiss 标识。
- `src/features/follows/lib/sortFollows.ts:15-18` 的关注列表已正确优先使用 `latest_update_at`，说明两个字段在前端也被视为不同语义。

**触发与影响**

用户点击 dismiss 后，本地记录的是当时的 `last_active_at`。只要帖子出现普通回复、推进 `last_active_at`，而后端 `has_update` 仍为 true，同一条更新通知就会重新出现；通知时间也会显示普通活跃时间，而不是实际更新事件时间。

**反证与边界**

更新消息本身也可能同时推进两个时间，所以部分正常数据看起来一致；但仓储层分别维护 `update_thread_activity()` 与 `update_thread_update_info()`，字段契约并不等价。

**最小修复**

通知显示、比较和 dismiss 均优先使用 `thread.latest_update_at`，再按兼容需要回退到 `last_active_at` 或 `created_at`。不要新增第二套通知状态。

**关闭条件**

用“更新事件时间”和“普通回复时间”不同的数据验证：通知时间、点击 dismiss、普通回复后的状态和下一次真实更新重新出现均符合 `latest_update_at`。

### DATA-004 批量添加弹窗取消后保留旧输入

**证据链**

- `src/features/booklists/components/AddThreadsToBooklistModal.tsx:36-43` 的 Thread ID、备注、排序权重和参赛时间只在组件首次挂载时初始化；关闭时仅 `return null`，没有重置。
- `src/pages/BooklistDetailPage/index.tsx:567-572` 与 `src/pages/TournamentManagePage/index.tsx:290-299` 始终挂载同一组件实例，只切换 `isOpen`。
- 同目录的 `BooklistFormModal.tsx:74-83`、`BooklistPublishModal.tsx:56-60` 和 `BooklistItemEditorModal.tsx:59-66` 都在重新打开时同步初始值，项目相邻模式并非保留取消后的草稿。

**触发与影响**

用户输入帖子 ID、备注、排序或参赛时间后点击取消，再次打开弹窗时旧值仍在。若未重新核对就提交，可能把旧帖子重新加入书单/赛事，并复用旧的参赛时间或备注。

**反证与边界**

后端会对仍然存在的重复条目去重，所以部分误操作只表现为无效提交；但此前已移除的帖子仍可能被重新加入。界面也没有“保留草稿”提示，不能把残留状态视为明确产品能力。

**最小修复**

在 `isOpen` 从 false 变为 true 时重置四个字段，或让父级按打开批次重新挂载组件。提交失败且弹窗保持打开时应保留当前输入，避免破坏重试体验。

**关闭条件**

取消后重新打开时四个字段为空；提交成功后再次打开为空；提交失败后弹窗内输入仍保留。

### A11Y-006 公共自定义 Select 无法用键盘选择

**证据链**

- `src/shared/ui/Select.tsx:119-146` 的选项只有 `onClick`；`li role="option"` 没有可聚焦能力、键盘事件或 active descendant，父级 `ul` 也没有 `listbox` 语义。
- 同文件 `:151-171` 的触发按钮没有 `aria-expanded`、`aria-controls` 或打开后的焦点转移。
- 该组件被搜索排序、书单列表、赛事列表、标签页、偏好设置等至少 6 个页面/面板复用。

**触发与影响**

键盘用户可以 Tab 到按钮并用 Enter/Space 打开下拉，但焦点仍留在按钮；ArrowUp/ArrowDown、Home/End 和 Enter 选择均无处理，继续 Tab 会离开组件。读屏器也无法获得完整的 combobox/listbox 状态。

**反证与边界**

鼠标路径可用，Escape 也能关闭；它与既有 A11Y-001 的卡片/通知主入口不同，本项是共享表单控件本身缺少键盘选择模型。

**最小修复**

优先评估改用原生 `<select>`，复用浏览器键盘与辅助技术能力；若必须保留 Portal 自定义样式，则补齐 combobox/listbox 语义、焦点管理、Arrow/Home/End、Enter/Space、Escape 和当前选项状态。

**关闭条件**

只用键盘可完成打开、移动、选择、取消和关闭；读屏器能读出控件名称、展开状态、当前选项及选项数量；所有现有调用点保持值同步。

## 3. P3：较窄的稳定性与协议问题

### AUTH-004 畸形 hash token 可在根组件初始化前抛错

**证据链**

- `src/shared/lib/authSession.ts:39-42` 对 hash 中的 token 直接执行 `decodeURIComponent()`，没有捕获 `URIError`。
- `src/app/App.tsx:79-80` 在 `App` 自身的 `useState` initializer 中调用 `hasAuthTokenInHash()`。
- `/#token=%` 或 `/#token=%E0%A4` 都是稳定的非法 percent-encoding；异常发生在 `App` 返回其内部 `<ErrorBoundary>` 之前，该边界无法接管。

**触发与影响**

用户打开带畸形 token fragment 的链接时，根组件初始化会中断，页面可能白屏。正常首页与合法 OAuth token 不受影响，用户移除 fragment 后可以恢复，因此定为 P3。

**反证与边界**

后端签发的 JWT 使用合法 base64url 字符，正常 OAuth 回调不会主动生成畸形编码；主要风险来自错误复制、损坏链接或外部构造链接，不涉及账户接管。

**最小修复与关闭条件**

在 `extractAuthTokenFromHash()` 捕获解码异常并返回 `null`，必要时清理无效 fragment。测试合法 token、无 token、孤立 `%` 和不完整 UTF-8 编码；畸形输入不得阻断应用启动。

### AUTH-005 登出重定向 HTML 与全局 JSON 解析器冲突

**证据链**

- `/Users/macbookair/Odysseia-Forum/src/api/v1/routers/auth.py:801-817` 的 `/auth/logout` 返回 302，并在响应上删除 cookie；XHR 跟随重定向后得到前端 HTML。
- `src/features/auth/api/authApi.ts:42-47` 把它作为普通 API 请求等待。
- `src/shared/api/client.ts:24-33,36-40` 对所有字符串响应执行 `JSON.parse`；HTML 首次解析失败后，fallback 又执行一次 `JSON.parse`，最终 Promise reject。

**触发与影响**

后端已经成功删除 cookie，但前端仍记录“Backend logout failed”或让调用 Promise reject，制造错误遥测与错误契约。当前两个调用方最终都会导航到登录页，本地会话也在 `finally` 中清理，所以用户通常仍能退出，定为 P3 而非 AUTH-001 的重复项。

**最小修复与关闭条件**

让 API logout 返回 JSON 或 204，由 SPA 负责导航；或为该请求显式禁用 JSON transform。实际请求成功时 `authApi.logout()` 必须 resolve，cookie 与本地状态均清理；网络/服务失败仍执行本地失效。

### AUTH-006 GET logout 可被第三方页面触发强制登出

**证据链**

- `/Users/macbookair/Odysseia-Forum/src/api/v1/routers/auth.py:270-294` 创建 `SameSite=None; Secure` 的 `session` Cookie。
- 同文件 `:801-817` 使用无鉴权 GET 删除该 Cookie，没有 Origin、Referer、CSRF token 或 Fetch Metadata 校验。
- 在允许第三方 Cookie 的浏览器中，攻击者页面可以用 `<img src="https://forum.shimmerday.top/v1/auth/logout">` 触发请求并接受删除 Cookie 的 302 响应。

**触发与影响**

攻击者只能强制用户退出 cookie 会话，不能读取响应或接管账户；Authorization header 模式的本地 token 也不会被该跨站请求清理。因此这是可用性与骚扰风险，定为 P3。

**反证与边界**

屏蔽第三方 Cookie 的浏览器可能阻止该链路；仅把 GET 改为 POST 也不足以阻止跨站 HTML form 提交。

**最小修复与关闭条件**

改为 POST，并校验可信 Origin/Fetch Metadata，或增加适用于 Cookie 会话的 CSRF token。跨站 GET/POST 均不得改变会话；站内前端仍能退出 cookie 与 Authorization 两种模式。

### API-001 创建书单把非法排序参数的 422 转换为 500

**证据链**

- `/Users/macbookair/Odysseia-Forum/src/api/v1/routers/booklists.py:59-82` 的 `_resolve_sort_params()` 对非法 `default_sort_method` 或 `default_sort_order` 明确抛出 422。
- 同文件 `:210-247` 的 `create_booklist()` 只有 `except Exception`，会捕获该 `HTTPException` 并统一改写为 500。
- 同一文件其他路由已经使用 `except HTTPException: raise`，说明预期模式是保留业务状态码。

**触发与影响**

直接 API 客户端或未来使用新排序字段的前端发送非法枚举时，会收到通用 500，而不是可纠正的 422。无效请求可能被错误重试或计入服务端故障告警。

**反证与边界**

当前 UI 只发送合法选项，FastAPI 的类型级校验也仍会在进入函数前返回 422；问题只覆盖函数内部的排序枚举校验，因此定为 P3。

**最小修复与关闭条件**

在创建路由增加 `except HTTPException: raise`，保留真正内部异常的 500。非法排序方式和顺序均返回 422 及具体信息；合法创建保持成功；数据库异常仍返回 500。

## 4. Optimization：可排期优化

### PERF-002 设备方向权限异步返回后可能注册已卸载页面的 listener

**证据链**

- `src/shared/hooks/useDeviceOrientationParallax.ts:40-47` 在 `await requestPermission()` 返回后直接调用 `startListening()`，没有卸载标志。
- 同文件 `:55-59` 的 cleanup 只能移除清理当时已经注册的 listener。
- iOS 权限请求 pending 时若页面卸载，cleanup 先执行；权限随后 resolve 为 granted，旧闭包仍会注册 `deviceorientation` listener。
- 该 Hook 通过 `useSettledParallax` 被认证背景和 About 页面使用。

**影响与边界**

旧页面 listener 会保留 `targetRef` 与回调闭包，并继续处理方向事件。链路只存在于需要异步权限的设备、且用户在权限返回前离开页面的窄场景，没有运行时数量测量，因此作为 Optimization 而非性能缺陷。

**最小修复与关闭条件**

在 effect 内增加 `cancelled` 标志，cleanup 置为 true；`await` 返回后先检查再监听。用可控 Promise 测试卸载前后 resolve：卸载后不得注册或触发旧回调，正常授权仍能监听并在卸载时移除。

## 5. 自动化验证、客观诊断与限制

已完成：

- `pnpm exec tsc --noEmit --pretty false -p tsconfig.json`：通过。
- `pnpm exec tsc --noEmit --pretty false -p tsconfig.node.json`：通过。
- `pnpm exec stylelint "src/**/*.{css,tsx}" --allow-empty-input`：通过。
- `pnpm exec eslint src functions scripts --report-unused-disable-directives --max-warnings 79`：0 error、78 warning，通过当前源码棘轮；没有把 warning 数量直接登记为问题。
- `git diff --check`：审计开始时的业务改动无空白错误；本文档写入后再次检查。
- `pnpm audit --prod --json`：当前未提交依赖升级现场为 2 moderate、0 high、0 critical。两项均来自 React Router 6.30.6；其中 SSR/Data/Framework hydration 公告不适用于当前 Vite Declarative SPA，开放重定向公告未闭合当前用户输入到外部导航的触发链，故本轮不新增供应链 issue。
- `curl -I https://odysseia-forum-webpage.pages.dev/`：客观确认生产 HTML 缺少 `frame-ancestors` / `X-Frame-Options`；这属于 HTTP 响应诊断，不是浏览器交互验收。

未完成：

- 未启动浏览器，未完成键盘、读屏器、iframe、iOS 设备方向或表单人工交互验收。
- 未调用生产 debug、偏好写入、logout 等端点，避免对线上状态或资源造成影响。
- 未运行后端测试，也未构造真实跨用户请求；后端候选来自当前权限依赖、路由和仓储的静态闭环。
- 未运行完整构建或全量测试；本轮只新增文档，类型、样式和定向 lint 已足以验证文档之外没有审计引入的源码变化。

## 6. 中央复核后不纳入的问题

- 不重复记录旧文档中的 32 项、已关闭性能项或 PERF-401 的未测量虚拟化结论。
- 当前 `pnpm audit` 已不再复现 SEC-001 的“38 个漏洞、14 high”，但这是哥哥现有未提交依赖升级的结果；旧文档保留历史基线，本续审不篡改旧记录，也不把同一问题重新登记。
- 默认全仓 `eslint .` 仍会被 `coverage/` 与 `playground/og-satori/.next` 生成产物阻断；这属于既有 BUILD-002 的同类门禁问题，不重复登记。
- `/v1/follows/` 默认 `limit=10000` 有响应体与客户端筛选优化空间，但没有用户规模、响应体积或线上耗时数据，不把“可能大”写成性能结论。
- `useLayoutPreference` 在 localStorage 写入失败时可能丢失刷新后的布局选择，与既有本地持久化失败问题相近且触发条件窄，本轮不单列。
- 不因 `CinematicCard.tsx` 当前没有仓库消费者就直接要求删除；没有构建依赖图或外部深导入证据时，孤儿扫描命中不等于可安全删除。
- 不把 Docker 默认密码、`SYS_PTRACE`、FastAPI docs、CORS fallback、普通字符串 API Key 比较等硬化命中升级为缺陷；当前部署方式或可利用链证据不足。

## 7. 建议修复顺序

```text
批次 A：权限与生产暴露
  SEC-003 → SEC-004 → SEC-005

批次 B：用户数据与可达性
  NOTIF-001 → DATA-004 → A11Y-006

批次 C：较窄协议与稳定性
  AUTH-004 → AUTH-005 → AUTH-006 → API-001 → PERF-002
```

若修复 SEC-003、SEC-004 或 AUTH-006，需要修改后端权限/认证边界，应在伴随后端单独实施并运行针对性 API 测试；不要混入前端修复批次。

## 8. 前端修复结果（2026-08-28）

本轮实施严格限定在前端仓库。伴随后端仅用于确认数据与响应契约，最终没有保留任何后端源码、测试或文档改动。

| ID | 状态 | 实施结果 |
| --- | --- | --- |
| SEC-003 | 后端参考，未修改 | 需要后端约束偏好接口只能读写当前认证用户 |
| SEC-004 | 后端参考，未修改 | 需要后端移除或保护生产内存诊断与强制 GC 端点 |
| SEC-005 | 已修复 | Cloudflare Pages 静态 HTML 与 Functions 动态 HTML 均增加 `frame-ancestors 'none'` 和 `X-Frame-Options: DENY` |
| NOTIF-001 | 已修复 | 通知显示、dismiss 和全部已读统一优先使用 `latest_update_at` |
| DATA-004 | 已修复 | 弹窗内容随打开批次重新挂载；取消或成功关闭后清空，提交失败且保持打开时保留输入 |
| A11Y-006 | 已修复 | 公共 Select 补齐 listbox/option 语义、焦点管理和完整键盘操作 |
| AUTH-004 | 已修复 | 畸形 hash percent-encoding 返回 `null`，不再中断根组件初始化 |
| AUTH-005 | 已修复（前端） | 保留现有后端 GET/302 契约，为 logout 单独禁用 JSON transform；无论请求结果均失效本地会话 |
| AUTH-006 | 后端参考，未修改 | GET logout 的跨站强制登出风险只能在后端通过方法与 CSRF/Origin 边界解决 |
| API-001 | 后端参考，未修改 | 创建书单保留 422 需要后端调整异常处理 |
| PERF-002 | 已修复 | 权限异步返回前检查卸载标记，卸载后不再注册设备方向 listener |

修复验证：

- 前端完整 Vitest：72 个测试文件、241 个用例通过。
- 前端生产构建：通过。
- 两套 TypeScript 检查：通过。
- 动态 OG 自检与 Stylelint：通过。
- 最终定向复跑：6 个测试文件、18 个用例通过；logout 协议调整后 `authApi` 的 8 个用例再次单独通过。
- 未启动浏览器；真实键盘/读屏器、外部 iframe 拒绝和 iOS 设备方向权限仍需人工验收。
