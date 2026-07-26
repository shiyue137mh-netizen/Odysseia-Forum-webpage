# 🧪 测试与自动化检测 (Testing & CI)

本项目的前端采用 **Vitest** 结合 **React Testing Library** 作为测试套件。Vitest 与 Vite 共享同一套配置，具备极快的执行速度和原生 ESM 支持。

## 1. 测试运行规范

在 `package.json` 中配置了以下快捷指令：

- `pnpm test`: 执行全部测试并在文件改变时热更新 (Watch 模式)。**注意它不会自己退出**，CI 与脚本里不要用。
- `pnpm test:run`: 单次运行，跑完即退出。CI 用的就是这条。
- `pnpm test:ui`: 启动提供可视化的测试管理面板 (Vitest UI)。
- `pnpm test:coverage`: 执行单次测试并输出基于 `v8` 引擎的代码覆盖率报告。

> Vitest 4 已移除 `basic` reporter，`--reporter=basic` 会直接启动失败。`test:run` 用的是 `dot`。

## 2. 单元测试编写指南

### 2.1 引入 `test-utils`，而非原生库

由于我们的组件常常依赖路由 (`useNavigate`) 和状态缓存 (`useQuery`)，使用默认的 renders 会立刻报错。
我们封装了一个全局包含 Context Provider 的工具函数：

✅ 正确用法:

```tsx
// 从内部的 custom render 工具统一导入，不要从 '@testing-library/react' 导入
import { render, screen } from "@/tests/test-utils";
import MyComponent from "./MyComponent";

test("它应该成功渲染", () => {
  render(<MyComponent />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

### 2.2 测试文件的位置约定

测试文件应遵循 **就近原则 (Colocation)**，将其放置在被测试组件的同一层级文件夹内，并以 `.test.tsx` 或 `.spec.ts` 结尾。
例如：

```text
src/features/auth/
 ├── LoginForm.tsx
 ├── LoginForm.test.tsx  <-- 这个文件就是 LoginForm 的测试
 └── hooks/useAuth.ts
```

## 3. Mock 机制 (网络请求与外部依赖)

测试时不应真的发起网络请求。目前采用的是 **Hook 级别的 mock**：用 Vitest 原生的 `vi.mock()` 直接拦截自定义 hook 或 api 模块的返回值。

`src/tests/setup.ts` 目前只 stub 了 `IntersectionObserver`。

> ⚠️ **已知缺口**（2026-07-26 审查）：
>
> - **项目并没有安装 MSW。** 少数组件测试仍会让 axios 真的发起 XHR，靠「请求必然失败 → 走静态兜底」这条路径通过（运行日志里的 `AxiosError: Network Error` 就是它）。要么引入 msw，要么在 setup 里全局 stub `apiClient`。
> - ~~`setup.ts` 缺 `ResizeObserver` / `matchMedia` / `scrollTo` 的 stub~~（2026-07-26 已补齐，与 `IntersectionObserver` stub 对齐）。
> - `coverage` 没有配 `include`，未被 import 的源文件不计入分母，**覆盖率数字偏高**。

## 4. CI 流水线

`.github/workflows/ci.yml` 在每次 push 到 main 与每个 PR 上运行，五道门禁**全部必须通过**：

1. `pnpm typecheck` — `tsc -b`
2. `pnpm lint` — ESLint，带 `--max-warnings` 棘轮基线
3. `pnpm lint:styles` — Stylelint
4. `pnpm test:run` — 单元测试
5. `pnpm build` — 编译产物

### 关于 lint 的棘轮基线

`pnpm lint` 的 `--max-warnings <N>` 是**当前存量 warning 的数量**，不是 0。这样做是为了在不阻塞开发的前提下防止新增：任何新 warning 都会让总数超过 N 从而 CI 失败。

修掉一批 warning 之后，请顺手把 `package.json` 里的这个数字**调低到新的实际值**——否则棘轮就松了。最终目标是降到 0 并去掉这个参数。
