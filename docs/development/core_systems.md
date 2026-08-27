# 核心系统设计

本文只记录当前前端代码中已经存在的边界和入口。

## 路由与认证

路由集中定义在 `src/app/router.tsx`，使用 `react-router-dom` v6 的
`createBrowserRouter`。页面通过 `lazy` 动态导入，并由局部 `Suspense` 使用
`OmicronLoader` 作为 fallback。已登录应用的主树为：

`ProtectedRoute` → `RequiredSetupGate` → `RootLayout` → 页面路由。

`ProtectedRoute` 通过 `useAuth` 查询 `/auth/checkauth`；未认证时把当前安全的站内路径写入
`sessionStorage`，再跳转到登录页。真正的 OAuth 跳转由 `LoginPage` 发起，开发环境使用
`/auth/login-dev`，其他环境使用 `/auth/login`。不要把路由守卫描述成自动完成 OAuth。

`src/app/App.tsx` 在 `QueryClientProvider` 和 `ThemeProvider` 外层挂载全局
`ErrorBoundary`。它提供重试/返回首页的兜底 UI；局部边界是否需要额外添加，取决于组件的失败隔离需求。

## 主题、设置与表面

用户设置由 `src/shared/store/settingsStore.ts` 管理，并持久化到
`localStorage` 的 `odysseia_user_settings`。`useTheme` 根据设置中的主题值计算实际主题；设置为
`auto` 时读取 `prefers-color-scheme`（深色使用 `claudeDark`，浅色使用 `discordLight`）。

`ThemeProvider` 调用 `src/app/themes/applyThemeTokens.ts` 将主题颜色、字体、透明表面和玻璃模糊
写入 HTML 根节点的 `--od-*` 变量与 `data-od-*` 属性。背景图实际由 `WallpaperBackdrop` 渲染。
主题切换和部分氛围设置复用 `src/shared/lib/viewTransition.ts` 的 `withViewTransition`。

## 搜索：URL 是查询状态源

`src/features/search/hooks/useSearchParams.ts` 的 `useSearchURLParams` 解析和序列化搜索 URL。
主要参数包括 `q`、`channel`、`type`（`thread` / `booklist` / `tournament`）、`sort`、
`order`、`page` 和 `tag_logic`；标签、作者、频道、日期、点赞下限和评论下限也可以通过
`$tag:...$`、`$author:...$`、`$channel:...$`、`$date:...$`、`$likes:...$`、`$replies:...$`
token 表达，负号表示排除。旧的 `author:...`、`tag:...` 等写法由 tokenizer 迁移。

筛选面板通过受控 props 和回调更新 URL，不维护另一份查询条件。`localStorage` 中的
`odysseia_search_tag_logic` 只在 URL 尚未写入 `tag_logic` 时作为新搜索的初值；解析已有链接时
仍以 URL 为准。

`useSearchResults` 使用 React Query 的 `useInfiniteQuery`。每页请求固定 `offset: 0`，后续页将已
加载的 thread ID 以字符串 `exclude_thread_ids` 传给 API，以避免插入新帖造成重复；结果默认
`staleTime` 为 60 秒，并支持设置页选择连续滚动或分页及预加载。偏好过滤通过请求的
`apply_preferences` 控制，`ignoreDiscoveryPreferences` 只影响当前搜索。

自动补全由 `useSearchAutocomplete` 查询 `/search/suggestions`，返回作者、帖子和书单；标签补全
来自频道元数据目录，不是该接口返回的独立标签列表。

## 首次配置与页面引导

`RequiredSetupGate` 查询用户偏好是否为首次配置；首次用户且本机 onboarding 状态没有完成
`initial_setup` 时跳转 `/setup`。设置页会保存频道、排除标签、打开方式、分页和预加载选项；
失败时停留在配置页并显示重试入口。

`OnboardingManager` 挂载在 `RootLayout`，使用 Zustand 的
`src/features/onboarding/store/useOnboardingStore.ts` 保存已完成教程 ID 到
`localStorage`。页面教程由路由触发，高级搜索教程在筛选面板出现后通过 `data-tour` 选择器触发。
目标列表和步骤以 `src/features/onboarding/lib/tutorials.ts` 为准。
