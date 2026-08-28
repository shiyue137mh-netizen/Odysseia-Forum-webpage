import { Bell } from 'lucide-react';

import type { Thread } from '@/entities/thread/types';

interface ThreadStatusBadgesProps {
    viewerFlags?: Thread['viewer_flags'];
    variant?: 'card' | 'list' | 'detail';
    className?: string;
}

export function ThreadStatusBadges({
    viewerFlags,
    variant = 'card',
    className = ''
}: ThreadStatusBadgesProps) {
    const isFollowing = viewerFlags?.includes('followed') ?? false;
    const hasUpdate = viewerFlags?.includes('unread') ?? false;
    if (!isFollowing && !hasUpdate) return null;

    // Default to card/list size, slightly larger for detail
    const sizeClasses = variant === 'detail' ? 'h-6 w-6' : 'h-[22px] w-[22px]';
    const newBadgeClasses = variant === 'detail' ? 'h-6 min-w-10 text-[9px]' : 'h-[22px] min-w-8 text-[8px]';
    const iconSizes = variant === 'detail' ? 'h-3.5 w-3.5' : 'h-3 w-3';

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {hasUpdate && (
                <div 
                    className={`relative z-10 flex items-center justify-center rounded-full bg-[#23a55a] px-1.5 font-black tracking-[0.08em] text-white shadow-xs animate-in fade-in zoom-in duration-300 ${newBadgeClasses}`}
                    title="该帖子有新的更新"
                >
                    NEW
                </div>
            )}
            {isFollowing && (
                <div 
                    className={`relative z-0 flex items-center justify-center rounded-full bg-(--od-accent) text-white shadow-xs animate-in fade-in zoom-in duration-300 delay-75 ${sizeClasses}`}
                    title="你已关注此帖子"
                >
                    <Bell className={`${iconSizes} fill-current`} />
                </div>
            )}
        </div>
    );
}
