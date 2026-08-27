# 目录结构说明

以下结构以当前仓库根目录为准，省略测试文件和未逐项列出的组件；具体入口以源码为准。

```text
repo/
├── src/
│   ├── main.tsx                 # React 挂载入口
│   ├── app/
│   │   ├── App.tsx              # QueryClient、主题、路由、全局层装配
│   │   ├── router.tsx            # 路由树与页面懒加载
│   │   ├── providers/            # ErrorBoundary、ProtectedRoute、RequiredSetupGate
│   │   └── themes/               # ThemeProvider、主题 token 和背景层
│   ├── pages/                    # 路由页面及页面内部子组件
│   ├── widgets/
│   │   ├── layout/               # RootLayout、TopBar、AppSidebar、MobileTabBar
│   │   ├── sidebar/              # 可调整大小的侧栏
│   │   ├── thread-preview/       # 全局帖子预览与浮层
│   │   └── content-display/      # 广场/排行/内容展示区块
│   ├── features/                 # 按业务能力切片
│   │   ├── ai-search/            # Provider、Agent、工具、会话、提示词和 AI UI
│   │   ├── auth/                 # 认证 API 与 hooks
│   │   ├── booklists/            # 书单 API、查询、写操作和表单
│   │   ├── discovery/            # 发现轨道与随机抽取 API/hooks
│   │   ├── draw/                 # 抽卡揭晓 UI
│   │   ├── follows/              # 关注列表、未读数和操作
│   │   ├── preferences/          # 服务端搜索/发现偏好
│   │   ├── search/               # 普通搜索 API、URL 参数、查询和预览状态
│   │   ├── threads/              # 帖子卡片、列表、操作和推荐
│   │   ├── tournaments/          # 赛事查询与赛事列表组件
│   │   └── ...                   # authors、banner、easter-eggs、history、mascot、notifications、onboarding、plaza、tags
│   ├── entities/
│   │   ├── thread/               # 帖子类型、轻量视图和状态/标签展示
│   │   ├── booklist/             # 书单类型、卡片和条目转换
│   │   ├── tournament/           # 赛事类型
│   │   └── user/                 # 用户头像和用户头部组件
│   ├── shared/
│   │   ├── api/                 # Axios client、限流处理
│   │   ├── config/              # 频道、导航和应用配置
│   │   ├── hooks/               # 通用 hooks
│   │   ├── lib/                 # 会话、URL、日期、搜索 Token 等纯逻辑
│   │   ├── store/               # 全局界面设置及图片查看器状态
│   │   ├── styles/              # 全局 CSS、主题 token 和组件样式
│   │   ├── types/               # OpenAPI 与环境类型
│   │   └── ui/                  # 通用 UI、Markdown、图片和加载器
│   ├── assets/                  # 图片和静态资源
│   └── tests/                   # 测试环境初始化
├── docs/                        # 项目文档
├── scripts/                     # OpenAPI 导出、OG 检查等脚本
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## 当前边界

普通搜索的 URL 协议位于 `src/features/search/hooks/useSearchParams.ts`，帖子预览状态位于
`src/features/search/store/previewStore.ts`，消费方是 `src/widgets/thread-preview`。不要把帖子预览
误写成搜索条件状态。

广场使用 `src/features/discovery`、`src/features/plaza` 的查询和 API；抽卡页直接使用发现随机
接口并在 `src/features/draw` 中展示揭晓 UI。赛事与书单共享 `booklistsApi` / `booklistKeys`，赛事
通过 `is_tournament=true` 区分；当前不存在独立的 `tournamentsApi`。

`src/features/ai-search` 是完整的浏览器端业务切片，包含 Chat Completions 适配、模型列表、Agent
循环、工具运行时、提示词、上下文、响应解析、本地会话和页面组件。它调用已有的搜索、书单和
发现 API，不拥有后端 Agent 服务。

## 导入与分层

Vite 提供 `@` → `src` 和 `@shared-types` → `src/shared/types` 别名，跨目录代码应使用别名而不是层层相对路径。目标依赖方向为 `shared < entities < features < widgets < pages < app`；`eslint.config.js` 目前以 `warn` 级 `no-restricted-imports` 检查部分下层到上层引用，存量违规仍需单独治理，不能把该规则写成已经全部通过的硬约束。
