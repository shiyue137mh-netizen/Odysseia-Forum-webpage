# 状态管理指南

本项目按数据所有权划分状态。服务器数据交给 TanStack React Query；跨组件的本地交互状态使用
Zustand；单组件开关和短暂输入优先使用 React 的 `useState`；可分享、可回退的搜索条件放在 URL。

## 服务器状态：React Query

API 请求函数位于各 feature 的 `api/`（底层客户端为 `src/shared/api/client.ts`），查询 hook 通常
位于同 feature 的 `hooks/`。列表、用户资料、偏好、频道和搜索结果等异步数据使用 `useQuery` 或
`useInfiniteQuery`，查询键集中在相邻 feature 的 `lib/queryKeys.ts`（如 `searchKeys`）。

各查询按数据性质设置 `staleTime`，并非所有查询共享一个全局固定值；常见列表为 60 秒，频道元数据
为 10 分钟，搜索建议为 30 秒。需要刷新时使用 query 的 `refetch` / invalidation，不要用
`useState + useEffect` 自行复制服务器缓存。

## 客户端状态：Zustand 与 React

当前长期存在的 store 包括：

- `src/shared/store/settingsStore.ts`：用户界面设置，保存至 `odysseia_user_settings`；
- `src/features/search/store/previewStore.ts`：帖子预览对象、延迟加载的 thread ID 和预览选项；
- `src/features/onboarding/store/useOnboardingStore.ts`：教程完成状态，持久化至
  `odysseia_onboarding_state`；
- `src/features/mascot/store/mascotStore.ts`、`src/features/easter-eggs/store/easterEggStore.ts`
  以及图片查看器 store：各自管理对应的 UI/彩蛋状态。

订阅 Zustand 时只选择当前组件需要的字段；需要同时读取多个字段时复用项目已有的浅比较方式。
普通组件内部的展开、悬浮和提交中状态不要为了共享而提升到 store。

帖子预览和搜索条件是两个独立边界：预览使用 `usePreviewStore`，搜索条件不放入已删除的
`searchStore`。

## URL 作为搜索状态

`src/features/search/hooks/useSearchParams.ts` 中的 `useSearchURLParams` 是搜索参数的唯一解析和
序列化入口。`q`、`channel`、`type`、排序、页码、标签逻辑等条件从 URL 派生，筛选面板通过回调
更新 URL。条件变化会重置页码；`tag_logic` 缺失时只在发起新搜索时读取
`odysseia_search_tag_logic` 作为初值，解析已有分享链接始终以 URL 为准。

`sessionStorage` / `localStorage` 可以保存草稿、显示偏好或本地 UI 设置，但不要在 effect 中把本地
值反向写回当前 URL，避免分享链接在不同设备产生不同结果。
