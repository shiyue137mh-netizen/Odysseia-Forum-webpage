# 前端核心架构

本文描述当前源码，而不是未来架构计划。项目是 React 单页应用，目录按 Feature-Sliced Design（FSD）组织，但现状仍有少量跨层存量引用，不能把 FSD 约束描述为已经完全封闭。

## 技术栈

| 领域 | 当前实现 | 依据 |
| --- | --- | --- |
| UI | React 19、React DOM 19 | `package.json`、`src/main.tsx` |
| 构建 | Vite 8、`@vitejs/plugin-react-swc`、`@tailwindcss/vite` | `package.json`、`vite.config.ts` |
| 路由 | `react-router-dom` 6.30.6，`createBrowserRouter` | `src/app/router.tsx` |
| 服务端状态 | TanStack React Query 5 | `src/app/App.tsx` 及各 feature hooks |
| 客户端状态 | Zustand 5 | settings、preview、mascot、onboarding、AI 会话等 store |
| 样式与动效 | Tailwind CSS 4、`motion` 12 | `src/shared/styles`、页面与组件导入 |
| 请求与校验 | Axios、Zod | `src/shared/api/client.ts`、AI 搜索工具与设置解析 |
| 类型生成 | `openapi-typescript` | `package.json` 的 `gen:api` 脚本、`src/shared/types/openapi.d.ts` |

## 应用装配与运行边界

`src/main.tsx` 以 `React.StrictMode` 挂载 `App`。`src/app/App.tsx` 负责错误边界、共享 `QueryClient`、主题、路由、全局 Toaster、图片修复队列、认证失效和开发环境 React Query Devtools。路由由 `src/app/router.tsx` 集中定义；根路由下依次经过认证守卫、必要设置守卫和 `RootLayout`。

`src/widgets/layout/RootLayout.tsx` 是登录后页面的应用壳：桌面侧栏、顶栏、移动端 Tab 栏、独立主滚动区，以及全局帖子预览、图片查看器、主题/吉祥物、彩蛋和新手引导层。页面内容通过 React Router `Outlet` 插入主滚动区。

## FSD 分层

目录职责如下：

- `app`：应用初始化、路由、守卫、主题和顶层 Provider。
- `pages`：路由页面的业务编排；页面可以组合各 feature、widget、entity 和 shared。
- `widgets`：跨页面复用的完整区块，例如 `RootLayout`、`TopBar`、`AppSidebar`、内容展示和帖子预览。
- `features`：可复用的业务能力及其 API、hooks、组件、模型和局部状态，例如搜索、书单、赛事、关注、偏好、AI 搜索和发现。
- `entities`：帖子、书单、赛事和用户等业务实体的类型、轻量展示和转换逻辑。
- `shared`：通用 UI、API 客户端、类型、配置、样式、纯函数和非业务 hooks。

目标依赖方向是 `shared < entities < features < widgets < pages < app`。当前 `eslint.config.js` 只对 `shared`、`entities`、`features`、`widgets` 配置了禁止引用上层的 `no-restricted-imports`，级别为 `warn`；源码中仍存在少量存量违规，因此这里是治理目标，不是已完成的不变量。新增跨层引用应优先通过 props、下沉共享部分或调整切片边界解决。

## 状态与数据流

- 远程数据由 React Query hooks 管理，API 实现位于各 feature 的 `api/`；查询 key 位于对应 feature 的 `lib/queryKeys.ts`。全局默认缓存时间、重试和查询错误处理在 `App.tsx` 的 `QueryClient` 配置中定义。
- 普通搜索条件由 `useSearchURLParams` 解析和序列化到 URL；`q` 承载文本及 Tag/作者/日期 Token，`channel`、`type`、排序、页码和 Tag 逻辑也属于 URL 协议。搜索结果使用 `useInfiniteQuery`，后续请求通过 `exclude_thread_ids` 推进。
- Zustand 只承载交互状态或本地状态：`useSettingsStore` 保存界面设置，`usePreviewStore` 解耦全局帖子预览，AI 会话 store 保存会话和运行/未读状态，其他 store 分别服务吉祥物、彩蛋和新手引导。
- 持久化不是统一状态库协议：界面设置、搜索历史、浏览足迹、最后浏览位置、抽卡配方和 AI 设置/会话分别通过各自的 `localStorage` 工具保存；搜索草稿等短期值使用 `sessionStorage`。不要把这些本地数据描述成后端用户配置。

## 导入约定

Vite 配置提供 `@` → `src`、`@shared-types` → `src/shared/types` 两个别名。跨目录导入使用别名；OpenAPI 生成类型使用 `@shared-types/openapi`。这只是路径约定，不改变 FSD 的依赖边界。
