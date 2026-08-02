import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useTournamentURLParams } from './useTournamentURLParams';

describe('useTournamentURLParams', () => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      MemoryRouter,
      { initialEntries: ['/tournaments?q=绘画&sort=3&page=2'] },
      children,
    );

  it('应该从 URL 恢复赛事关键词', () => {
    const { result } = renderHook(() => useTournamentURLParams(), { wrapper });

    expect(result.current.params.query).toBe('绘画');
    expect(result.current.params.page).toBe(2);
  });

  it('翻页时应该保留赛事关键词', () => {
    const { result } = renderHook(
      () => ({ tournaments: useTournamentURLParams(), location: useLocation() }),
      { wrapper },
    );

    act(() => result.current.tournaments.setParams({ page: 3 }));

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('q')).toBe('绘画');
    expect(params.get('page')).toBe('3');
  });

  it('更换关键词时应该回到第一页', () => {
    const { result } = renderHook(
      () => ({ tournaments: useTournamentURLParams(), location: useLocation() }),
      { wrapper },
    );

    act(() => result.current.tournaments.setParams({ query: '音乐' }));

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('q')).toBe('音乐');
    expect(params.get('page')).toBeNull();
  });
});
