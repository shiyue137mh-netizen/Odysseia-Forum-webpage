# AI 搜索 Agent（当前实现）

本文记录当前前端实现。AI 搜索是受认证与必要设置守卫保护的 `/ai-search` 页面，Agent、工具运行时、会话和展示均在浏览器执行；项目不提供模型服务，也没有后端 Agent。模型服务由用户在页面中配置的 OpenAI-compatible Provider 提供。

## 运行链路

```text
AISearchPage
  -> 读取本地 Provider 设置、用户偏好和 /meta/channels
  -> POST Provider /chat/completions（携带固定工具协议）
  -> Agent 最多循环 8 步
  -> 浏览器执行 search/draw/booklist 只读 API
  -> 详情读取后校验帖子引用
  -> 解析 Markdown、<thread> 引用和可选 followups
  -> 渲染帖子预览卡片或抽卡横向轨道
```

模型只接收固定协议、用户自定义提示词、动态搜索上下文和经过压缩的工具结果；其中用户喜好是软参考，服务端搜索偏好仍按协议约束搜索。工具结果和帖子正文都被视为不可信数据；模型不能直接读取论坛 Cookie、Authorization、Local Storage 或任意网络地址。浏览器仍会通过现有 `apiClient` 调用论坛 API。

## Provider 设置

`src/features/ai-search/api/modelsApi.ts` 和同目录的 `chatCompletionsApi.ts` 负责外部 Provider：

- Base URL 必须是 HTTPS；仅 `localhost`、`127.0.0.1` 和 `::1` 允许本地 HTTP。
- 设置页通过 `GET /models` 读取 `data[].id`，由用户选择模型；聊天请求使用 `POST /chat/completions`。
- 聊天请求默认 `stream: true`、`tool_choice: "auto"`，解析 SSE；Provider 返回普通 JSON 时也能解析。
- API Key、Base URL、模型、用户提示词、用户喜好和 `sendClientHeader` 保存在浏览器 `localStorage` 的 `odysseia_ai_search_settings_v1`。这不是服务端密钥存储，同源 XSS 和公共设备风险由用户承担。
- 可选请求头为 `X-Client-Name: odysseia-forum-webpage`；关闭后不影响核心功能。

实际 system message 由固定工具协议、可编辑的看板娘提示词、动态上下文和可选用户喜好拼接。动态上下文来自当前用户、服务端搜索偏好和 `/meta/channels`；频道下列出真实 Tag、虚拟 Tag 及映射源频道 Tag。

## 工具与限制

当前声明给模型的工具只有以下五个：

| 工具 | 行为与硬限制 |
| --- | --- |
| `search_threads` | 调用现有 `searchApi.search`；单次返回最多 12 个压缩候选，最多执行 3 次。支持关键词、频道、Tag、作者、创建/活跃日期、点赞/回复下限、收藏范围和排序；搜索 API 自动应用用户偏好。 |
| `search_tournaments` | 调用 `booklistsApi.listPublic` 并固定 `is_tournament=true`；单次最多取 8 个公开赛事，最多执行 2 次。赛事是特殊书单，不用于普通书单搜索。 |
| `draw_threads` | 调用 `/discovery/random`；每次 1–10 张，最多执行 2 次。卡池可选用户偏好、全社区或自选频道，可叠加包含/排除 Tag 和 AND/OR 逻辑。 |
| `get_resource_details` | 只允许读取本会话搜索结果中的帖子或赛事 ID；单次最多 3 个资源，整个 Agent 回合最多 8 篇帖子、4 个赛事。帖子文本单篇最多取 2000 字符，详情文本总量最多 8000 字符；赛事同时读取详情和前 8 个参赛条目。 |
| `ask_user` | 仅在关键歧义无法通过一次宽泛搜索解决时使用；问题最多 120 字，选项为 2–3 项，且必须是本次 assistant 消息唯一的工具调用。 |

Agent 总步数上限是 8。帖子候选会按最近使用保留最多 36 个；最终正文中的合法帖子引用最多渲染 6 个，重复、未知 ID、非法 YAML 或超量引用会降级为普通 Markdown。工具运行时还兼容历史消息中的 `get_thread_details` 名称，但当前工具声明和提示词只使用 `get_resource_details`。

搜索工具返回标题、作者、Tag、统计、时间和不超过 200 字符的首楼摘要；详情工具返回真实候选的首楼文本（截断时标记 `truncated`）。模型不得从未读取详情的候选中做确定性推荐。

## 消息、会话和持久化

Agent 内部使用 Chat Completions 的 `system`、`user`、`assistant`、`tool` 顺序。发起工具调用的 assistant 和工具结果在页面中隐藏，但会作为下一轮请求的原始协议消息保留；`reasoning_content`、工具调用和普通中途正文也会跟随协议继续发送。

`useAISearchConversationStore`（Zustand）负责会话状态：

- 最多保留 5 个会话，每个会话最多 48 条消息；超限时从完整的 user 回合边界裁剪。
- 最终 assistant 消息可以保存推理、工具轨迹、Usage、最多 36 个候选帖子、最多 2 批抽卡结果和最多 3 条续问。
- 会话、未读标记和消息通过 `odysseia_ai_search_conversations_v1` 写入 `localStorage`，并兼容迁移旧的单会话 key `odysseia_ai_search_session_v1`。
- 流式正文和运行中的轨迹只存在页面内存；用户停止、等待追问或完成后才作为消息写入会话。运行中的 AbortController 以模块级 Map 登记，因此 SPA 切页不会自动取消，回到 AI 页面仍可识别并停止；刷新/关闭页面不承诺续跑。
- 任务在非当前会话完成、失败或被停止时会标记未读；进入该会话后清除。

每轮模型返回的标准 `usage` 会累计输入、输出和总 Token；Provider 不返回 Usage 时不伪造统计。每次执行使用独立 `AbortController`，模型请求、普通搜索和详情请求使用同一 signal；当前 `/discovery/random` 的 API 封装没有 signal 参数，因此抽卡请求不具备同等的取消保证。

## 引用与 UI

模型按提示词在 Markdown 正文中输出：

```text
<thread>
thread_id: "真实帖子 ID"
reason: "推荐理由"
overview: "可选概览"
tone: "可选氛围"
</thread>
```

`responseParser` 使用 YAML + Zod 校验 ID 和字段，并只把本轮缓存中的帖子交给 `AISearchThreadReference`；仍兼容旧会话的 `synopsis` 和旧 XML 字段。`followups` 必须恰好包含 broader、narrower、alternate 各一条，否则不进入 UI。

AI 页面当前提供：

- 初始看板娘舞台；执行时根据 idle/thinking/searching/reading/complete/error 状态切换立绘，流式回复后收缩到页面上方。
- 可编辑的 contenteditable Token 输入框，支持 `$tag:名称$`、`$author:ID$`、`$channel:ID$`，并通过普通搜索建议 API 补全作者。
- 可展开的思考/工具轨迹、流式正文、停止/重试/编辑、追问按钮，以及复用现有帖子预览浮层的引用卡片。
- `draw_threads` 的结果由 `DiscoveryThreadCarousel` 展示，不把随机抽取伪装成相关度排序。

## 尚未实现或明确限制

- 没有内置模型、服务端代理或长期云端会话；Provider、API Key 和会话均是浏览器侧配置/存储。
- 抽卡 API 当前未接收 AbortSignal，停止生成时可能仍完成一次随机请求。
- 浏览器刷新、关闭或进程挂起不会恢复运行中的 Agent；Local Storage 配额不足时只保留内存会话。
