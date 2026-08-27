# 暂停展示的视觉预设

本文是历史记录，不是当前可选项清单。归档项不会继续出现在当前生产选择列表；除非重新审查并
修改实现，否则不要把本文件中的配置、名称或资源当作当前 UI 契约。

## Sakura Day

- 设置 ID：`sakura-day`
- 主题键：`sakuraDay`
- 原展示名称：`Sakura Day`
- 原说明：`春樱明朝风，淡粉与叶绿`
- 下架时间：2026-08-07
- 下架原因：季节性主题暂时退场，计划在合适的春季重新启用

主题 Token 仍保留在 `src/shared/styles/themes.ts`，设置类型、旧值映射和浅色主题识别也继续
保留；但 `src/pages/SettingsPage/config.ts` 当前的 `themeOptions` 不包含它。已经在浏览器中
选择该主题的用户不会因下架丢失配置；这里只是不再向新用户展示选择入口。

如果未来决定恢复，必须先重新核对主题实现和产品需求，再在
`src/pages/SettingsPage/config.ts` 的 `themeOptions` 中加入类似以下选项：

```ts
{
  id: 'sakura-day',
  label: 'Sakura Day',
  themeKey: 'sakuraDay',
}
```

## 2026 夏季背景轮换

旧的 `spring.png`、`spring2.png`、`summer1.png`、`summer2.png`、`summer3.png` 与
`summer4.png` 已由资源维护者主动从仓库删除，原件另行保管，因此仓库内不再复制归档。
当前背景预设改用西幻集市、阳台花园、电车、雨天室内、学校天台、太空远望和自动贩卖机旁。
