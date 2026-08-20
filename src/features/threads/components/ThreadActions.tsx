import { Tooltip } from '@/shared/ui/Tooltip';
import { DiscordIcon } from '@/shared/ui/icons/DiscordIcon';
import { AnimatedIcon } from '@/shared/ui/animation/AnimatedIcon';
import { useState } from 'react';
import {
    buildDiscordAppThreadUrl,
    buildDiscordWebThreadUrl,
} from '@/shared/lib/discord';
import { openDiscordWithFallback } from '@/features/threads/lib/openDiscordWithFallback';
import { useOpenModeSetting } from '@/shared/hooks/useSettings';

interface ThreadActionsProps {
    threadId: string;
    channelId?: string;
    guildId?: string;
    size?: 'sm' | 'md';
    variant?: 'default' | 'white' | 'glass';
    alwaysVisible?: boolean;
    className?: string;
    externalUrlOverride?: string | null;
}

/**
 * 帖子跳转按钮组件 - 根据全局设置决定跳转 APP 还是 WEB
 * variant: 
 *  - 'default': 主题色，用于普通背景
 *  - 'white': 白色，用于深色背景/图片上
 *  - 'glass': 毛玻璃圆形按钮，用于卡片封面悬浮（与刷新按钮一致）
 */
export function ThreadActions({ threadId, channelId, guildId, size = 'md', variant = 'default', alwaysVisible = false, className, externalUrlOverride }: ThreadActionsProps) {
    const [isHovered, setIsHovered] = useState(false);
    const openMode = useOpenModeSetting();

    const webUrl = externalUrlOverride || buildDiscordWebThreadUrl({
        guildId,
        channelId,
        threadId,
    });
    const appUrl = externalUrlOverride ? null : buildDiscordAppThreadUrl({
        guildId,
        channelId,
        threadId,
    });

    const targetUrl = openMode === 'app' && appUrl ? appUrl : webUrl;
    const tooltipContent = externalUrlOverride
        ? '打开 Discord 链接'
        : openMode === 'app' ? '用 Discord App 打开' : '在 Discord 网页端打开';
    const linkTarget = openMode === 'web' || externalUrlOverride ? '_blank' : undefined;
    const linkRel = linkTarget ? 'noopener noreferrer' : undefined;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation();
        if (openMode === 'app' && appUrl) {
            e.preventDefault();
            openDiscordWithFallback({
                appUrl,
                webUrl,
                openMode,
            });
        }
    };

    // 样式配置
    const sizeClasses = {
        sm: {
            button: 'p-1.5',
            icon: 'h-3.5 w-3.5',
        },
        md: {
            button: 'p-2',
            icon: 'h-4 w-4',
        },
    };

    // Glass 变体强制使用特定尺寸和样式（覆盖 size 属性）
    if (variant === 'glass') {
        return (
            <Tooltip content={tooltipContent} position="left">
                <a
                    href={targetUrl}
                    target={linkTarget}
                    rel={linkRel}
                    onClick={handleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 ${className || ''}`}
                    aria-label={tooltipContent}
                >
                    <AnimatedIcon icon={DiscordIcon} className="h-4 w-4" animation="shake" isHovered={isHovered} />
                </a>
            </Tooltip>
        );
    }

    const classes = sizeClasses[size];

    // 颜色样式
    const colorClasses = variant === 'white'
        ? 'text-white/80 hover:text-white hover:bg-white/10'
        : 'text-(--od-text-tertiary) hover:text-(--od-text-primary) hover:bg-(--od-bg-tertiary)';

    // 可见性样式
    const visibilityClasses = alwaysVisible
        ? 'opacity-100 translate-y-0'
        : 'md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0';

    return (
        <div className={`flex items-center ${className || ''}`}>
            <Tooltip content={tooltipContent} position="left">
                <a
                    href={targetUrl}
                    target={linkTarget}
                    rel={linkRel}
                    onClick={handleClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`flex items-center justify-center rounded-md transition-all duration-200 ${classes.button} ${colorClasses} ${visibilityClasses}`}
                    aria-label={tooltipContent}
                >
                    <AnimatedIcon icon={DiscordIcon} className={classes.icon} animation="shake" isHovered={isHovered} />
                </a>
            </Tooltip>
        </div>
    );
}
