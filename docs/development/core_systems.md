# ⚙️ 核心系统设计 (Core Systems)

此文档总结了除数据流机制外，支撑起整个前端运转的几大核心系统的设计模式。

## 1. 路由系统 (Routing)

项目采用基于 `react-router-dom` v6 搭建的路由体系。在 `src/app/` 或 `src/pages/` 的顶层定义有整个路由大树。

### 1.1 嵌套路由与 Layout

我们使用了嵌套路由的概念：

```tsx
<Route path="/" element={<RootLayout />}>
  <Route index element={<HomePage />} />
  <Route path="/search" element={<SearchPage />} />
</Route>
```

所有的普通页面被嵌入到了 `RootLayout`（主布局）中。

- `RootLayout` 负责渲染全局的 Sidebar，搜索顶栏、背景图容器等。
- `<Outlet />` 是各个具体 `Page` 组件挂载的渲染热区。
  利用这个模式避免了页面跳转带来的整个外框的反复卸载与重绘。

### 1.2 路由懒加载 (Code Splitting)

为了加快首屏（FCP/LCP）加载速度，大型页面通过 `React.lazy()` 进行异步代码分割：

```tsx
const ProfilePage = lazy(() => import("@/pages/UserProfilePage"));
```

路由层用 `<Suspense fallback={<Loader />}>` 进行包裹。如果你新加了一个特别庞大的独立页面组件，**强制使用懒加载形式注册路由**。

## 2. 身份验证守卫 (Auth Guard)

我们的权限验证不是仅仅靠后端返回 401 报错才拦截。
在路由体系中具备 `ProtectedRoute` 高阶组件（或 Wrapper）。

- 检测不到有效认证状态时，拦截去往敏感路由（如 `/me`）的访问，展示提示或者自动触发到 Discord OAuth2 的登录流程。

## 3. 错误捕获 (Error Boundaries)

应用需要使用 Error Boundary（错误边界）接管白屏崩溃。
无论是路由层面，还是某个渲染复杂的 Widget，外部可以嵌套容错机制组件，确保组件因为不可控数据结构崩溃时，不至于导致整个浏览器白屏，而是局部显示兜底 UI。

## 4. 主题与持久化 (Theme Persistence)

黑/白模式切换由 `ThemeToggle` 控制。此状态属于全局客户端偏好：

- 优先读取 `localStorage` 中记录的用户偏好（如 `theme: dark`）。
- 否则读取浏览器系统的时区或 `prefers-color-scheme`。
  我们将 class `dark` 动态注入至 `HTML` 根节点上控制整个 Tailwind 变量生效。在切换主题或背景时，推荐使用 `src/shared/lib/viewTransition.ts` 提供的通用方法触发平滑的原生过渡动画。

## 5. 搜索系统与 URL 状态驱动

搜索系统目前完全依靠 **URL Search Params** 进行状态同步，以保障用户可以自由分享其搜索或过滤状态，并避免状态管理的冗余与数据不一致。

### 5.1 分词器驱动 (searchTokenizer)

搜索词输入支持高级语法的精确匹配与条件剥离，前端使用 `src/shared/lib/searchTokenizer.ts` 作为统一解释器：

- **可用语法**: `$tag:xxx$`, `-$tag:xxx$`, `$author:xxx$`, `-$author:xxx$`, `$channel:xxx$`。
- **协议转换**: 当用户在 `TopBar` 键入字符或在 `SearchFilterPanel` 操作标签、作者（如 `onToggleTagToken`、`onSubmitAuthorDraft`）时，工具函数（如 `addToken`, `removeToken`）会操作字符串以维持唯一的 Source of Truth。随后 `tokenizeSearchPayload` 会将长字符串打散为内部的 `TokenizedSearchPayload` 数据结构（包含 `includeTags`, `excludeTags`, `includeAuthors`, `excludeAuthors`, `channels` 等）。
- **向后端序列化**: 当发往后端时，如 `$author:xxx$` 这样的 Token 除了被映射至数组结构（如果支持），也会由 `searchApi.ts` 中的 `buildKeywordString` 封装成原生的 `author:"xxx"` 字符串格式并追加进 API 的 `keywords` 字段内。
- **向后兼容**: 为了兼容旧版未带 `$` 符号的语法，分词器中引入了 `migrateLegacySyntax` 函数，在处理 URL 查询参数时，它会自动把类似 `author:xxx` 的格式标准化为 `$author:xxx$`。

### 5.2 参数层 (`useSearchURLParams`)

`src/features/search/hooks/useSearchParams.ts` 中的 `useSearchURLParams` 钩子解析并暴露经过封装合并后的过滤状态（例如新增的 `type` 参数，用于区分 `thread` 或 `booklist` 的检索目标），组件使用该钩子修改参数会自动触发 React Router 的导航方法，进而引发整个订阅此 Hooks 的查询模块重刷。

### 5.3 偏好融合层 (`useSearchResults`)

在获取最终数据前，`src/features/search/hooks/useSearchResults.ts` 会结合当前查询参数状态向后端发起带有偏好标记的搜索请求：

- **偏好标志 (`apply_preferences`)**: 前端向后端发起搜索时默认带上 `apply_preferences: true` 标记，此时后端会自动合并当前用户的黑名单标签、白名单标签等偏好设置进行过滤。前端已移除原有的繁杂的本地 tag 合并与 `filterThreadsByPreferences` 兜底过滤逻辑，完全将数据控制权交由 API 返回，确保请求高度一致性。
- **展示与忽略控制 (`ignoreDiscoveryPreferences`)**: 提供状态变量供 UI（如横幅提示）触发暂时忽略偏好的动作，以使用纯净参数重查数据。
- **无缝滚动分页拉黑**: 在加载下一页数据时，前端的 `getNextPageParam` 会强制收集当前已获取的 `exclude_thread_ids` 列表发送给后端（数组元素可能为 Number 或 String），并且强制覆盖 `offset=0` 以适配后端游标逻辑。这种结合总余量（`total > 0`）判定下一页的实现彻底解决了传统的因为分页期间插入新帖导致的跳页或重复加载 Bug。

### 5.4 智能建议与补全 (Autocomplete)

前端抛弃了原有的前端伪随机或单独查标签的建议逻辑，现在通过 `useSearchAutocomplete` 钩子结合后端专用的 `/search/suggestions` 接口来提供全局统一的自动补全功能。

- 一次请求能够分类拉取到相关的 **作者 (authors)**、**帖子 (threads)** 和 **书单 (booklists)**，并交由 `SearchSuggestions` 智能分类渲染。
- 这些建议会基于用户的当前偏好 (`apply_preferences`) 进行筛选，并在输入框焦点激活时实时呈现给用户。

## 6. 首次配置与页面引导

首次账号配置和页面功能教学是两条独立流程，不能再混用同一套步骤：

- Required Setup：登录回调后、进入主布局前完成频道范围、排除 Tag 和 Discord 跳转方式配置，不可跳过。
- Page Tour：进入主页面后介绍导航和页面功能，可以跳过，也可以结束当前引导。

Required Setup 只拦截真正的新用户。判定条件是偏好记录不存在，且本机旧版 onboarding 的 `completedTutorialIds` 不包含 `initial_setup`。后者是存量用户迁移兼容：已经完成旧引导的用户不能因为缺少新版偏好记录而被强制重新配置。

### 6.1 OnboardingManager 与状态控制

页面教学由 `OnboardingManager` 充当驱动中心，挂载于 `RootLayout`。
它监听路由变动与 DOM 树的可用情况。当用户达到特定场景并且之前尚未完成对应教程时，通过 Zustand Store (`useOnboardingStore`) 自动分发 `activeTutorial` 并弹出气泡提示。
状态控制将自动把已完成的 `completedTutorialIds` 持久化记录至 `localStorage`。

### 6.2 基于 DOM 锚点的定向

引导气泡采用了高弹性的 CSS Selector 选择机制。
通过在 UI 节点绑定专用的 `data-tour="xxx"`（如 `data-tour="filter-panel"` 或 `data-tour="user-header"`），并在 `tutorials.ts` 中设定目标的 `target` 属性，气泡引擎会自动使用 `getBoundingClientRect` 追踪并计算绝对定位的动画平移，实现无需硬编码页面结构的“即插即用”式挂载。
