# 页面概览

路由定义以 `src/app/router.tsx` 为准。除 `/login`、`/about` 和 `/auth/callback` 外，业务页面位于认证守卫下；根路由中的业务内容还会经过 `RequiredSetupGate`。页面组件按需 `lazy` 加载，并由路由层统一使用 `Suspense` 和 `OmicronLoader`。

## 路由与页面

| 路径 | 页面 | 当前职责 |
| --- | --- | --- |
| `/login` | `LoginPage` | 正式登录入口 |
| `/test/login` | `LoginPage` | 仅开发环境注册的登录预览入口 |
| `/about` | `AboutPage` | 项目介绍、仓库链接和贡献者信息 |
| `/auth/callback` | `CallbackPage` | OAuth 回调处理 |
| `/setup` | `RequiredSetupPage` | 认证后但必要设置未完成时的设置/引导页 |
| `/` | `PlazaPage` | 发现广场：Banner、发现轨道、每日内容和书单/赛事入口 |
| `/search` | `SearchPage` | 帖子、书单和赛事搜索；帖子结果支持 URL 条件、分页/无限滚动和偏好过滤 |
| `/ai-search` | `AISearchPage` | 浏览器端 AI 搜索 Agent、外部模型设置、本地会话和帖子引用/抽卡结果 |
| `/draw` | `DrawPage` | 按全社区、用户偏好或自选频道配方随机抽取帖子，并展示揭晓动画 |
| `/tags` | `TagsPage` | 标签与频道导航，并把选择转换为普通搜索条件 |
| `/booklists` | `BooklistsPage` | 公开书单浏览、筛选和创建入口 |
| `/booklists/:id` | `BooklistDetailPage` | 书单详情、条目分页、收藏及所有者管理操作 |
| `/tournaments` | `TournamentsPage` | 公开赛事列表 |
| `/tournaments/mine` | `MyTournamentsPage` | 当前用户创建的赛事 |
| `/tournaments/:booklistId` | `TournamentDetailPage` | 赛事详情、参赛条目和赛事相关操作 |
| `/tournaments/manage/:booklistId` | `TournamentManagePage` | 赛事所有者的编辑、条目维护和发布管理 |
| `/me` | `MePage` | 当前用户的书单、关注、浏览足迹和服务端偏好；Tab 通过 `?tab=` 等参数切换 |
| `/u/:userId` | `UserProfilePage` | 公开用户资料与作品列表 |
| `/threads/:threadId` | `ThreadDetailPage` | 单个帖子详情 |
| `/test` | `TestPage` | 开发或 mock 模式的接口/状态测试页 |
| `*` | `NotFoundPage` | 根布局内未匹配路径的兜底页面 |

`/test` 的注册条件是 `import.meta.env.DEV || VITE_API_MOCKING === "true"`；`/test/login` 只检查 `import.meta.env.DEV`。`/me` 的关注、历史和偏好是同一页面的子视图，不是独立路由。

## 加载与共享层

`router.tsx` 用 `lazyPage()` 将页面的命名导出转换为 `React.lazy`，每个页面节点由 `withSuspense()` 包裹。登录后的页面由 `RootLayout` 提供顶栏、侧栏、主滚动区、移动端导航及全局预览/图片/吉祥物等辅助层。
