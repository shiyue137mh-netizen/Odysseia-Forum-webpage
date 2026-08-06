# 暂停展示的视觉预设

本文记录暂时从设置页下架、但仍保留实现的主题。归档项不会继续出现在当前生产选择列表，
需要时可以按记录恢复，不必重新调色。

## Sakura Day

- 设置 ID：`sakura-day`
- 主题键：`sakuraDay`
- 原展示名称：`Sakura Day`
- 原说明：`春樱明朝风，淡粉与叶绿`
- 下架时间：2026-08-07
- 下架原因：季节性主题暂时退场，计划在合适的春季重新启用

主题 Token 仍保留在 `src/shared/styles/themes.ts`，设置类型、旧值映射和浅色主题识别也继续
保留。已经在浏览器中选择该主题的用户不会因本次下架丢失配置；这里只是不再向新用户展示
选择入口。

恢复时，在 `src/pages/SettingsPage/config.ts` 的 `themeOptions` 中重新加入：

```ts
{
  id: 'sakura-day',
  label: 'Sakura Day',
  icon: Sun,
  themeKey: 'sakuraDay',
  description: '春樱明朝风，淡粉与叶绿',
}
```

## 2026 夏季背景轮换

旧的 `spring.png`、`spring2.png`、`summer1.png`、`summer2.png`、`summer3.png` 与
`summer4.png` 已由资源维护者主动从仓库删除，原件另行保管，因此仓库内不再复制归档。
当前背景预设改用西幻集市、阳台花园、电车、雨天室内、学校天台、太空远望和自动贩卖机旁。

