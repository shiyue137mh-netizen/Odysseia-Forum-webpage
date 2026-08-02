import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchReleaseNotifications } from './notificationsConfig';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchReleaseNotifications', () => {
  it('旧通知默认进入通知中心，并映射为独立公告内容', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`
updates:
  - id: notice-1
    kind: announcement
    title: 简短通知
    message: 摘要
    created_at: 2026-08-01T00:00:00.000Z
    preview_thread:
      title: 完整公告
      first_message_excerpt: 正文
      author:
        display_name: Odysseia Team
`));

    const [notification] = await fetchReleaseNotifications({ currentAppVersion: '1.0.0' });

    expect(notification.presentation).toBe('inbox');
    expect(notification.content.title).toBe('完整公告');
    expect(notification.content.message).toBe('正文');
    expect(notification.content.author.name).toBe('Odysseia Team');
  });

  it('只接受 required 强制模式，并提供确认文案兜底', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`
updates:
  - id: required-1
    kind: maintenance
    title: 重要公告
    message: 请阅读
    created_at: 2026-08-01T00:00:00.000Z
    presentation: required
    acknowledgement: 已阅读并了解
  - id: invalid-1
    kind: announcement
    title: 普通公告
    message: 普通正文
    created_at: 2026-07-31T00:00:00.000Z
    presentation: unknown
`));

    const notifications = await fetchReleaseNotifications({ currentAppVersion: '1.0.0' });

    expect(notifications[0].presentation).toBe('required');
    expect(notifications[0].acknowledgement).toBe('已阅读并了解');
    expect(notifications[1].presentation).toBe('inbox');
    expect(notifications[1].acknowledgement).toBe('我已了解');
  });
});
