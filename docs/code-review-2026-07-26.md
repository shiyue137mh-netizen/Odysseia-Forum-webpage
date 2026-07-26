# 全量代码审查报告

> 审查日期：2026-07-26　　审查版本：`odysseia-forum-web@2.3.13`（main @ eab1cd73）
> 范围：`src/` 全量 40,398 行 / 293 文件 + 构建配置 + 文档 + 仓库卫生
> 方法：7 个并行模块调研 + 工具链实测（tsc / eslint / oxlint / stylelint / vitest / 产物分析）
> 性质：**只读审查，未修改任何源文件**

---

## 0. 一句话结论

**这不是屎山。** 项目的架构骨架、类型安全和领域建模明显好于"以结果为中心开发"的预期——`tsc --noEmit` 零错误、75 个测试全绿且断言质量扎实、`Thread` 领域类型全局只有一份定义、FSD 分层意图清晰。

真正的债务不是"代码写得烂"，而是**三个系统性缺陷**：

1. **质量门禁被主动关闭** —— ESLint 关掉了几乎所有规则、构建不跑类型检查、stylelint 根本跑不起来、没有 CI。护栏拆了，所以后续的债务能无声堆积。
2. **交付层从未被优化** —— 零代码分割，全站打成一个 1.25 MB 的 JS 文件。
3. **"静默失败"成为一种习惯** —— 多条降级路径吞掉错误后伪装成正常，生产问题无法定位。

按投入产出比排序，修复顺序应是：**门禁 → 交付 → 数据流 → 结构去重**。

---

## 1. 客观指标（实测，非估算）

| 维度 | 结果 | 判定 |
| --- | --- | --- |
| 源码规模 | 40,398 行 / 293 文件（含生成的 `openapi.d.ts` 5,718 行） | — |
| `tsc --noEmit` | **exit 0，零错误**（`strict: true` + `noUnusedLocals`） | ✅ 健康 |
| `npm run lint` | 0 error 0 warning | ⚠️ **假绿**，见 2.1 |
| 恢复规则后的真实 lint | **86 warning** | ❌ |
| `npm run lint:styles` | **执行失败**（缺 `postcss-html` 依赖） | ❌ 从未生效 |
| `oxlint`（严格档 207 规则） | 429 条，其中 134 条函数过长 / 32 条文件过长 | ⚠️ 结构性 |
| `vitest run` | **22 文件 / 75 用例全部通过**，0 skip | ✅ |
| 测试覆盖广度 | 18 个 feature 中 **14 个零测试** | ❌ |
| CI | `.github/` **不存在** | ❌ |
| 生产产物 | **单个 JS 1,281,495 字节 + CSS 174,598 字节** | ❌ |
| 代码分割 | `React.lazy` / `Suspense` 全仓 **0 处** | ❌ |
| `any` / `console` / `@ts-ignore` | 15 / 26 / **0** | ✅ 可接受 |

### 1.1 恢复被关闭规则后的分布

| 规则 | 数量 |
| --- | --- |
| `react-hooks/set-state-in-effect` | 39 |
| `react-hooks/exhaustive-deps` | 20 |
| `@typescript-eslint/no-explicit-any` | 15 |
| `no-console`（已放行 warn/error） | 7 |
| `@typescript-eslint/no-unused-vars` | 5 |

39 处 `set-state-in-effect` 横跨所有分层（`ThemeProvider`、`ProtectedRoute:16`、`ThreadCard:83`、`useTheme:92`、9 个页面各 1–2 处），说明"用 effect 同步派生状态"已成为项目的默认写法，而不是个别失误。

---

## 2. 系统性缺陷

### 2.1 质量门禁被主动关闭（根因）

[`eslint.config.js:37`](eslint.config.js:37) 的注释直白记录了动机：

> `// 哥哥，我把这些新发现的严苛规则全部关掉了，咱们先保命要紧`

被关闭的规则包括 `exhaustive-deps`、`set-state-in-effect`、`no-explicit-any`、`no-unused-vars`、`no-console`、`no-undef`、`react-refresh/only-export-components`。

同一时期（commit `2ea9b3d2`，2026-04-21「npm包升级第一步」），`package.json` 的 lint 脚本从
`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`
改成了
`eslint . --report-unused-disable-directives`。
去掉 `--ext ts,tsx` 是对的（ESLint 10 flat config 不再支持），但 `--max-warnings 0` 是顺手一起删的——warning 从"阻断"降级为"打印"。

配套失效的还有：
- `"build": "vite build"` 不含 `tsc -b`，类型错误不阻断构建；
- `eslint.config.js:9-16` 把 `*.config.ts` 整体 ignore，`tsconfig.node.json` 又没有 `strict`——构建配置既不被 lint 也不被严格类型检查；
- `npm run lint:styles` 因缺依赖直接崩溃，样式 lint 事实上从未运行过；
- `.github/` 不存在，[`docs/testing/vitest_ci_process.md`](docs/testing/vitest_ci_process.md) 第 4 节写的 4 条 PR 门禁全部是虚构的。

**这是所有其他债务的上游成因。** 好消息是当前 `tsc` 和 `eslint` 都是干净的，把门禁加回去是**零成本**的。

### 2.2 交付层：1.25 MB 单包

[`src/app/router.tsx:2-21`](src/app/router.tsx:2) 静态 import 全部 20 个页面，`vite.config.ts` 无 `manualChunks`，全仓零 `lazy`/`Suspense`。实测 `dist/assets/` 只有一个 JS 文件。

被裹挟进首屏的包括：
- [`src/pages/TestPage.tsx`](src/pages/TestPage.tsx)（调试页，路由虽有 `isDevToolsEnabled` 守卫，但顶层静态 import 让 tree-shaking 无效）；
- [`ThemeProvider.tsx:228-312`](src/app/themes/ThemeProvider.tsx:228) 的 `window.odDebugTheme` 约 90 行调试代码（无 `import.meta.env.DEV` 守卫，已在产物中确认字符串存在；而 `App.tsx:31` 的 `window.queryClient` 反而有守卫，标准不一致）；
- 8 个**从未被 import 过的依赖**（已逐个 grep 验证为 0 命中）：`three`、`@types/three`、`ahooks`、`date-fns`、`embla-carousel-react`、`remark-gfm`、`class-variance-authority`、`ts-morph`/`ts-node`。

> `remark-gfm` 值得单独确认：项目在用 `react-markdown` 却没接上 gfm 插件，意味着表格/删除线语法目前渲染不出来——这可能是个未被发现的 bug 而非单纯的冗余依赖。

`@tanstack/react-virtual` 同样 0 命中，但 README 宣称"虚拟长列表"是核心特性——**这项特性并不存在**，无限滚动下 DOM 节点随滚动无限累积。

### 2.3 "静默失败"模式

这是本次审查中最值得警惕的一类问题：降级路径存在，但**没有任何可观测性**，故障表现为"一切正常"。

| 位置 | 行为 | 后果 |
| --- | --- | --- |
| [`shared/api/client.ts:21-32`](src/shared/api/client.ts:21) | 用正则 `/: (\d{16,})/g` 改写**整个 JSON 字符串**修复大整数 | 帖子正文含 16 位数字即导致 `JSON.parse` 失败 → catch 静默回退 → **整页 Snowflake ID 精度损坏，无任何日志** |
| [`shared/hooks/useChannels.ts:83-103`](src/shared/hooks/useChannels.ts:83) | queryFn 内 try/catch 把任何异常转成"成功返回静态配置" | `retry: 1` 永不触发、`isError` 恒为 false、2024 年的过期频道列表被当正常数据缓存 |
| [`features/draw/components/DrawRevealOverlay.tsx`](src/features/draw/components/DrawRevealOverlay.tsx) | 声明了 `error`/`onRetry` 等 5 个 props 但一个都没解构，`phase: "error"` 无渲染分支 | 抽卡失败时用户看到**纯黑遮罩**，重试按钮永远触发不了 |
| [`features/notifications/.../NotificationCenter.tsx:254`](src/features/notifications/components/NotificationCenter.tsx:254) | "全部已读"接口失败仅 `console.error` | 本地已乐观清空且不回滚，用户以为成功了 |
| [`shared/lib/searchTokenizer.ts:43`](src/shared/lib/searchTokenizer.ts:43) | 日期区间 `from >= to` 直接返回 null | 用户在日期选择器里先改结束日期（常见中间态）→ 两个输入框同时被清空，无提示 |

`client.ts:21` 那条是**最高优先级修复项**：它把"某一条帖子的正文内容"变成了"整页 ID 全错"的触发条件，且完全不可观测。

---

## 3. 架构与分层

### 3.1 FSD 违规全表（已 grep 核实）

FSD 铁律是"下层不得引用上层、同层不应横向依赖"。实测违规 **14 条向上依赖 + 11 条横向依赖 + 1 个真实循环**。

**shared → 上层（3 条，最严重）**
| 文件 | 引用了 |
| --- | --- |
| [`shared/ui/LazyImage.tsx:3`](src/shared/ui/LazyImage.tsx:3) | `@/features/threads/lib/thumbnailRepairQueue` |
| [`shared/lib/notify.ts:2`](src/shared/lib/notify.ts:2) | `@/features/mascot/lib/mascotToast` |
| [`shared/lib/browseHistory.ts:1`](src/shared/lib/browseHistory.ts:1) | `@/entities/thread/types` |

`LazyImage` 已经从"懒加载图片原子组件"退化成"帖子缩略图组件"——连渲染头像都被迫拖上整套业务逻辑。`notify.ts` 那条让 mascot 变成了事实上的全局基础设施。

**entities → 上层（11 条）**
`ThreadCard.tsx:16-19`、`ThreadListItem.tsx:20,21,26`、`BooklistCard.tsx:3`、`BooklistListItem.tsx:4`、`UserHeaderCard.tsx:2`、`threadFilter.ts:2`。其中 `UserHeaderCard` 让领域组件反向依赖某个 API 模块的类型定义。

**features ↔ widgets 循环**
`features/threads/components/{SimilarRecommendations,AuthorRecommendations}.tsx:10` 引用 `@/widgets/content-display/ContentDisplayCards`，而 `widgets/thread-preview/ThreadPreviewOverlay.tsx:31,32` 又引用这两个 feature 组件。这是真实的模块环，会造成 HMR 异常与 chunk 无法拆分。

**booklists ⇄ tournaments 循环**
- `features/booklists/hooks/useBooklistsData.ts:13` → `@/features/tournaments/lib/queryKeys`
- `features/tournaments/api/tournamentsApi.ts:1` → `@/features/booklists/api/booklistsApi`

根因是 `tournamentsApi` 三个方法全是 `booklistsApi` 的纯转发，却另起了一套 `["tournaments", ...]` 键空间，导致 booklists 每次写操作都要手工双份失效缓存——**漏一处就是脏缓存**。

**其余横向依赖（9 条）**：authors→preferences/search、banner→auth/mascot、tournaments→authors、discovery→authors/search、easter-eggs→mascot(×6)、notifications→follows/search、plaza→banner/booklists/discovery/preferences、threads→search(×6)。

其中 `search/store/previewStore` 被 authors / notifications / threads 三个模块引用——它实际上是全局预览状态，应上移到 `shared/store` 或 `entities/thread`。

> **建议**：用 ESLint 的 `import/no-restricted-paths` 把这些边变成 CI 硬失败。否则下一个人会理所当然地加上第 15 条。

### 3.2 领域模型现状

- **Thread —— 健康。** 全库只有 `entities/thread/types.ts:13-25` 一处定义，基于 openapi 生成类型做 Omit + 扩展，其余全部 import。这是本项目做得最好的部分之一。瑕疵：`id?`、`is_following?` 两个"兼容旧版"字段全库无读取点；`tags` 被从 `string|TagDetail` 强改成 `string[]`，转换发生在 `searchApi.ts:80-90` 的手写映射里，类型层面无约束。
- **User —— 2 份不同形状。** `features/auth/api/authApi.ts:8-13` 手写的 `{id, username, avatar}`（avatar 是 Discord hash）与 `entities/thread/types.ts:8` 的 `AuthorDetail-Output`（`avatar_url` 完整 URL）描述同一个用户。后果是 `UserHeaderCard.tsx:12` 和 `AppSidebar.tsx:357` 各自手拼一遍 CDN URL，默认头像常量在 3 处硬编码。
- **Channel —— 3 份定义，其中 1 份是死的。** `entities/thread/types.ts:60-72` 的 `Channel`/`ChannelCategory`/`TagDetail` 全库零引用；实际在用的是 `shared/hooks/useChannels.ts` 的 `UnifiedChannel`；`shared/config/channelCategories.private.ts` 还有第三份。且 `useChannels.ts:5-15` 手写的 `ApiChannel` 已与 openapi 的 `ChannelDetail-Output` 漂移（`channel_id` 实际可为 null，被当 Map key 用）。
- **Booklist / Tournament —— 健康**，全部复用生成类型。

---

## 4. 搜索中枢：数据流失控

搜索是本站最核心的功能，也是数据流问题最集中的地方。文档 [`state_management.md`](docs/development/state_management.md) §3.3 明令"URL 是唯一数据源"，实际链路上有**四个 query 副本**和**两条反向边**。

**实际链路**（顶栏输入 → 渲染）：

```
URL(q) ─┬─> parseParams ──> params ──> useSearchResults ──> searchApi ──> 渲染
        │       ↑（读 localStorage 决定 tagLogic 缺省）
        │       ↑（migrateLegacySyntax + tokenize，一次 parse 内重复分词 6 次）
        ├─> sessionStorage 草稿 ──┐
        │                          │（反向写回 URL）
        ├─> useState searchInput ──┤
        └─> SearchTokenInput 内部 useState(tokens + inputValue)
```

**四个副本**：URL `q` / sessionStorage 草稿 / `useTopBarSearchController.ts:80` 的 `searchInput` / `SearchTokenInput.tsx:42-43` 的内部 state。任一环节不同步就出现"输入框显示 A、URL 是 B、结果是 C"。

**两条反向边（均违反唯一数据源）**：
1. [`useTopBarSearchController.ts:94-108`](src/features/search/hooks/useTopBarSearchController.ts:94)：`params.query` 为空时从 sessionStorage 草稿反写 `setParams`。而 `SearchPage/index.tsx:419` 的「清除所有筛选」不清草稿——**用户点了清除，URL 刚空就被写回旧值，看起来像没反应**。
2. [`useSearchParams.ts:106`](src/features/search/hooks/useSearchParams.ts:106)：`tagLogic` 缺省值取自 localStorage，导致**同一条分享链接在不同设备上解析出不同结果**，URL 不再可分享。

**缓存被主动打穿**：[`useSearchResults.ts:144-148`](src/features/search/hooks/useSearchResults.ts:144) 每次挂载都 `resetQueries(searchKeys.all)`，叠加两个 query 的 `staleTime: 0`，React Query 在全站最重的接口上退化为"每次进页面全量重拉"。注释显示这是为修"偏好开关切换 UI 不刷新"打的补丁，但 queryKey 里已经含 `applyPreferences`，补丁是多余的。

**无限滚动可能死循环**：[`useSearchResults.ts:126-139`](src/features/search/hooks/useSearchResults.ts:126) 靠累积 `exclude_thread_ids` 分页。若某页返回 0 条但 `total` 仍大于已加载数（后端过滤/权限差异很容易触发），`getNextPageParam` 返回与上次完全相同的数组 → `hasNextPage` 恒 true → IntersectionObserver 持续触发同一请求。同时 body 里的 ID 数组每页 +24，滚 10 页就是 240 个 ID。

**tokenizer 会损坏输入**：[`searchTokenizer.ts:267-274`](src/shared/lib/searchTokenizer.ts:267) 的 `migrateLegacySyntax` 在每次 parse 的热路径上运行。实测 `author:$weird$` → `$author:$weird$$`，该串无法再被解析，用户的作者筛选静默丢失；`看看 tag:AI 的东西` 里的普通中文也会被当成语法。语法本身完全没有引号与转义机制（正则 `[^$]+`），标签名含 `$` 即不可搜。

---

## 5. 重复代码清单

这是"以结果为中心开发"最直接的产物。以下每一项都已定位到具体行号。

| 重复内容 | 位置 | 规模 |
| --- | --- | --- |
| `ThreadCard` 与 `ThreadListItem` 的渲染逻辑 | 两文件 781 行中约 40% 同构（派生值计算、标签渲染、统计三件套、推荐语块、快速加入书单按钮、动画延迟公式） | ~300 行 |
| 无限滚动 IntersectionObserver | `SearchPage:188`、`BooklistDetailPage:153`、`TournamentDetailPage:127`、`TournamentManagePage:99`（rootMargin 还不一致：360px vs 200px） | 4 份 |
| 列表/网格切换按钮组 | `SearchPage:369`、`BooklistsPage:211`、`BooklistDetailPage:438`、`TournamentDetailPage:322`、`TournamentManagePage:186`、`MyTournamentsPage:43` | 6 份 |
| `BooklistItem → Thread` 映射 | `BooklistDetailPage:57`、`TournamentDetailPage:40`、`TournamentManagePage:37` | 3 份 |
| `handleCopyShareText`（连 toast 文案都一样） | `UserProfilePage:282`、`BooklistDetailPage:246`、`TournamentDetailPage:188` | 3 份 |
| 详情页"无效ID/加载中/失败"三段早退 | `BooklistDetailPage:178`、`TournamentDetailPage:152`、`TournamentManagePage:124` | 3 份 |
| Banner 轮播整套逻辑（项目已有 `BannerCarousel` 组件） | `TournamentsPage:41,56-97`、`TournamentDetailPage:93-126` | 2 份 |
| "眨眼苏醒"动画序列（连 600/300/500/400ms 时序都一样） | `AboutPage:67-92`、`LoginPage:33-49` | 2 份 |
| `useInfiniteQuery` 整段（offset 计算、limit 24、enabled 正则） | `useTournamentsData.ts:31`、`useBooklistsData.ts:144` | 2 份 |
| URL 参数 hook | `useTournamentURLParams.ts` 与 `useBooklistURLParams.ts` 逐行对应 | 2 份 |
| 两个 Recommendations 组件 | `AuthorRecommendations.tsx` 与 `SimilarRecommendations.tsx` 92% 相同 | 2 份 |
| 两套彩蛋系统 | `mascot/EasterEggLayer` 与 `easter-eggs/GlobalEasterEggLayer` 同时挂载，两个 store、两套同构落雨动画 | 2 套 |
| 两套 Markdown 解析器 | `MarkdownText`（正则→HTML 字符串）与 `DiscordMarkdownText`（正则→React 节点），规则集不同 | 2 套 |
| `settings.css` 的 `.od-choice-*` 规则 | 39-79 / 82-200 / 203-231 / 274-314 四处镜像 | ~200 行 |
| `markdown.css` 的 `.discord-*` 规则 | 71-149 与 175-257 两份等价定义 | ~85 行 |
| `useTheme` 的主题名双向映射 | `useTheme.ts:14-45` 与 `:48-73` 两个手写 switch | 2 份 |

### 5.1 重复已经造成真实 Bug

`ThreadCard` 与 `ThreadListItem` 的重复不是理论风险，已经产生行为漂移：

1. **图片开关在网格视图失效**：`ThreadListItem.tsx:66-70` 读 `useImageModeSetting()` 并在 `off` 时不渲染缩略图，`ThreadCard.tsx:253` **完全没读这个设置**。用户在设置里关掉图片，切到网格视图照常加载。
2. **同一段摘要两种渲染**：`ThreadCard.tsx:303` 用 `DiscordMarkdownText`，`ThreadListItem.tsx:250` 用 `MarkdownText`。而这两个渲染器的外链安全策略不同——`DiscordMarkdownText.tsx:50-58` **完全绕过** `getUrlSafetyInfo` 外链警告。同一个帖子，在卡片上能一键跳外站，在预览浮层上却会弹安全警告。

---

## 6. 死代码清单

均已 grep 确认零引用，可安全删除。

**死模块**
- [`src/features/followers/`](src/features/followers) —— **5 个空目录，0 个文件**。与已实现的 `follows` 职责重叠，实为从未动工的模块。
- [`src/features/search/store/searchStore.ts`](src/features/search/store/searchStore.ts) —— 只被自身命中。**但 `docs/development/state_management.md:41-89` 仍把它当作 Zustand 范例写在文档里**，新人会照抄一个没人用的 store。
- [`src/shared/lib/icons.ts`](src/shared/lib/icons.ts) —— 62 个 lucide re-export，零消费方。一旦被引用会直接破坏 tree-shaking。

**死组件**（共约 700 行）
`widgets/layout/UserCard.tsx`(54)、`widgets/layout/FilterBar.tsx`(109)、`widgets/layout/StatsBar.tsx`(87)、`features/mascot/components/MascotDialog.tsx`(143)、`features/search/components/SearchHistory.tsx`(117)、`shared/ui/ScrollProgress.tsx`、`shared/ui/RippleButton.tsx`、`shared/ui/animation/MotionWrapper.tsx`

**死函数 / 死导出**
`shared/hooks/useKeyboardShortcuts.ts`（整套快捷键系统）、`shared/lib/discord.ts` 的 5 个导出、`shared/lib/settings.ts` 的 `updateUserSettings`/`cardSizeMap`、`shared/lib/notify.ts` 的 `notifyInfo`、`shared/config/navigation.ts:39`、`follows/lib/queryKeys.ts:7`、`follows/hooks/useFollowsData.ts:43` 的 `useMarkAllFollowsViewed`（NotificationCenter 反而在旁边手写了一遍）、`plaza/lib/queryKeys.ts:10`、`preferencesMapper.ts:100-126`、`ThemeProvider.tsx:16` 的 `previousThemeRef`

**死状态 / 死分支**
`DrawPage/index.tsx:174,177` 的 `_drawResults`/`_revealedCount`（只有 setter 被调用）、`DrawPage:217-222` 的空 effect、`SearchTokenInput.tsx:77-88` 的空 effect（里面只有 6 行"我们需要吗？""简化方案："的思考过程注释，且前提条件实测不成立）、`AboutPage:159-163` 只有注释的空 if 分支

**死样式**（约 400 行）
`discovery.css` 的 `od-inline-notice`/`od-metric-*`/`od-spotlight-*` 三组（~180 行）、`utilities.utilities.css:67-81` 的 `od-theme-transition`（选择器 `&html` 写错，永远匹配不到）、`tokens.css` 的 6 个死 token 及其 `@theme` 映射、`themes.ts` 的 `glassBlur` 字段（10 个主题各一份，从未被消费）

**死配置**
`pnpm.overrides` 的 `ahooks>react`（ahooks 本身未使用）、`shared/types/env.d.ts` 缺声明的 3 个变量（`VITE_SHOW_DEVTOOLS`、`VITE_API_MOCKING`、`VITE_USE_MOCK` 靠索引签名兜底，拼错不报错）

---

## 7. 样式体系

`!important` 全局只有 1 处（`surfaces.css:25`）——说明还没陷入特异性军备竞赛，**现在是清理的最佳时机**。但有三个结构性隐患：

1. **`color-mix(in_oklab, ...)` 是无效 CSS，已进生产。** [`base.css:17,153,171`](src/shared/styles/base.css:17) 三处。`in_oklab` 带下划线是 Tailwind 任意值语法，写在普通 CSS 里浏览器直接丢弃整条声明——滚动条 hover 效果三处全部失效。修法就是把下划线改成空格。
2. **Tailwind 图层顺序被打乱。** [`globals.css:1-13`](src/shared/styles/globals.css:1) 把 11 个项目 `@import` 排在 `@import 'tailwindcss'` **之前**，导致产物中 `components` 层跑到了 `utilities` 层后面——**优先级颠倒**。目前无人用 components 层所以没爆，但任何人写一条 `@layer components` 规则都会莫名其妙压过 utility class。而 `stylelint.config.js:38-42` 专门关掉了 `no-invalid-position-at-import-rule` 来掩盖这个警告。
3. **自定义 `@utility` 与 Tailwind 内置类重名。** [`utilities.utilities.css:1-29`](src/shared/styles/utilities.utilities.css:1) 定义了 `animate-in`/`fade-in`/`duration-300`/`duration-500`/`slide-in-from-*`，与 core 及已启用的 `tailwindcss-animate` 插件冲突。产物中两份定义并存：`duration-300` 在 14 个文件里被当 transition 时长用，现在会顺带塞一个 `animation-duration: .3s` 污染同时带动画的元素。

**主题一致性**：`themes.ts` 的 551 行是 10 主题 × 30 token 的数据表，密度合理，**不是问题**。真正的问题在硬编码：`markdown.css:114,121,130,142,146` 写死了 Discord Dark 配色（`#4e5058`/`#2d2d30`/`#3a3a3d`），在 `discordLight` 和 `sakuraDay` 两个浅色主题下引用块、行内代码、剧透块会变成深灰完全穿帮；`discovery.css` 有 20+ 处硬编码色（金色系 `#ffd279`/`#f1b85f`/`#f9d48d` 三个近似值散落 6 处）；`SearchTokenInput.tsx:226-244` 的 chip 用 `text-sky-300` 这类深色主题专用色，浅色主题下对比度严重不足。

**首屏闪烁**：`tokens.css` 初始值硬编码为 Discord Dark，真实主题要等 React 挂载后才写入，`index.html` 无 pre-hydration 脚本——浅色主题用户每次刷新都会先看到一帧深色页面。

---

## 8. 其他重点问题

**性能**
- [`NotificationCenter.tsx:98,259`](src/features/notifications/components/NotificationCenter.tsx:98)：`if (!open) return null` 写在两个 useQuery **之后**，而该组件由 TopBar 常驻挂载。结果是**全站每 30 秒无条件打 2 个接口，未登录用户也一样**。且它的 `queryKey: ['follows']` 与 `followsKeys.all` 撞车（后者本意是失效前缀），MePage 打开时同一份数据 30 秒内被拉 3 次。
- [`ThreadCard.tsx:42`](src/entities/thread/ThreadCard.tsx:42)：模块级 `thumbnailAspectRatioCache` 以图片 URL 为 key，**无上限无清理**，无限滚动几千帖后是持续增长的 Map。
- `memo` 被调用点破坏：`ThreadCard`/`ThreadListItem` 都做了 memo，但 `SearchPage:503` 传的 `onAuthorClick` 是内联箭头函数，透传到每张卡片，memo 对整列表完全失效。search feature 全域零 `memo`。
- `SearchSuggestions.tsx:399` 每渲染一项都 `findIndex` 一次，N 项即 N² 次比较；`:82-86` 的 `randomTags` 在 useMemo 里调 `Math.random()` 且用了有偏洗牌，面板每次打开顺序都跳。
- `OnboardingManager.tsx:65-69` 以 200ms 间隔**无限轮询** DOM，只要用户没做过该教程就永远跑。

**内存泄漏 / 清理缺失**
`ThreadPreviewOverlay.tsx:97` 的 `setTimeout` 无 clearTimeout（300ms 内切帖会关掉新预览）、`ProtectedRoute.tsx:25` 的 800ms 魔法定时器无 cleanup、`RootLayout.tsx:169-208` 的 MutationObserver 只在 blur 时 disconnect（随路由卸载则泄漏）、`AboutPage:99-109` 动态注入 script 到 body 且卸载不清理。

**安全**
- `auth_token` 明文存在 localStorage（`authSession.ts:12`）。项目主路径本是 `withCredentials: true` 的 cookie 会话，localStorage 只是跨域降级方案，却做成了永久明文存储。叠加 `MarkdownText.tsx:149` 的 `dangerouslySetInnerHTML`（渲染用户生成的帖子正文），XSS 一行就能取走完整凭证。
- **环境变量是干净的**：`.env*` 里只有 5 个 `VITE_` 变量，无任何 SECRET/TOKEN/PASSWORD 命名项。`VITE_GUILD_ID`/`VITE_CLIENT_ID` 是公开的 Discord snowflake（Client ID 非 Client Secret），`!.env.production` 的白名单是有意且安全的。唯一瑕疵是 `.env.example` 直接抄了生产值，应换成占位符。
- `.env.development` 被 git 追踪（0 字节空文件）——它在 `.gitignore` 规则生效**之前**入库，git 对已追踪文件不再应用 ignore。这是"忽略规则看起来生效实则没有"的陷阱，下次有人往里写本地配置会毫无提示地被提交。

**可访问性**
`shared/ui/Select` 被 8 个页面使用，却没有 `role="listbox"`、`aria-expanded`，且**完全无法键盘操作**；`Tooltip` 只绑 mouse 事件，键盘和触屏用户永远看不到；`ThreadCard.tsx:127-146` 把 `<article>` 设成 `role="button"` 同时给内容区 `aria-hidden="true"`，卡片内的标签按钮、书单按钮对屏幕阅读器完全不可达。

**规范一致性**（无 prettier 配置，格式无强制）
缩进 2 空格 vs 4 空格混用（banner/threads/mascot 用 4 空格）；引号单双混用（booklists/tournaments 用双引号，auth/follows/mascot 用单引号）；`auth/hooks/useAuth.ts:2`、`mascot/store/mascotStore.ts:2-9` 用相对路径 import，违反 `structure.md:71` 的"绝对禁令"；14 个 feature 无一使用 index.ts 桶文件（虽不符 FSD 但内部一致，优先级低）。

**唯一一处 `forwardRef`**：`shared/ui/icons/DiscordIcon.tsx:1`，违反 `core_architecture.md:25` 的明令禁止，且那个 ref 无人使用。

---

## 9. 测试与文档

### 9.1 测试：质量好，广度差

**必须澄清一点**：现有测试**不是**事后凑数。134 个 `expect` 中只有 7 个是 `toBeTruthy` 这类弱断言，`SearchPage.test.tsx` 断言的是 `setParams` 被调用的具体参数对象，`ThreadAchievementTag.test.ts` 用 `it.each` 覆盖了 99/100/999/1000/9999/10000 六个边界。**债务在覆盖广度，不在测试质量。**

- 零测试的 feature（14/18）：`auth`、`banner`、`discovery`、`draw`、`easter-eggs`、`followers`、`follows`、`mascot`、`notifications`、`onboarding`、`plaza`、`tags`、`threads`、`tournaments`。其中 `tournaments`（5 个页面、含管理端写操作）和 `auth`（鉴权链路）是最该补的。
- 测试在真的发网络请求：日志里大量 `AxiosError: Network Error`，测试依赖"请求必然失败 → 走静态兜底"这条路径才通过。文档承诺的 MSW **根本没装**（`grep -c msw package.json` = 0）。
- `setup.ts` 只 stub 了 `IntersectionObserver`，缺 `ResizeObserver`/`matchMedia`/`scrollTo`——现在没炸只是因为组件基本没被测到，一补组件测试就会连环报错。
- coverage 配了 provider 却没有 `include`，未被 import 的源文件不计入分母，**覆盖率数字虚高**。
- `searchTokenizer` 单测缺 6 个关键边界：空串、未闭合 token、值含 `$`（实测会损坏）、重复 token、`from > to`、往返一致性。

### 9.2 文档漂移

| 文档陈述 | 实际情况 |
| --- | --- |
| `pages_overview.md:32` / `structure.md:19` 的 **`FollowsPage`（关注中心）** | **不存在**。功能已并入 `/me?tab=follows`（证据：`AppSidebar.tsx:52`）。`previewStore.ts:5`、`followsApi.ts:69` 的注释还在传播这个幻影 |
| `pages_overview.md` 的页面清单 | **漏了整个赛事域 4 个页面 + DrawPage**（1362+773 行）。`docs/` 全目录 grep `tournament` = **0 命中** |
| `structure.md` 的 feature 列表 | 漏了 `easter-eggs`、`followers`、`tournaments`、`draw` |
| `state_management.md:41-89` 把 `searchStore` 当 Zustand 范例 | 该 store 是死代码，无人使用 |
| `state_management.md:93` "URL 作为唯一数据源" | 实际有 sessionStorage 和 localStorage 两条反向边 |
| `vitest_ci_process.md` 第 4 节的 4 条 PR 门禁 | `.github/` 不存在，全部是想象中的流程 |
| `vitest_ci_process.md:50` "可配置 MSW 劫持请求" | msw 未安装 |
| README "虚拟长列表" | `@tanstack/react-virtual` 装了但 0 处使用 |

文档时间戳集中在 2026-05-08，`pages_overview.md` 更早（2026-04-24）。`pages_overview.md` 是最旧也最失准的，建议优先重写。

### 9.3 仓库卫生

被 git 追踪但应清理的文件：

| 文件 | 大小 | 说明 |
| --- | --- | --- |
| `lint_output.txt` | 72K | 版本 2.2.0 时代的命令输出快照 |
| `tsc_output.txt` | 11K | 里面记录的类型错误**现已全部修复**——它在误导新人以为项目一团糟 |
| `tsconfig.tsbuildinfo` | 283K | 编译缓存，`.gitignore` **遗漏** |
| `openapi.json.bak` | 72K | 旧备份，版本历史就是备份 |
| `openapi_pretty.json` | 152K | 与 `openapi.json` 内容**已不一致**，即已过期 |
| `test_payload.json` | — | 手工调 API 的请求体样本，初始提交后没动过 |
| `fix_channels.ts` | 262B | 一次性脚本，读的是早已不存在的本地 AI 会话文件 |
| `setup-server.sh` | — | 已失效：它写入的 `VITE_USE_MOCK_AUTH`/`VITE_SHOW_DEVTOOLS` 在 `.env.example` 里根本不存在，实际变量名是 `VITE_USE_MOCK` |
| `.env.development` | 0B | 空文件，且绕过了 ignore 规则 |

`.gitignore` 需补：`*.tsbuildinfo`、`*_output.txt`、`coverage/`。
`dist/`(28M)、`.kilo/`(57M)、`reference/`(64K) 已被正确忽略，无需处理。
`scripts/export_openapi.py` 有效但硬编码依赖 `../Odysseia-Forum` 后端仓库与前端平级，建议在脚本头注明。

---

## 10. 整改路线图

按 **投入产出比** 排序。前三阶段建议依次完成，第四阶段可长期渐进。

### 第一阶段：重建护栏（约 1 天，零风险）

因为当前 `tsc` 和 `eslint` 都是干净的，这一步几乎没有修复成本，纯粹是把门关上。

1. 恢复 `package.json` 的 `--max-warnings 0`；`"build": "tsc -b && vite build"`
2. `eslint.config.js` 把 `exhaustive-deps` / `set-state-in-effect` / `no-unused-vars` 恢复为 `warn`（先 warn 不 error，避免 86 条一次性阻断），`no-explicit-any` 恢复为 `warn`
3. 加 `import/no-restricted-paths` 规则，把 3.1 节的 shared→上层、entities→上层锁成硬失败（先只锁这两类，横向依赖后续再治）
4. 装 `postcss-html` 让 `lint:styles` 能跑
5. 建 `.github/workflows/ci.yml` 落实 lint + tsc + test + build 四条门禁
6. 加 `"test:run": "vitest run --reporter=dot"`（`--reporter=basic` 在 Vitest 4 已移除）

### 第二阶段：交付层（约 1 天，收益最大）

7. `router.tsx` 全部页面改 `lazy()` + `RootLayout` 包 `Suspense`
8. `vite.config.ts` 加 `manualChunks` 拆 react / @tanstack / motion / lucide vendor chunk
9. `TestPage` 整段路由包进 `import.meta.env.DEV`
10. `ThemeProvider.tsx:228-312` 的调试函数加 DEV 守卫
11. 卸载 8 个未使用依赖（**先确认 `remark-gfm` 是不是漏接的 bug**）

预计首屏体积可降到目前的 1/3 以下。

### 第三阶段：修真 Bug（约 2–3 天）

按严重度：

12. [`client.ts:21`](src/shared/api/client.ts:21) 大整数正则改成 `JSON.parse(data, reviver)` + 字段白名单，catch 分支加日志 —— **最高优先级**
13. `useSearchResults.ts:144` 删掉 `resetQueries`，给 results 设 `staleTime: 60s`
14. `useTopBarSearchController.ts:94-108` 断掉 sessionStorage → URL 的反向边
15. `useSearchParams.ts:106` `tagLogic` 缺省固定为 `'and'`，不读 localStorage
16. `useSearchResults.ts:126` 给 `getNextPageParam` 加终止条件（防死循环）
17. `NotificationCenter` 加 `enabled: isAuthenticated`，改用 `useFollowsFeed()`
18. `DrawRevealOverlay` 补 error 分支（或删掉那 5 个未使用 props）
19. `ThreadCard` 补上 `useImageModeSetting`（图片开关 bug）
20. `base.css` 的 `in_oklab` → `in oklab`
21. `globals.css` 把 `@import 'tailwindcss'` 移到第 1 行
22. 自定义 `@utility` 加 `od-` 前缀，解除与 Tailwind 内置类的重名

### 第四阶段：结构去重（长期渐进）

23. 删死代码：`features/followers/`、`searchStore.ts`、`shared/lib/icons.ts`、5 个死组件、~400 行死样式、根目录 9 个遗留文件
24. 抽 4 个共享件消掉 6 类重复：`useInfiniteScrollTrigger`、`LayoutModeToggle`、`fromBooklistItem`、`QueryStateBoundary`
25. 拆 `ThreadCard`/`ThreadListItem`：抽 `useThreadCardModel` + 4 个共享子组件
26. 解 `booklists ⇄ tournaments` 环：tournaments 复用 `booklistKeys`，删掉转发层
27. 给 `features/{plaza,discovery,tags,authors}` 补 hooks 层，页面里的裸 useQuery 全部迁走
28. 拆 `ThemeProvider` 那个 300 行的 effect
29. 补 `auth` 与 `tournaments` 的 API 层测试；`setup.ts` 补 3 个 stub
30. 更新文档：删 FollowsPage 幻影、补赛事域、修 searchStore 范例、修 CI 章节

---

## 附：整改状态（2026-07-26，分支 `chore/code-review-fixes`）

四阶段路线图 30 条全部落地，共 17 个 checkpoint commit。两处与原建议不同的决定：

- **第 22 条（`@utility` 加 `od-` 前缀）：复核后不改。** 实测两条同名定义并存时是 transition-duration 与 animation-duration 各自生效，实际危害低；而改名波及 51 处调用点，且会让 19 处入场动画的 `duration-500` 语义从 0.5s 退化为 Tailwind 内置的 0.3s，风险大于收益。保留现状，后续升级 Tailwind 时再评估。
- **第 29 条（补 tournaments API 测试）：对象已消失。** 解环时（第 26 条）`tournamentsApi` 纯转发层被整个删除，tournaments hooks 直接复用 `booklistsApi`，无独立 API 层可测。

另有两项范围说明：第 27 条 discovery 域的 rails 查询原挂在 `plazaKeys` 下，本次归位为 `discoveryKeys` 并建 hooks；MePage / TestPage 的少量裸 useQuery 属 me / 调试域，不在四域范围内，未动。

---

## 附：审查方法与可信度

- 所有"未使用"结论均有 grep 证据，已二次核实：`three`/`ahooks`/`date-fns`/`embla-carousel-react`/`remark-gfm`/`class-variance-authority`/`react-virtual` 在 `src/` 下均为 **0 命中**；`src/features/followers/` 确认 **0 个文件**；`React.lazy`/`Suspense` 确认 **0 处**。
- 产物体积、lint/tsc/vitest 结果均为本机实测，非估算。
- 恢复 lint 规则的测量使用了临时配置文件，测量完毕后已删除，**仓库未被修改**。
- 少数标注为"实测"的 tokenizer 行为（如 `migrateLegacySyntax` 损坏输入）由调研代理实际执行函数得出。
