# Odysseia Forum 性能与代码冗余专项审计（2026-08-23）

> 状态：阶段一、阶段二完成；阶段三前端项完成、后端接口项待确认；阶段四局部减负完成、长列表实测基准待人工采集
> 范围：加载速度、网络请求、渲染与内存、长列表生命周期、重复逻辑
> 非目标：新增功能、删除现有功能、无证据的风格重构、机械消除 Lint warning

## 1. 审计方法

本轮采用四路全量静态扫描，分别检查加载与构建、网络与 React Query、渲染与内存、代码冗余。所有扫描结果均经过中央复核；只有能够从当前生产者 → 消费者链路证明影响的问题才进入实施阶段。

审计判断遵循以下边界：

- 性能不仅包含内存，也包含首屏与按需加载、网络请求数量、资源解码、主线程工作和长期会话成本。
- 文件较长、代码相似或 Hook 数量较多不自动构成缺陷，必须存在可说明的运行成本或维护代价。
- 不为了减少代码行数合并不同职责，不引入新的通用抽象或依赖。
- 保留标签、作者、右键菜单、加入书单、Discord 跳转等全部现有入口和快捷操作。
- 自动化验证、客观浏览器诊断和人工视觉验收分别记录，不互相替代。

## 2. 当前工作区基线

上一批性能优化已经完成但尚未提交，本轮实施不得重置或覆盖：

- 移除 onboarding 每 200ms 的 DOM 轮询。
- 站点图标由约 1.16 MB 降为 8 KB favicon 和约 90 KB 界面图标。
- 顶栏标签目录改为面板打开时请求。
- 图片恢复改为每个 Thread 一次订阅，并将图片会话缓存限制为 500 条。
- TypeScript、完整 ESLint 棘轮、5 个文件共 6 条测试和生产构建已经通过。
- 构建资源总量由约 37.79 MB 降至 36.77 MB。
- 新图标清晰度已经完成人工验收。

上述结果属于上一批实现基线，不代表本文件列出的新问题已经修复。

## 3. 阶段一：请求边界与实例级重复工作

这是建议优先一次性实施的阶段。修改范围在前端内部，不改变后端协议，不新增依赖，整体风险为低到中。

> 实施状态：已完成。PERF-101 至 PERF-109 均已按本节边界关闭，没有删除或新增业务功能。

### PERF-101 `/meta/channels` 存在重复请求与双缓存 authority

涉及位置：

- `src/shared/hooks/useChannels.ts`
- `src/features/search/api/searchApi.ts`
- `src/features/search/components/SearchDiscoveryHub.tsx`
- `src/features/search/hooks/useSearchAutocomplete.ts`

当前同一个 `/meta/channels` 端点使用不同 Query Key，并维护两套频道归一化与缓存来源。这会让冷缓存页面产生重复请求，也增加数据漂移风险。

处理边界：保留 `useChannels` 返回的原始 `apiData` 作为唯一 authority，在消费端派生标签目录；必须继续保留 API 失败后的静态频道降级。

关闭条件：冷缓存下 `/meta/channels` 只请求一次，搜索发现区与自动补全继续得到相同频道数据，失败降级仍有效。

### PERF-102 偏好加载使同一搜索执行两次

涉及位置：

- `src/pages/SearchPage/index.tsx`
- `src/features/preferences/hooks/useUserPreferences.ts`
- `src/features/search/hooks/useSearchResults.ts`

搜索会在偏好尚未加载时先请求一次；偏好就绪后 `preferenceSignature` 改变，又以相同实际请求参数执行一次。后端请求体只使用 `apply_preferences: true`，签名没有随请求发送。

处理边界：偏好就绪前暂缓需要应用偏好的搜索，或者移除未参与请求的缓存维度并在偏好更新时显式失效。实施时选择概念和分支更少的方案。

关闭条件：偏好从 loading 进入 ready 时，同一搜索参数只产生一次有效请求；偏好变更后仍能获取更新结果。

### PERF-103 搜索建议 Query Key 含 API 未消费维度

涉及位置：

- `src/features/search/lib/queryKeys.ts`
- `src/features/search/hooks/useSearchAutocomplete.ts`
- `src/features/search/api/searchApi.ts`

搜索建议的 Query Key 包含 `channel` 和 `preferenceSignature`，实际 API 只接收 keyword 与 applyPreferences。相同网络请求因此无法共享缓存，并可能产生重复请求。

处理边界：Query Key 必须与实际请求参数一致；不能在前端假装实现后端不存在的频道过滤。

关闭条件：相同实际参数共享同一缓存，不同实际参数仍相互隔离。

### PERF-104 书单与赛事 Query 未完整传递 AbortSignal

涉及位置：

- `src/features/booklists/hooks/useBooklistsData.ts`
- `src/features/tournaments/hooks/useTournamentsData.ts`

相关 API 已有部分 signal 支持，但 Query 层没有完整透传。快速切页、切换筛选或离开路由后，旧请求仍可能继续占用网络和后端资源。

处理边界：复用 React Query 提供的 `signal`，仅补齐缺失的 API 参数，不改变错误处理或缓存策略。

关闭条件：Query Key 改变或组件卸载后旧 signal 被取消；正常请求结果不变。

### PERF-105 每个帖子标签提前挂载偏好 observer 与 mutation

涉及位置：

- `src/features/threads/components/ThreadTagItem.tsx`
- `src/features/threads/components/ThreadTagList.tsx`

每个 `ThreadTagItem` 都调用 `useUserPreferences`。以 24 张卡、每卡约 5–6 个标签估算，一个页面可提前创建约 120–144 组 Hook/observer，而相关偏好操作只在右键菜单打开后需要。

处理边界：标签本身及全部快捷操作保持不变；只把偏好 Hook 和 mutation 移到菜单真正打开后才挂载的内容子组件。

关闭条件：菜单未打开时不创建相关业务 Query observer；打开后原有操作全部可用。

### PERF-106 每个作者入口提前挂载悬浮卡业务订阅

涉及位置：

- `src/features/authors/components/AuthorIdentityLink.tsx`
- `src/features/authors/components/AuthorWorksHoverCard.tsx`

网格卡的头像和作者名可分别创建一个悬浮卡实例，24 条结果最多约 48 个实例。作者数据 Query 虽然由 `enabled: isOpen` 控制，但偏好 Query 与相关 Hook 已经提前创建。

处理边界：保留触发器、定位壳层和全部作者跳转能力；仅在 `isOpen` 后渲染持有业务 Hook 的内容组件。

关闭条件：悬浮卡未打开时不创建内容业务订阅；打开、关闭、定位和作者跳转行为不变。

### PERF-107 图片关闭模式仍建立 Observer 与恢复订阅

涉及位置：`src/shared/ui/LazyImage.tsx`

图片关闭时，当前恢复订阅和 `IntersectionObserver` effect 仍会运行，产生没有用户价值的实例与回调成本。

处理边界：为两个 effect 增加 `isImageDisabled` 守卫并保持依赖正确；不得破坏上一批新增的每 Thread 一次恢复订阅行为。

关闭条件：图片关闭模式不创建 IntersectionObserver、不订阅恢复；重新开启图片后懒加载和恢复正常。

### PERF-108 单次帖子预览重复写浏览历史

涉及位置：

- `src/features/search/hooks/usePreviewThread.ts`
- `src/widgets/thread-preview/GlobalThreadPreview.tsx`

完整 Thread 预览路径会在两层分别记录浏览历史，造成两次同步 localStorage 读取、解析、排序和写入。按 ID 打开的预览原本只经过全局层。

处理边界：删除 `usePreviewThread.openPreview` 中的重复写入，统一由 `GlobalThreadPreview` 记录，不改变历史格式与排序规则。

关闭条件：每次成功预览只写一次历史；完整 Thread 与 ID 两条入口结果一致。

### PERF-109 搜索发现区折叠后仍持续请求

涉及位置：`src/features/search/components/SearchDiscoveryHub.tsx`

`isExpanded` 当前只控制显示状态，rails、标签目录和标签帖子 Query 在折叠时仍会执行。

处理边界：以 `enabled: isExpanded` 控制这些 Query；展开后继续保留现有骨架、错误和重试状态。此项与 PERF-101 一起处理，避免再次形成频道缓存分支。

关闭条件：折叠状态不发起发现区请求；首次展开正常加载，重复展开遵循现有缓存策略。

### 阶段一统一验证

- 为 Query Key、enabled 边界和 AbortSignal 运行或补充定向测试。
- 验证冷缓存 `/meta/channels` 请求次数。
- 验证偏好 loading → ready 的搜索请求次数。
- 验证标签菜单、作者悬浮卡未打开时的业务 Hook/observer 数量。
- 验证图片关闭模式不创建 Observer 或恢复订阅。
- 验证单次预览只写一次浏览历史。
- 运行 TypeScript、当前完整 ESLint 棘轮和相关定向测试。
- 因涉及公共 Query 与加载入口，完成后运行生产构建。

实际验证结果：

- TypeScript：通过。
- 定向 Vitest：9 个测试文件、32 条测试通过。
- 完整 ESLint：0 error、79 warning，通过当前棘轮；没有新增 warning。
- 生产构建：通过，Vite 共转换 2676 个模块。
- 反向搜索确认生产代码只剩 `useChannels` 请求 `/meta/channels`。
- 反向搜索确认浏览历史只由 `GlobalThreadPreview` 写入。
- 未执行浏览器网络瀑布、内存快照或人工交互验收；这些不以自动化检查代替。

## 4. 阶段二：加载与视觉资源

本阶段直接影响资源体积、图片解码和持续主线程工作，风险为中等，需要在自动化检查后由人工完成视觉验收。

> 实施状态：代码和资源切换已完成。通知中心因承担未读统计及 `required` 公告主动展示职责，继续常驻；搜索建议、高级筛选和浏览足迹已按实际打开状态懒加载。

| ID | 已确认问题 | 建议边界 | 关闭证据 |
| --- | --- | --- | --- |
| PERF-201 | `TopBar` 的通知内容、搜索建议、高级筛选和浏览足迹属于低频面板，但相关模块随顶栏进入主加载路径 | 使用现有 React/Vite 懒加载能力，不增加加载框架；保持打开后的交互和错误边界 | 构建依赖图与首屏 chunk 对比；各面板首次及再次打开正常 |
| PERF-202 | 登录页和 About 页视差 PNG 每组约 2.3–3.5 MB | 转为适配显示尺寸的 WebP/AVIF，保留必要回退，不改变画面构成 | 构建资源体积、实际解码尺寸和视觉验收 |
| PERF-203 | `AuthSceneBackground` 与 About 视差动画在目标稳定或页面隐藏后仍持续约 60fps 写入 transform | 目标稳定和页面不可见时暂停，输入变化时恢复 | rAF 回调计数、页面可见性切换和交互手感验收 |
| PERF-204 | `BooklistCard` 网格仍使用原生 `<img>`，没有复用现有图片懒加载和错误恢复能力 | 改用现有 `LazyImage`，不新建平行图片组件 | 首屏请求数量、滚动加载和错误占位验收 |
| PERF-205 | 赛事列表与详情可同时挂载最多 8 张仅由 opacity 隐藏的 Banner | 只挂载当前图片，并按需要预加载相邻图片；不删除轮播能力 | DOM 图片数量、网络解码记录和轮播视觉验收 |

实际实施与验证结果：

- `SearchFilterPanel`、`SearchSuggestions` 和 `BrowseHistoryHoverPopup` 已拆为独立异步 chunk；通知中心保持原有主动公告与未读能力。
- 8 张视差 PNG 保持原始像素尺寸并切换为 WebP，生产引用资源由约 12.7 MB 降至约 0.9 MB；原 PNG 暂时保留作视觉验收回退，验收后可删除。
- 登录页与 About 页共用稳定后自动停止的视差调度；页面隐藏时取消 rAF，鼠标或设备方向输入变化后恢复。
- `BooklistCard` 封面已复用 `LazyImage`。
- 赛事列表和详情只挂载当前 Banner，并预加载前后相邻图片；圆点、自动播放和左右切换保留。
- TypeScript：通过。
- 定向 Vitest：6 个测试文件、12 条测试通过。
- 完整 ESLint：0 error、79 warning，通过当前棘轮；没有新增 warning。
- 生产构建：通过，共转换 2678 个模块；构建资源总量约为 29.56 MB，上一阶段记录值约为 36.77 MB。
- 主入口 JavaScript 由约 363.98 KB 降至 340.69 KB；搜索筛选、搜索建议和浏览足迹分别形成独立 chunk。
- WebP 尺寸与原图逐张一致；编码对比的归一化像素误差约为 0.0066–0.0304。
- 登录页、About 页、书单封面和赛事轮播已完成人工视觉与交互验收；移动端视差人物定位参数在验收中完成调整。

## 5. 阶段三：书单与赛事数据扇出

本阶段处理缓存失效范围和列表 N+1 请求。前端精确失效可以直接实施；后端返回结构或批量接口属于架构边界，必须另行确认。

> 实施状态：PERF-301 已完成；PERF-302 确认需要后端返回结构或批量接口支持，本轮未越过前端专项边界。

| ID | 已确认问题 | 建议边界 | 关闭证据 |
| --- | --- | --- | --- |
| PERF-301 | 书单 mutation 普遍失效 `booklistKeys.all`，局部操作会触发无关列表与详情重新请求 | 按 mutation 实际影响精确更新或失效，不复制缓存 authority | mutation 前后请求计数与相关列表、详情一致性测试 |
| PERF-302 | 赛事缺少封面时，每张卡单独请求 `listItems(limit=6)` 获取兜底图，一页最多形成约 12 个额外请求 | 不删除兜底封面；优先让赛事列表直接返回兜底资源，或增加批量接口 | 一页请求瀑布对比，缺封面赛事仍有正确兜底图 |

PERF-302 如果需要改变后端接口，本轮前端专项不得自行扩展范围。

实际实施与验证结果：

- 新增集中但窄范围的书单缓存失效函数：固定失效列表族，只失效实际受影响书单的详情；仅在条目增加、移除、更新或快捷同步时额外失效对应书单的条目与兜底封面缓存。
- 收藏、创建、编辑、删除、发布与解除发布不再把所有书单详情、条目和封面缓存统一标脏。
- 快捷加入书单根据接口返回的 `added_to_booklist_ids` 与 `removed_from_booklist_ids` 精确失效，不影响未变化书单。
- PERF-302 反向确认当前赛事列表响应只有 `cover_image_url`，现有 API 没有批量获取多个赛事首批条目的能力。保留兜底封面就必须继续逐卡请求；前端合并 Promise 或另建缓存层不能减少后端请求数，反而会增加第二套 authority，因此未实施。
- TypeScript：通过。
- 定向 Vitest：3 个测试文件、6 条测试通过。
- 定向 ESLint：0 error；1 条 `QuickAddToBooklistModal` 既有 `set-state-in-effect` warning，本阶段没有新增 warning。
- `git diff --check`：通过。
- 未运行生产构建：本项不改变入口、依赖、公共接口或构建配置，类型检查与定向测试已经覆盖本次风险。

## 6. 阶段四：长列表生命周期

本阶段面向深度滚动后的 DOM、React 实例、Observer、Query 数据和内存增长。先做不改变用户体验的局部减负；虚拟化或窗口化需单独设计，不直接引入新依赖。

> 实施状态：PERF-402、PERF-403 已完成；PERF-401 保持测量项，当前证据不足以引入窗口化。

| ID | 已确认问题 | 建议边界 | 关闭证据 |
| --- | --- | --- | --- |
| PERF-401 | 无限搜索持续保留全部已加载 DOM、React 实例和 Query 数据 | 先建立 10/50 页基准，再决定是否需要窗口化；不凭静态判断引入虚拟列表 | DOM 数、堆内存、长任务和滚动帧率基准 |
| PERF-402 | 移动端 CSS 隐藏卡片第 2–4 张图片，但组件和 IntersectionObserver 仍已挂载 | 在渲染层不创建不可见图片，保持桌面布局与首图行为 | 移动端 DOM、Observer 和图片请求数量；桌面及断点视觉验收 |
| PERF-403 | 页码追踪在每次追加页面后全量 disconnect、查询并重新 observe；50 页累计约 30,600 次 observe | 改为增量观察新页面节点，不增加新的全局状态系统 | 10/50 页 Observer 调用计数和页码追踪正确性 |

实际实施与验证结果：

- `ThreadResultsCollection` 只建立一个 `min-width: 768px` 媒体查询订阅，并把是否创建次要图片传给列表项；移动端不再创建第 2–4 张 `LazyImage`，桌面布局和首图逻辑不变。
- 以每页 24 条、每条最多 3 张次要图片计算，10 页最多减少 720 个 `LazyImage` / IntersectionObserver 实例，50 页最多减少 3,600 个。该数值是上限模型，不等同于实际图片请求数。
- 页码追踪 Observer 改为单实例：追加页面时只观察新增卡片；结果移除或布局切换时只 `unobserve` 已离开 DOM 的节点，卸载或关闭追踪时才 `disconnect`。
- 旧实现的累计 `observe` 次数为 `24 × (1 + ... + n)`：10 页约 1,320 次，50 页约 30,600 次；新实现为 `24 × n`：10 页 240 次，50 页 1,200 次，分别减少约 81.8% 与 96.1%。
- 新增组件定向测试，确认追加结果时复用同一个 Observer、只观察新增节点，并确认移动端列表向条目传递“不创建次要图片”。
- PERF-401 反向确认列表卡片已经使用 `content-visibility: auto`，React 与 Query 仍保留全部历史结果。是否继续窗口化必须在真实 10/50 页场景采集 DOM 数、JS heap、长任务和滚动帧率后决定；本轮没有新增依赖或窗口化状态。
- TypeScript：通过。
- 定向 Vitest：3 个测试文件、5 条测试通过。
- 定向 ESLint：0 error、0 warning；仅输出本地 Browserslist 数据过期提示，没有为此升级依赖。
- Prettier 与 `git diff --check`：通过。
- 未执行真实浏览器 10/50 页堆内存、长任务与滚动帧率采集；PERF-401 保持开放，不以静态模型替代实测。

PERF-401 后续采用固定搜索条件、列表布局和正常图片模式，分别加载到 10 页与 50 页。每个节点先在控制台执行以下只读探针记录规模，再使用 Performance 面板录制同一段 20 秒往返滚动，并分别保存 Heap Snapshot：

```js
(() => {
  const cards = [...document.querySelectorAll("[data-result-page]")];
  return {
    loadedPages: new Set(cards.map((el) => el.dataset.resultPage)).size,
    resultCards: cards.length,
    imageElements: document.images.length,
    domNodes: document.querySelectorAll("*").length,
    jsHeapMB: performance.memory
      ? Math.round((performance.memory.usedJSHeapSize / 1024 / 1024) * 10) / 10
      : "当前浏览器不提供",
  };
})();
```

只有 50 页相对 10 页出现不可接受的堆增长、长任务或滚动掉帧，并且现有 `content-visibility` 不足以控制成本时，才进入窗口化方案设计。

## 7. 中央复核后排除或降级的扫描结论

以下结果不进入当前实施阶段，避免把扫描命中误当成优化事实：

- 搜索 Query Key 并未遗漏 `includeTags` / `excludeTags`；标签已编码在 `params.query` 中。
- Mascot 默认隐藏不等于资源无用；应用首次启动会执行 `reset()` 展示欢迎内容，图片通常立即需要。
- 通知 YAML 不能机械延迟到面板打开；`required` 公告可能需要在用户未打开通知中心时主动展示，必须先确认产品契约。
- 当前全局 CSS 约 28 KB gzip，没有足够证据证明它是加载瓶颈。
- AI Session 与 Zod 是否实际进入首屏，需要构建依赖图证据，暂不据此修改加载边界。
- `ThreadCard` / `ThreadListItem` 的局部派生值重复和赛事 Hook 别名主要是维护成本，尚无可观性能收益，不放入高优先级阶段。
- 不因卡片代码较长就合并 `ThreadCard` 与 `ThreadListItem`；两者布局目标不同，万能 variant 组件会增加分支和维护成本。

## 8. 实施顺序与停止条件

实施按完整大阶段推进，不拆成零散小修：

```text
阶段一 请求与实例重复
  ↓ 验证通过
阶段二 加载与视觉资源
  ↓ 自动化验证 + 人工视觉验收
阶段三 数据扇出
  ↓ 前后端边界确认
阶段四 长列表生命周期
  ↓ 10/50 页性能基准
```

每个阶段完成后更新本文件状态和实测结果，再进入下一阶段。若实施中发现需要新增依赖、改变后端协议、删除功能或引入虚拟化体系，应停止并重新确认，不能以“性能优化”为理由自动扩大范围。
