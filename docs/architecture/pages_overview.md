# 📄 页面概览 (Pages Overview)

在 Feature-Sliced Design (FSD) 架构中，`src/pages` 层是负责拼装最终展现给用户的画布。本页梳理了目前系统中所拥有的页面级模块及其承载的业务定位。

## 1. 核心探索组 (Discovery)

这一组页面是论坛流量的主阵营，主要承担信息检索与分发。

- **`SearchPage` (搜索主页)**
  - **核心职责**: 提供基础搜索与高级检索语法交互。它是系统中重载最大的页面，挂载了负责筛选过滤的左侧边栏 (`LeftSidebar`) 和复杂的搜索栏。几乎涵盖了帖子最全的展示逻辑。
  - **组件依赖**: 重度依赖 `widgets/thread-preview`, `features/search`。

- **`PlazaPage` (广场)**
  - **核心职责**: 用于展示最近热门帖子或是无差别的内容随机下发，供用户进行泛阅读和瞎逛浏览。

- **`TagsPage` (标签/版块导航)**
  - **核心职责**: 展示所有可用的 Tags 及其分类面板。供寻找具有特定标签属性帖子的用户直接导航。

- **`DrawPage` (抽卡发现)**
  - **核心职责**: 按用户配置的「配方」（频道范围、包含/排除标签、标签逻辑）随机抽取帖子，配合 `DrawRevealOverlay` 做揭晓动画。是目前体量最大的页面。

## 2. 书单与合集组 (Collections)

这部分页面的业务逻辑聚焦在用户手动组织整理的书单和推荐合集。

- **`BooklistsPage` (书单广场)**
  - **核心职责**: 浏览所有公开展示的书签，可支持按照时间、点赞排序进行发掘。
- **`BooklistDetailPage` (书单详情页)**
  - **核心职责**: 聚焦某个特定书单实例，展示详情以及它所包含的多个具体帖子集合，支持在内部对包含项进行阅读流呈现。

## 3. 赛事组 (Tournaments)

赛事本质上是被标记为 `is_tournament` 的书单，因此这一组页面与书单共用后端接口与数据结构。

- **`TournamentsPage` (赛事广场)** — `/tournaments`，赛事列表与顶部轮播。
- **`TournamentDetailPage` (赛事详情)** — `/tournaments/:booklistId`，展示赛事内的参赛帖子。
- **`TournamentManagePage` (赛事管理)** — `/tournaments/manage/:booklistId`，仅创建者可进入，含写操作。
- **`MyTournamentsPage` (我的赛事)** — `/tournaments/mine`。

## 4. 用户与个性化组 (User & Personalization)

与用户账号直接绑定的私人视图与设置面板。

- **`MePage` (我的空间)**
  - **核心职责**: 当前认证用户的主页，用以管理自己赞过、发过和自己的收藏列表。此页面受到强 Auth Guard（路由守卫）拦截。
  - **关注中心** 是它的一个 tab（`/me?tab=follows`），不是独立页面。
- **`UserProfilePage` (他人主页)**
  - **核心职责**: 给定任意一个外部 `User ID`，加载并渲染该作者所有的公开信息与过往发帖存档。
- **`SettingsPage` (单机偏好设置)**
  - **核心职责**: 调整 `ui_style`、黑白模式、排版字号、语言习惯等本地偏好存量（写入 `localStorage` 与 `Zustand` ）。
- **`AuthPage` (登录重定向屏)**
  - **核心职责**: 在完成 Discord OAuth 回调后临时停留，做 token 解析与派发的过渡页。

## 5. 辅助与静态页 (Utility & Static)

- **`AboutPage` (关于)**
  - **核心职责**: 前台展示页，介绍项目、团队信息，并动态拉取渲染前端与后端仓库的开源贡献者榜单及项目相关导航。
- **`NotFoundPage` (404 捕获)**
  - **核心职责**: 兜底一切未匹配路由并返回 404 UI，防范爬虫死链或用户手误。
- **`TestPage.tsx`**
  - **核心职责**: 本地开发专用。仅在 `import.meta.env.DEV` 或开启 mock 时注册路由，生产构建中是一个永远不会被下载的独立 chunk。

---

## 加载方式

所有页面均通过 `React.lazy` 按需加载，在 `src/app/router.tsx` 中统一包裹 `Suspense`（fallback 为 `OmicronLoader`）。新增页面时请沿用 `lazyPage()` 辅助函数，不要改回静态 import——那会把整站重新打成一个包。
