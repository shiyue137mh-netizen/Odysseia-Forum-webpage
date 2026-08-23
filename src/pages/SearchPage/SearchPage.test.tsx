import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/tests/test-utils';
import { SearchPage } from './index';
import {
  type SearchParams,
  useSearchURLParams,
} from '@/features/search/hooks/useSearchParams';

const mockUseSearchResults = vi.hoisted(() => vi.fn());

vi.mock('@/features/search/hooks/useSearchResults', () => ({
  useSearchResults: mockUseSearchResults,
}));

// Mock 子组件和动画以简化环境
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useInView: () => [null, true],
}));

// Mock 搜索 URL 钩子，以便观察参数变化
vi.mock('@/features/search/hooks/useSearchParams', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/search/hooks/useSearchParams')>()),
  useSearchURLParams: vi.fn(),
}));

const DEFAULT_PARAMS: SearchParams = {
  query: '',
  channel: null,
  type: 'thread',
  sortMethod: 'last_active_desc',
  sortOrder: 'desc',
  page: 1,
  includeTags: [],
  excludeTags: [],
  includeAuthors: [],
  excludeAuthors: [],
  tagLogic: 'and',
  timeFrom: '',
  timeTo: '',
  reactionMin: null,
  replyMin: null,
};

describe('SearchPage 交互测试', () => {
  const mockSetParams = vi.fn();
  const mockClearParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchResults.mockImplementation(({ params }) => ({
      discoveryPreferenceContext: null,
      hasSearchFilters: Boolean(params.query),
      ignoreDiscoveryPreferences: false,
      isPreferenceActive: false,
      queryState: { isLoading: false, isError: false, refetch: vi.fn() },
      infiniteQueryState: {
        data: undefined,
        hasNextPage: false,
        isFetchingNextPage: false,
      },
      loadedPageCount: 0,
      preparePageRequest: vi.fn(() => true),
      results: [],
      pageSize: 24,
      pageByThreadId: new Map(),
      requestNextPage: vi.fn(),
      reportViewedPage: vi.fn(),
      viewedPage: 1,
      setIgnoreDiscoveryPreferences: vi.fn(),
      totalResults: 0,
      visibleRateLimit: null,
    }));
    (useSearchURLParams as any).mockReturnValue({
      params: DEFAULT_PARAMS,
      setParams: mockSetParams,
      clearParams: mockClearParams,
      hasActiveFilters: false,
    });
  });

  it('切换到书单时应该更新搜索类型', async () => {
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: '书单' }));

    expect(mockSetParams).toHaveBeenCalledWith({ type: 'booklist' });
  });

  it('切换到赛事时应该更新搜索类型', async () => {
    render(<SearchPage />);

    fireEvent.click(screen.getByRole('button', { name: '赛事' }));

    expect(mockSetParams).toHaveBeenCalledWith({ type: 'tournament' });
  });

  it.each(['booklist', 'tournament'] as const)(
    '%s 模式禁用帖子搜索 Hook',
    (type) => {
      const nonThreadParams = { ...DEFAULT_PARAMS, type };
      vi.mocked(useSearchURLParams).mockReturnValue({
        params: nonThreadParams,
        setParams: mockSetParams,
        clearParams: mockClearParams,
        hasActiveFilters: false,
      });

      render(<SearchPage />);

      expect(mockUseSearchResults).toHaveBeenCalledWith(expect.objectContaining({
        params: nonThreadParams,
        enabled: false,
      }));
    },
  );

  it('点击清除所有筛选时应该恢复默认搜索参数', async () => {
    // 模拟有活动筛选的状态
    (useSearchURLParams as any).mockReturnValue({
      params: { ...DEFAULT_PARAMS, query: '已有搜索' },
      setParams: mockSetParams,
      clearParams: mockClearParams,
      hasActiveFilters: true,
    });

    render(<SearchPage />);

    const clearButton = screen.getByText('清除所有筛选');
    fireEvent.click(clearButton);

    expect(mockSetParams).toHaveBeenCalledWith({
      query: '',
      sortMethod: 'last_active_desc',
      sortOrder: 'desc',
      page: 1,
      tagLogic: 'and',
    });
  });
});
