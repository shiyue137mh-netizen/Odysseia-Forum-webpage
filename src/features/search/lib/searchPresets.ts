import { getNaturalDateRange } from '@/features/search/lib/naturalDateRanges';
import { setSingletonToken } from '@/shared/lib/searchTokenizer';

export const YESTERDAY_POPULAR_LABEL = '搜搜昨天百赞的帖子';

export function buildYesterdayPopularQuery(now = new Date()) {
  const range = getNaturalDateRange('yesterday', now);
  const withDate = setSingletonToken('', 'date', `${range.from}..${range.to}`);
  return setSingletonToken(withDate, 'likes', '100+');
}
