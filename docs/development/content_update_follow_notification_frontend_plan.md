# 作品更新、作者关注与动态通知前端接入计划

> 状态：实施中；类型基线、`viewer_flags`、作者关注、Banner 契约、动态页与通知弹层迁移已完成
>
> 事实来源：线上 `https://forum.shimmerday.top/openapi.json`、当前前端源码与生成类型
>
> 参考资料：后端计划文档只用于理解产品目标，不作为当前接口事实

## 1. 当前结论

线上后端已经提供作品最新更新、作者关注和动态通知能力。前端不需要设计新的状态系统，最小接入路径是：

1. 以生成的 `ThreadDetail-Output` 和新增 Schema 修复类型基线；
2. 用 `viewer_flags` 统一解释收藏、作品关注、作者关注和动态未读；
3. 右上角展示系统公告与最近动态摘要，点击进入独立 `/activity` 动态页；动态页统一展示系统通知、作品更新与作者新作；
4. 在用户真正打开作品时按作品标记动态通知已读；
5. 作者关注入口复用现有作者悬浮卡和作者主页，后续再决定是否扩展“我的关注”管理页；
6. 同步修正 Banner 申请请求字段，并允许封面链接留空交给后端回退首图。

本计划不修改后端，不依赖本地后端仓库的实现细节，也不把后端计划文档中未出现在当前线上 OpenAPI 的内容当成已实现事实。

## 2. 已验证的线上契约

### 2.1 新增端点

| 方法 | 路径 | 主要响应 | 前端用途 |
|---|---|---|---|
| `POST` | `/v1/author-follows/{author_id}` | `AuthorFollowState` | 关注作者 |
| `DELETE` | `/v1/author-follows/{author_id}` | `204 No Content` | 取消关注作者 |
| `GET` | `/v1/author-follows` | `AuthorFollowList` | 分页管理已关注作者 |
| `GET` | `/v1/notifications` | `NotificationList` | 动态通知列表 |
| `GET` | `/v1/notifications/unread-count` | `UnreadCountResponse` | 顶栏动态通知红点 |
| `POST` | `/v1/notifications/threads/{thread_id}/read` | `MarkReadResponse` | 按作品标记全部动态通知已读 |
| `POST` | `/v1/notifications/read-all` | `MarkReadResponse` | 全部动态通知已读 |

这些端点都声明 `HTTPBearer` 认证。未携带有效登录状态访问线上通知未读数接口，实测返回 `401` 和：

```json
{
  "detail": "未登录或会话失效"
}
```

因此所有常驻查询和 mutation 必须以 `useAuth().isAuthenticated` 为开关；未登录不轮询、不提交，也不把 `401` 当成普通空列表。

### 2.2 帖子响应

线上 `ThreadDetail-Output`、`FollowedThreadResponse-Output` 和 `BooklistItemDetail` 已增加：

```ts
viewer_flags?: (
  | "collected"
  | "followed"
  | "followed_author"
  | "unread"
)[];

latest_update?: LatestUpdate | null;
```

`LatestUpdate-Output` 的字段为：

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | `number` | 必填，数据库主键 |
| `description` | `string` | 必填，作者提交的更新说明 |
| `version` | `string \| null` | 可选 |
| `message_link` | `string \| null` | 可选，不能假定必有 Discord 链接 |
| `source_message_at` | `string` | 必填 |
| `published_at` | `string` | 必填 |

搜索、单帖详情、相似推荐和 Discovery 通过 `ThreadDetail-Output` 获得这两个字段；书单条目使用自己的 `BooklistItemDetail` 字段。`BannerItem` 没有 `viewer_flags`，点击 Banner 后仍应按帖子 ID 拉取详情。

### 2.3 动态通知响应

`NotificationItem-Output` 的核心结构为：

```ts
type NotificationItem = {
  id: number;
  type: "thread_update" | "author_new_thread";
  thread: ThreadDetailOutput;
  update?: LatestUpdateOutput | null;
  created_at: string;
  read_at?: string | null;
};
```

具体语义：

- `thread_update`：`update` 应承载版本、更新说明和来源链接；
- `author_new_thread`：`update` 固定为空，展示数据来自 `thread` 与 `thread.author`；
- `read_at == null` 表示未读；动态通知不能继续用前端 `localStorage` 时间戳判断已读；
- `NotificationList.unread_count` 描述的是当前用户全部动态通知的未读数量，即使列表使用 `unread_only` 筛选，也应把它当全局动态未读数；
- `POST /notifications/read-all` 复用了 `MarkReadResponse`，其中 `thread_id` 可缺省或为空，前端只依赖必填的 `marked_read`。

### 2.4 作者关注响应

`AuthorFollowState` 返回 `author_id: string`、`followed_at: string` 和 `active: boolean`。列表端点支持：

```text
limit: 1..100，默认 50
offset: >= 0，默认 0
active: boolean | null，默认 true
```

`AuthorFollowList.results` 每项包含完整作者信息、最近关注时间和当前 active 状态。

当前线上契约没有 `GET /v1/author-follows/{author_id}`，作者资料响应也没有当前用户的关注状态。第一阶段使用可缓存的活跃关注分页扫描，并且必须扫描到命中或耗尽 `total`，不能只取前 50 或 100 条猜测。代码以 `ponytail` 标记该性能上限；后端增加精确状态接口后直接替换查询函数。

### 2.5 Banner 申请

线上 `BannerApplicationRequest` 的实际字段是：

```ts
type BannerApplicationRequest = {
  thread_link: string;
  cover_image_url?: string | null;
  target_scope: string;
};
```

迁移前的前端发送 `thread_id`，与线上契约不一致；第一阶段已经改为 `thread_link`。新变化是 `cover_image_url` 已变为可选：帖子留空时后端使用当前首图，频道目标仍可能被后端拒绝。

前端只负责允许留空并展示准确提示，不预先复制后端对帖子归属、目标类型、图片存在性和权限的判断。

## 3. 与原计划的差异

| 原计划预期 | 线上实际 | 前端处理 |
|---|---|---|
| 生成独立 `ViewerFlag` 类型 | 没有命名 Schema，四个值内联在字段中 | 从 `ThreadDetail-Output["viewer_flags"]` 派生元素类型 |
| `viewer_flags` 总是数组 | OpenAPI 中字段可选 | 所有读取统一按 `thread.viewer_flags ?? []` 处理 |
| `latest_update` 明确返回 `null` | OpenAPI 中字段本身可选，值也可为 `null` | 同时容忍缺省和 `null` |
| `ThreadDetail` 继续作为单一 Schema | 已拆成 `ThreadDetail-Input` / `ThreadDetail-Output` | 前端响应类型只使用 `ThreadDetail-Output` |
| 更新来源链接存在 | `message_link` 可选且可空 | 没有链接时不渲染跳转按钮 |
| 可从任意作者入口准确展示关注状态 | 没有单作者状态查询，作者 Profile 也无状态字段 | 帖子上下文直接使用 Flag；作者页临时完整扫描分页列表 |
| 旧关注未读端点将被淘汰 | `/follows/unread-count` 与 `/follows/mark-viewed` 仍在线 | 通知中心迁走，但关注页兼容字段分阶段清理 |
| Banner 请求围绕帖子 ID | 实际字段名为 `thread_link`，允许纯 ID 或 Discord 链接 | 修正表单与请求类型，不再发送 `thread_id` |

## 4. 前端状态与数据边界

继续遵守当前项目的数据所有权：

- React Query 持有通知、作者关注、帖子和未读数量等服务器状态；
- Zustand 的 `usePreviewStore` 只负责当前打开哪个帖子，不保存通知已读或关注状态；
- 静态 YAML 公告的本地确认/关闭状态继续由当前 `localStorage` 逻辑管理；
- 动态通知的 `read_at`、作者关注和 `viewer_flags` 不写入 `localStorage`。

右上角与动态页分工如下：

```text
静态 YAML 公告 ── 现有右上角公告面板
动态未读数量 ──── 右上角红点提醒
动态通知摘要 ──── 现有右上角通知弹层
动态通知列表 ──── 独立 `/activity` 动态页
```

右上角在同一弹层中分区展示静态公告与最近动态，但不把两者混成同一套已读状态，也不承载完整动态列表。桌面端 Hover 只预览该弹层，点击通知按钮直接进入 `/activity`，不再用点击切换弹层。

## 5. 最小实现方案

### 阶段 A：恢复类型基线

1. 将 `src/entities/thread/types.ts` 的基础响应从已不存在的 `ThreadDetail` 改为 `ThreadDetail-Output`。
2. 保留当前 UI 确实依赖的轻量领域归一化，例如 `tags: string[]`；不继续添加 `is_following`、`has_update` 一类新兼容字段。
3. 从生成类型派生：

```ts
type ApiThread = components["schemas"]["ThreadDetail-Output"];
type ViewerFlag = NonNullable<ApiThread["viewer_flags"]>[number];
type LatestUpdate = components["schemas"]["LatestUpdate-Output"];
```

4. 提供一个小型、无配置的状态判断函数，缺省数组和未来未知字符串都按未命中处理：

```ts
hasViewerFlag(thread, "followed");
hasViewerFlag(thread, "unread");
```

5. API 层直接复用生成的 `NotificationList`、`AuthorFollowList`、`AuthorFollowState`、`UnreadCountResponse`、`MarkReadResponse` 和 Banner Schema，删除本次迁移后失去用途的手写重复接口。

Snowflake ID 仍由前端以字符串保存。OpenAPI 的路径参数显示为 integer，不代表浏览器端应先转成 JavaScript `number`；请求 URL 继续直接插入已校验的数字字符串，避免精度损失。

### 阶段 B：Banner 契约修复

1. 表单字段与请求字段统一改为 `thread_link`，允许用户输入纯数字 ID 或 Discord 帖子链接。
2. `cover_image_url` 改为可选 URL：空字符串提交前转换为 `undefined`，非空才做 URL 校验。
3. 提示文案明确“帖子留空时尝试使用当前首图；没有可用首图或目标不支持时由后端拒绝”。
4. 继续使用后端返回的业务错误，不在前端请求帖子详情复制封面回退判断。
5. 活跃 Banner 的 `cover_image_url` 在生成类型中也变成可选；保留当前空图片回退能力，不假定响应永远非空。

这是独立、低风险的小阶段，适合先完成，避免继续发送错误字段。

### 阶段 C：`viewer_flags` 与最新更新

1. `ThreadStatusBadges` 改为消费 `viewer_flags` 或派生后的明确状态：
   - `followed`：作品关注标记；
   - `unread`：有未查看动态；
   - `collected`：只服务收藏 UI，不再传给作品关注标记；
   - `followed_author`：第一版只用于作者关注按钮/作者区域，不在每张作品卡上再堆一个状态徽章。
2. 修复当前 `ThreadCard`、`ThreadListItem` 和 `ThreadPreviewOverlay` 将 `collected_flag` 传给 `isFollowing` 的错误。
3. `threadFromBooklistItem()` 必须继续转发 `viewer_flags` 和 `latest_update`，否则书单/赛事会在适配时丢掉后端状态。
4. 关注页的“有更新优先”和更新徽章迁移到 `viewer_flags` 的 `unread`；`active_flag` 仍保留用于区分当前/历史关注。
5. 帖子预览/详情增加紧凑的最新更新区域：展示可选版本、说明与发布时间；仅在 `message_link` 存在时提供“查看更新原消息”。
6. 普通卡片只展示状态，不复制完整更新说明，避免列表信息过载。

覆盖面必须包括搜索结果、单帖详情、相似推荐、Discovery、作者作品列表、作品关注列表、书单与赛事条目。Banner 列表不增加 `viewer_flags` 消费。

### 阶段 D：动态通知基础与 `/activity` 动态页

在现有 `features/notifications` 内增加 API、查询键和 hooks，不创建第二个通知 feature。动态展示使用独立 `/activity` 路由，原 `/me?tab=follows` 保持作品关注管理职责：

```text
src/features/notifications/
├── api/notificationsApi.ts
├── hooks/useNotificationsData.ts
├── lib/queryKeys.ts
└── components/DynamicNotificationCard.tsx

src/pages/ActivityPage/index.tsx
```

建议查询策略：

- 未读数：登录后常驻查询，沿用当前约 30 秒轮询与窗口聚焦刷新；
- 通知列表：只在动态页打开时请求，默认每页 20 条；通知弹层只请求最近 5 条；
- 分页：复用项目现有 `useInfiniteQuery`/加载更多模式，以 `offset + results.length < total` 决定下一页；
- 页面顶部横向展示当前关注作者，点击头像在当前页精确筛选该作者的动态；状态保存在 `author=<snowflake>` URL 参数；
- 通知 API 暂无 `author_id` 参数，选中作者时以每页 100 条扫描当前未读条件下的全部分页后再精确过滤；该限制以 `ponytail` 标记，后端增加精确筛选后删除；
- 静态公告：继续走当前独立 query，不受动态通知 API 失败影响；在动态来源横列中作为固定“系统通知”来源，并在“全部动态”中与后端动态按 `created_at` 混排。

动态页上线时，从现有右上角组件删除以下旧动态路径：

- `useFollowsFeed()`；
- 根据 `FollowedThreadResponse.has_update` 组装通知；
- `dismissedFollowUpdates`；
- `/follows/mark-viewed` 驱动的动态已读；
- 用 `latest_update_at` 模拟通知 ID 或 read 状态。

动态通知展示规则：

| 类型 | 标题/正文来源 | 辅助动作 |
|---|---|---|
| `thread_update` | 作品标题、`update.version`、`update.description` | 有 `message_link` 时可单独打开原消息 |
| `author_new_thread` | 作者名、作品标题、可选首楼摘要 | 打开新作品 |

动态页的单条通知使用“作者与更新信息 Header + 居中列表型作品摘要”结构。Header 中的作者头像和名称进入作者页；作品区复用搜索列表的语言，左侧展示最多四张缩略图，右侧展示标题、首楼摘要、标签、创建/活跃时间和统计字段，不使用大块卡片底色。`NEW` 只表示当前通知 `read_at == null`，不贴在作者头像上，已读通知即使作品还有其他未读状态也不显示该徽标。通知之间只保留下边线，关注作者横列不额外加上下边线；“全部动态”与作者头像使用相同对齐槽和中性按钮样式，当前作者筛选仍用清晰描边标识。

动态未读直接使用 `read_at == null`；静态公告继续使用本地 `lastOpenedAt` 与强制公告确认状态。顶栏红点与动态页未读数合并两类来源，但两套状态仍分别持有，不增加全局 store。

动态页和右上角弹层的“全部已读”都分别更新静态公告本地已读时间，并调用 `POST /v1/notifications/read-all` 更新后端动态；强制公告仍必须单独阅读确认，不能由“全部已读”代替确认。

### 阶段 E：按作品标记已读

触发条件必须是用户实际打开作品，而不是渲染、进入视口、悬浮或预取。

当前前端有两个真实打开入口：

- 全局预览：`GlobalThreadPreview` 最终挂载 `ThreadPreviewOverlay`；
- 路由详情：`ThreadDetailPage` 直接挂载 `ThreadPreviewOverlay`。

因此最小公共落点是 `ThreadPreviewOverlay` 或它调用的通知 hook，而不是给每个卡片点击处理器重复写 mutation。只有满足以下任一条件时提交幂等请求：

- 当前帖子 `viewer_flags` 包含 `unread`；
- 用户点击的动态通知本身 `read_at == null`。

请求失败不能阻止作品打开。成功后：

1. 更新/失效动态通知列表与未读数；
2. 失效当前活动的搜索、Discovery、作者作品、作品关注和书单条目查询，使 `unread` 从可见列表消失；
3. 不编写遍历任意 React Query 数据结构的递归缓存修改器。

动态已读是低频用户动作，优先使用清晰的 query key invalidation。若后续实测请求量过大，再为已知缓存形状增加局部 patch，不提前建立通用实体缓存层。

### 阶段 F：作者关注

作者关注 API 与 hooks 放在现有 `features/follows` 边界内，但第一阶段只提供 Hover 和作者页入口，不扩展“我的关注”页面。缓存使用独立 query key：

```text
["follows", "authors", "list", params]
["follows", "authors", "state", authorId] // 仅保存已由可靠上下文获得的状态
```

第一阶段入口：

1. 作者悬浮卡：由所属帖子把 `followed_author` 状态传入；缺少帖子上下文时使用缓存的精确分页查询；
2. 作者主页：直接提供关注/取消关注按钮，状态查询使用同一缓存；
3. 关注/取消后失效作者作品、搜索、Discovery 和书单查询，使 `followed_author` 重新同步。

当前分页扫描是兼容方案。后端提供以下任一契约后，应删除它：

- `GET /v1/author-follows/{author_id}`；
- 作者 Profile 响应中的查看者关注字段；
- 一个支持 `author_id` 精确筛选的作者关注列表参数。

Hover 有可靠 `viewer_flags` 时直接填充 query cache；作者页直接访问时扫描全部活跃关注页，因此不会把“未出现在第一页”误判为未关注。

关注/取消成功后的最小失效范围：

- 作者关注列表；
- 当前作者的作品查询；
- 当前活动的搜索/Discovery/书单查询，使这些作品的 `followed_author` 更新；
- 不改写已经生成的历史通知。

### 阶段 G：统一作品操作菜单

网格卡片、列表卡片和作品详情共用现有 `ContextMenu`。显式三点、桌面右键与移动端长按打开同一套低频操作菜单，包含：

- 加入书单；
- 关注/取消关注作品；
- 复制链接与新标签页打开；
- 卡片现有的相似作品和书单管理操作。

Discord/原帖跳转是高频操作，不收入三点。卡片和作品详情的跳转放在三点右侧；动态列表作品的关注/`NEW` 状态固定在右上角，三点与 Discord 跳转并排在右下角。`ContextMenu` Portal 层级必须高于 `ThreadPreviewOverlay` 和 `QuickAddToBooklistModal`。

## 6. 兼容与清理边界

后端仍保留 `collected_flag`、`has_update`、`latest_update_at`、`last_viewed_at`、`/follows/unread-count` 和 `/follows/mark-viewed` 等旧契约。前端迁移顺序应为：

1. 新 UI 先改用 `viewer_flags`、`latest_update` 和 `/notifications*`；
2. 作品关注管理仍保留 `active_flag`、`followed_at` 等列表专属字段；
3. 搜索当前源码，确认旧字段与旧端点没有业务消费者后，再单独删除兼容类型和代码；
4. 不因为后端暂时保留兼容字段，就继续让通知中心同时读取新旧两套未读状态。

`useAuth().unreadCount` 当前来自未细化的 `/auth/checkauth` 响应，语义仍是旧作品关注未读。顶栏迁移到动态通知未读后，应检查并删除这个无人使用的前端暴露值；不要把它混入新的动态通知计数。

## 7. 最小验证

### 自动化

1. `pnpm typecheck`：生成类型、`ThreadDetail-Output` 迁移和所有消费点无类型断裂；
2. API 定向测试：路径、分页参数、`204`、空 Banner 封面与 Snowflake 字符串不被转成 `number`；
3. `viewer_flags` 单元测试：缺省数组、四个已知值和未知字符串都安全；
4. 通知中心组件测试：两种动态通知、静态公告合并、局部错误、全部已读和空状态；
5. 已读 hook 测试：打开才提交，渲染/悬浮/预取不提交，失败不关闭预览；
6. 作者关注测试：关注、取消、列表分页和 query invalidation；
7. Banner 表单测试：纯 ID/链接、空封面、省略字段、非法 URL。

类型与公共接口跨多个模块，完成全部阶段后应至少运行相关 Vitest 文件和 `pnpm typecheck`。没有修改构建配置、依赖或入口时，不把完整 build 当作固定仪式。

### 客观浏览器诊断

实施完成后，如有可用登录会话，应确认：

- 线上登录响应确实返回 OpenAPI 描述的字段；
- `viewer_flags` 在无状态时是空数组还是字段缺省；
- 标记一个作品已读后，通知列表、未读数和帖子 Flag 的实际刷新时序；
- 作者关注 mutation 后，后端多久能在搜索/详情响应中反映 `followed_author`。

这些属于客观数据与请求诊断，不替代视觉验收。

### 人工视觉验收

需要人工确认通知中心信息密度、更新说明截断、作者关注按钮位置、卡片徽章是否过多、移动端通知面板和 Banner 表单文案。自动化通过不能证明这些视觉与交互取舍已经合适。

## 8. 非目标

- 不修改本地后端参考仓库；
- 不迁移静态 YAML 公告到后端；
- 不新增通知偏好、按类型已读、推送或全站浏览历史；
- 不把 `unread` 扩展为普通帖子是否浏览过；
- 不增加新的状态管理库、实体缓存层或通用 Flag 配置系统；
- 不为作者关注自动创建作品关注；
- 不在前端复制 Banner 首图选择与权限校验；
- 不在本轮清理后端仍在使用的旧接口。

## 9. 当前开放问题

1. 后端是否愿意补充单作者关注状态查询或把状态加入作者 Profile；这不再阻塞功能，但决定能否删除分页扫描。
2. OpenAPI 把 `viewer_flags` 标为可选；需要一次带登录态的实际响应确认它在无状态时是 `[]` 还是缺省。前端无论如何都按可选处理。
3. OpenAPI 只声明常规成功响应、`422` 和认证方案，具体业务错误码仍需在实施时通过真实失败场景记录，前端统一使用现有 `extractErrorMessage()`，不猜测错误结构。

4. 动态页已确定为 `/activity`；通知按钮点击直接进入，弹层底部也保留“查看全部动态”；作者筛选使用完整分页扫描作为临时兼容方案。

这些问题不阻塞当前作者关注与契约迁移。
