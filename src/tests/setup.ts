import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// 每次测试后自动清理 DOM
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// Mock ResizeObserver（jsdom 未实现；布局测量类组件依赖）
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock matchMedia（jsdom 未实现；主题/响应式 hook 依赖）
vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

// Mock scrollTo（jsdom 会对未实现的滚动调用抛 Not implemented）
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
Object.defineProperty(Element.prototype, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

