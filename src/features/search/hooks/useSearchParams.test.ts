import { describe, it, expect } from 'vitest';
import { parseParams, serializeParams } from './useSearchParams';

describe('useSearchParams URL 协议层', () => {
  describe('parseParams', () => {
    it('对于空 URL 参数应该返回默认值', () => {
      const sp = new URLSearchParams('');
      const params = parseParams(sp);
      expect(params.query).toBe('');
      expect(params.sortMethod).toBe('last_active_desc');
      expect(params.includeTags).toEqual([]);
    });

    it('应该能解析查询词和频道', () => {
      const sp = new URLSearchParams('q=hello&channel=tech');
      const params = parseParams(sp);
      expect(params.query).toBe('hello');
      expect(params.channel).toBe('tech');
      expect(params.sortMethod).toBe('relevance');
    });

    it('应该能解析查询词里的标签 Token', () => {
      const sp = new URLSearchParams('q=$tag:AI$ $tag:LLM$ -$tag:Spam$');
      const params = parseParams(sp);
      expect(params.includeTags).toEqual(['AI', 'LLM']);
      expect(params.excludeTags).toEqual(['Spam']);
    });

    it('应该从 q token 解析日期和互动筛选', () => {
      const sp = new URLSearchParams();
      sp.set('q', '$date:2026-07-01..2026-08-01$ $likes:1000+$ $replies:100+$');
      const params = parseParams(sp);
      expect(params.timeFrom).toBe('2026-07-01');
      expect(params.timeTo).toBe('2026-08-01');
      expect(params.reactionMin).toBe(1000);
      expect(params.replyMin).toBe(100);
    });

    it('应该能处理非法的排序方式并回退到默认值', () => {
      const sp = new URLSearchParams('sort=invalid_sort');
      const params = parseParams(sp);
      expect(params.sortMethod).toBe('last_active_desc');
    });

    it('应该能正确解析排序方式', () => {
      const sp = new URLSearchParams('sort=created_desc');
      const params = parseParams(sp);
      expect(params.sortMethod).toBe('created_desc');
    });
  });

  describe('serializeParams', () => {
    it('空属性不应该被序列化到 URL', () => {
      const sp = serializeParams({ query: '' });
      expect(sp.toString()).toBe('');
    });

    it('默认值不应该被序列化到 URL 以保持简洁', () => {
      const sp = serializeParams({ sortMethod: 'last_active_desc', tagLogic: 'and' });
      expect(sp.toString()).toBe('');
    });

    it('标签数组不应该脱离 q token 单独序列化', () => {
      const sp = serializeParams({ includeTags: ['A', 'B'] });
      expect(sp.toString()).toBe('');
    });

    it('不应该继续序列化旧日期参数', () => {
      const sp = serializeParams({ timeFrom: '2026-07-01', timeTo: '2026-08-01' });
      expect(sp.toString()).toBe('');
    });

    it('合并参数后的完整序列化', () => {
      const sp = serializeParams({
        query: 'search',
        channel: 'news',
        sortMethod: 'relevance',
        tagLogic: 'or'
      });
      expect(sp.get('q')).toBe('search');
      expect(sp.get('channel')).toBe('news');
      expect(sp.get('sort')).toBe('relevance');
      expect(sp.get('tag_logic')).toBe('or');
    });
  });
});
