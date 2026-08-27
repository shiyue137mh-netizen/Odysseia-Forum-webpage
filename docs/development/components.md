# 组件开发指南

本项目是 React 19 + TypeScript + Vite 8 前端。组件按当前代码的 FSD 分层组织在
`src/app`、`src/pages`、`src/widgets`、`src/features`、`src/entities`、`src/shared`
下；不要凭本指南新建另一套 `components/` 目录层级。

## 组件与分层

- 页面入口放在 `src/pages`，页面级组合放在 `src/widgets`，业务能力放在
  `src/features`，领域展示放在 `src/entities`，通用能力放在 `src/shared`。
- `eslint.config.js` 对 `shared < entities < features < widgets < pages < app` 的上层引用
  设有 `no-restricted-imports` 检查；当前存量违规按 warning 计入 lint 棘轮，不要新增跨层引用。
- 新组件先复用相邻层已有实现。测试文件按就近原则放置，使用 `.test.ts` 或 `.test.tsx`。

React 19 支持把 `ref` 作为普通 prop 传递，但仓库仍有 `Checkbox`、`DiscordIcon` 等
使用 `forwardRef` 的公共组件。新增组件按实际 API 需要选择，不把 `forwardRef` 视为全局禁用项。
仓库当前没有统一使用 `useActionState` 的表单约定；已有表单主要使用普通 `onSubmit`，部分表单
使用 `react-hook-form`。

## 样式与动画

- 类名合并使用现有的 `src/shared/lib/utils.ts` 中的 `cn()`（需要处理条件类名时）。
- 主题 token 的默认值在 `src/shared/styles/tokens.css`，Tailwind v4 的入口、`@theme`、
  `@plugin` 和 `@source` 在 `src/shared/styles/globals.css`；运行时主题由
  `src/app/themes/applyThemeTokens.ts` 写入 `--od-*` 变量。
- 优先使用 `--od-*` 语义变量或现有 `od-*` surface utility。局部、明确的状态色和第三方品牌色
  可以按组件现有模式使用，不把“禁止任何字面量颜色”当作实现契约。
- 基础进出场可使用 `tailwindcss-animate` 提供的 `animate-in` 等类；复杂微交互继续复用已安装的
  `motion`（导入路径为 `motion/react`）。页面/主题切换可复用
  `src/shared/lib/viewTransition.ts` 的 `withViewTransition`。

## URL、引导与浮层

搜索筛选面板 `src/features/search/components/SearchFilterPanel.tsx` 是受控组件：筛选值由
`useSearchURLParams` 派生，组件通过回调通知外部更新，不在面板内部复制 URL 状态。

新手引导只对明确需要的节点添加 `data-tour`，目标选择器在
`src/features/onboarding/lib/tutorials.ts` 维护，并由 `OnboardingManager` 使用
`document.querySelector` 查找。不要给所有基础组件默认添加引导属性，也不要使用文档示例中的
虚构 prop 覆盖现有组件 API。

浮层按实际行为选用原生 `<dialog>` 或 `createPortal`：仓库两种模式并存。原生 dialog 需要正确处理
`showModal()`、`onCancel` 和关闭清理；Portal 浮层需要自行处理焦点、Esc、滚动或层级等它实际承担的
职责。先复用相邻组件，不为统一外观重写稳定实现。

## 最小自检

1. 导入是否遵守分层边界，Props 是否表达了真实 API？
2. 是否复用了现有 token、utility、状态和浮层实现？
3. 键盘、焦点、响应式和 reduced-motion 行为是否符合组件实际需求？
4. 非平凡行为是否有相邻的 Vitest/Testing Library 测试？
