import { useState } from 'react';

/**
 * 列表入场动画开关的挂载快照。
 * 挂载瞬间还在加载（无缓存数据）→ 播入场动画；缓存直出 → 跳过，
 * 用户看过的内容不该再"浮现"一次。快照定死后不随 refetch 翻转，
 * 避免已显示的卡片中途重播动画。
 */
export function useListEntranceAnimation(isLoadingAtMount: boolean): boolean {
  const [animateIn] = useState(isLoadingAtMount);
  return animateIn;
}
