# 前端安全要求

安全边界以当前实现为准。前端校验不能替代后端的认证、授权、输入校验和跨站请求防护。

## XSS 与 Markdown

- 普通 JSX 插值由 React 转义；不要把不可信字符串拼入原始 HTML、URL 或脚本上下文。
- `src/shared/ui/MarkdownText.tsx` 使用项目内的有限 Markdown 解析器。解析前会转义文本和属性，
  只为解析出的结构生成 HTML；链接通过 `src/shared/lib/urlSafety.ts` 只接受 `http:` / `https:`，
  并在非 Discord 域名跳转前显示 `ExternalLinkWarningDialog`。
- `MarkdownText` 当前确实使用 `dangerouslySetInnerHTML`，但仅用于上述生成结果。修改解析器时必须
  保持“先转义、后生成受控标签”的顺序，并补充 `src/shared/ui/MarkdownText.test.tsx` 的危险协议、
  链接和代码块测试。不要直接把后端原文传给 `dangerouslySetInnerHTML`。
- `DiscordMarkdownText` 使用 React 节点渲染行内格式，同样只接受 `http(s)` 链接。

## 认证、存储与请求

`src/shared/api/client.ts` 默认启用 `withCredentials`，优先使用后端 Cookie 会话；当 Cookie 不可用
且浏览器有 `auth_token` 时，`authApi` 会回退到 `Authorization: Bearer ...`。登录 token 和
认证头开关存储在 `localStorage`，因此 XSS 一旦成立可能导致 token 被窃取；不要在前端日志、错误
提示或分析事件中输出 token。

使用 Cookie 的请求不能仅凭“Authorization 备用机制”宣称天然免疫 CSRF。服务端必须继续负责
Cookie 属性、CORS 和必要的 CSRF 校验；前端新增写操作时应沿用现有 `apiClient`，不要绕过认证和
错误处理拦截器。

登录跳转和回调只接受 `src/shared/lib/navigationSafety.ts` 允许的站内路径，不能把任意外部 URL
直接放入 redirect 参数。

## 依赖与验证

生产依赖、构建脚本和锁文件的变更需要单独审查。当前 CI（`.github/workflows/ci.yml`）没有配置
自动化依赖安全审计门禁；本文件不把未配置的 `audit` 命令当成项目契约。涉及解析器、认证、URL
处理或存储时，至少运行对应定向测试，并如实记录未覆盖的浏览器/后端边界。
