import { ThumbsUp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { setSingletonToken } from '@/shared/lib/searchTokenizer';

interface ReactionAchievement {
  label: string;
  minimum: number;
}

interface ThreadAchievementTagProps {
  reactionCount: number;
  variant: 'card' | 'list';
}

export function getReactionAchievement(reactionCount: number): ReactionAchievement | null {
  if (reactionCount >= 10_000) return { label: '万赞', minimum: 10_000 };
  if (reactionCount >= 1_000) return { label: '千赞', minimum: 1_000 };
  if (reactionCount >= 100) return { label: '百赞', minimum: 100 };
  return null;
}

export function ThreadAchievementTag({ reactionCount, variant }: ThreadAchievementTagProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const achievement = getReactionAchievement(reactionCount);

  if (!achievement) return null;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const params = location.pathname === '/search'
      ? new URLSearchParams(location.search)
      : new URLSearchParams();
    params.set(
      'q',
      setSingletonToken(params.get('q') || '', 'likes', `${achievement.minimum}+`).trim(),
    );
    params.delete('page');
    navigate(`/search?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={variant === 'card'
        ? 'inline-flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/8 px-2 py-0.5 text-[10px] font-medium text-amber-400 transition-colors hover:border-amber-400/45 hover:text-amber-300'
        : 'inline-flex shrink-0 items-center gap-1 font-medium text-amber-400 transition-colors hover:text-amber-300'}
      title={`筛选${achievement.label}作品（当前 ${reactionCount} 赞）`}
      aria-label={`筛选${achievement.label}作品，当前 ${reactionCount} 赞`}
    >
      <ThumbsUp className="h-3 w-3 shrink-0" />
      {achievement.label}
    </button>
  );
}
