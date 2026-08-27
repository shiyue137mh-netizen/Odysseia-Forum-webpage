# 测试与 CI

本项目使用 Vitest 4、jsdom 和 React Testing Library。Vitest 配置内嵌在
`vite.config.ts` 的 `test` 字段中，不存在单独的 `vitest.config.*`。

## 本地命令

`package.json` 当前提供：

- `pnpm test`：Vitest watch 模式，适合本地开发，不会自动退出；
- `pnpm test:run`：单次执行，使用 `dot` reporter；
- `pnpm test:coverage`：单次执行并使用 `@vitest/coverage-v8` 输出 text/json/html 报告；

Vitest UI 依赖 `@vitest/ui` 当前未安装，因此不列为可用的验证命令；`package.json` 中遗留的
`test:ui` 脚本不应作为项目流程使用。

测试环境为 `jsdom`，全局加载 `src/tests/setup.ts`。该文件在每个测试后执行 Testing Library
清理，并提供 `IntersectionObserver`、`ResizeObserver`、`matchMedia`、`window.scrollTo` 和
`Element.prototype.scrollTo` 的最小 stub。

## 测试编写

测试文件按就近原则放在被测代码旁，以 `.test.ts` 或 `.test.tsx` 结尾。需要 Router 和
React Query 的组件测试可以从 `src/tests/test-utils.tsx` 导入 `render`；它包装
`MemoryRouter`、`QueryClientProvider`，并关闭 query retry。纯函数、hook 或不需要这些 provider
的测试可以直接从 `@testing-library/react` 导入。

网络和外部模块应在测试中显式 mock（常见方式是 `vi.mock()` 和 mock `apiClient`）。项目当前没有
安装 MSW，也没有全局网络拦截器；不要把未配置的 MSW handler 当作测试基础设施。开发环境的
`VITE_API_MOCKING` 路由是应用调试功能，不等同于 Vitest 的网络 mock。

覆盖率配置使用 v8，排除 `node_modules/` 和 `src/tests/setup.ts`，没有设置 `include`；因此未被
测试导入的源文件不会自动进入分母，覆盖率数字不能直接当作全仓覆盖率。

## CI 门禁

`.github/workflows/ci.yml` 在 push 到 `main` 和 pull request 上运行，顺序为：

1. `pnpm typecheck` → `tsc -b`；
2. `pnpm lint` → ESLint，带 `--max-warnings 79`；
3. `pnpm lint:styles` → Stylelint 检查 `src/**/*.{css,tsx}`；
4. `pnpm test:run` → 单元测试；
5. `pnpm build` → `tsc -b && vite build`。

CI 使用干净 checkout，不包含被 `.gitignore` 排除的 `coverage/` 和 `playground/` 产物。项目当前的
ESLint `ignores` 没有同步排除这两个目录，因此本地若已经生成覆盖率报告或独立 Playground 的
构建产物，直接运行 `pnpm lint` 可能会扫描它们并报出与前端源码无关的错误；判断 CI 门禁前应先
区分报错文件是否属于 `src/` 和根目录受管脚本。

当前没有单独的浏览器端 E2E、视觉验收或依赖安全审计 job。自动化门禁通过不等于完成浏览器和
真实后端验收；涉及交互、布局、Cookie/OAuth 或 API 行为时，报告中要单独说明尚未覆盖的边界。
