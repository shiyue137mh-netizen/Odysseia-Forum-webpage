import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StaticNotificationDefinition } from '@/features/notifications/notificationsConfig';
import {
  isAnnouncementContentAtEnd,
  NotificationAnnouncementModal,
} from './NotificationAnnouncementModal';

vi.mock('@/shared/hooks/useSettings', () => ({
  useThemeSettings: () => ({ backgroundImageEnabled: false }),
}));

vi.mock('@/shared/ui/MarkdownText', () => ({
  MarkdownText: ({ text }: { text: string }) => <p>{text}</p>,
}));

const notification: StaticNotificationDefinition = {
  id: 'mobile-scroll-test',
  kind: 'release',
  title: '关注功能更新',
  message: '关注功能更新',
  created_at: '2026-08-28T10:00:00Z',
  starts_at: '2026-08-28T10:00:00Z',
  expires_at: null,
  presentation: 'required',
  acknowledgement: '我已了解并关注',
  content: {
    title: '关注喜欢的作者与作品',
    message: '公告正文',
    tags: ['关注'],
    virtual_tags: [],
    thumbnail_urls: [],
    author: {
      name: 'Odysseia Web Team',
      avatar_url: null,
    },
  },
};

describe('NotificationAnnouncementModal', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.setAttribute('open', '');
    });
  });

  it('移动端无配图公告也会把内容区约束在弹窗高度内', () => {
    render(
      <NotificationAnnouncementModal
        notification={notification}
        required
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.firstElementChild).toHaveClass('max-md:h-full');
  });

  it('普通弹出通知保留确认文案，但不强制阅读到底', () => {
    render(
      <NotificationAnnouncementModal
        notification={{ ...notification, presentation: 'popup' }}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: '我已了解并关注' }),
    ).toBeEnabled();
  });

  it('不可操作的短尾部直接视为读到底，较长内容仍需滚动', () => {
    expect(
      isAnnouncementContentAtEnd({
        clientHeight: 600,
        scrollHeight: 620,
        scrollTop: 0,
      }),
    ).toBe(true);
    expect(
      isAnnouncementContentAtEnd({
        clientHeight: 600,
        scrollHeight: 660,
        scrollTop: 0,
      }),
    ).toBe(false);
    expect(
      isAnnouncementContentAtEnd({
        clientHeight: 600,
        scrollHeight: 660,
        scrollTop: 36,
      }),
    ).toBe(true);
  });
});
