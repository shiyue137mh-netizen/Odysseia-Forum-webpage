# UI 样式与设计指南

项目使用 Tailwind CSS v4、CSS-first 配置和运行时 `--od-*` 主题变量。样式入口是
`src/shared/styles/globals.css`，它导入 `tokens.css`、基础样式、组件 surface 和 utility 文件，
并通过 `@theme`、`@plugin 'tailwindcss-animate'`、`@source` 配置 Tailwind。仓库没有
`tailwind.config.js`，不要重新引入一套 JS 配置。

## Token 与 surface

- 默认 token 在 `src/shared/styles/tokens.css`；主题切换由
  `src/app/themes/applyThemeTokens.ts` 写入颜色、字体、透明度和阴影等变量。
- 颜色、文本和边界优先使用 `--od-bg`、`--od-bg-secondary`、`--od-text-*`、`--od-accent`、
  `--od-border` 等语义变量，或对应的 Tailwind `text-od-*` / `bg-od-*` 类。第三方品牌色、
  明确的状态色和局部设计值可沿用现有组件模式；不要把所有字面量颜色都误写成禁止项。
- 现有 surface utility 包括 `od-app-shell`、`od-shell-surface`、`od-chrome-layer`、
  `od-chrome-surface`、`od-content-surface`、`od-floating-panel-solid`、`od-floating-glass`
  和 `od-operation-base`。优先复用它们，不重复声明相同的背景/边框组合。
- 背景图与透明度由 `WallpaperBackdrop` 和 `ThemeProvider` 协同处理；玻璃效果只在
  `glassMode` 有效且浏览器支持 `backdrop-filter` 时启用。内容可见性与文字颜色不应依赖玻璃效果。

## 排版、布局与动效

排版 token 包括 `--od-type-title`、`--od-type-section`、`--od-type-body`、`--od-type-meta` 和
`--od-weight-*`。用字号与字重建立层级，颜色只作为辅助。保持现有无框、流体布局倾向，避免无
必要的卡片套卡片和厚重边框。

基础过渡可使用 `tailwindcss-animate` 的 `animate-in`、`fade-in` 等 utility；复杂微交互复用已安装
的 `motion`（`motion/react`）。主题或页面切换可调用
`src/shared/lib/viewTransition.ts` 的 `withViewTransition`。动画应尊重
`prefers-reduced-motion`，并避免在大量列表节点上增加不必要的 layout 动画。

## 提交前检查

1. 是否复用了现有 token 和 surface utility，而不是复制主题颜色？
2. 是否保留键盘焦点、响应式布局和 reduced-motion 行为？
3. 是否只在需要时引入 `motion`，并避免扩大列表动画成本？
4. 是否通过 `pnpm lint:styles` 检查相关 CSS/TSX 样式？
