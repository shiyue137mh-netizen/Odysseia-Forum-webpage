const DISCORD_WEB_BASE = 'https://discord.com';

interface DiscordThreadLinkOptions {
    guildId?: string | null;
    // Forum post/thread links use threadId as the route channel segment; this is the parent channel id.
    channelId?: string | null;
    threadId: string;
    messageId?: string | null;
}

export type DiscordOpenMode = 'app' | 'web';

interface DiscordChannelLinkOptions {
    guildId?: string | null;
    channelId: string;
}

function resolveDiscordLinkSegments({ guildId, threadId }: DiscordThreadLinkOptions) {
    const normalizedGuildId = guildId || import.meta.env.VITE_GUILD_ID || '@me';

    return {
        guildId: normalizedGuildId,
        threadId,
    };
}

export function buildDiscordWebThreadUrl(options: DiscordThreadLinkOptions): string {
    const { guildId, threadId } = resolveDiscordLinkSegments(options);
    const messagePath = options.messageId ? `/${options.messageId}` : '';
    return `${DISCORD_WEB_BASE}/channels/${guildId}/${threadId}${messagePath}`;
}

export function buildDiscordAppThreadUrl(options: DiscordThreadLinkOptions): string {
    const { guildId, threadId } = resolveDiscordLinkSegments(options);
    const messagePath = options.messageId ? `/${options.messageId}` : '';
    return `discord://-/channels/${guildId}/${threadId}${messagePath}`;
}

export function buildDiscordThreadUrl(options: DiscordThreadLinkOptions, openMode: DiscordOpenMode): string {
    return openMode === 'app'
        ? buildDiscordAppThreadUrl(options)
        : buildDiscordWebThreadUrl(options);
}

interface DiscordPublishedMessageLinkOptions {
    openMode: DiscordOpenMode;
    webUrl?: string | null;
    guildId?: string | null;
    threadId?: string | null;
    messageId?: string | null;
}

export function resolveDiscordPublishedMessageUrl({
    openMode,
    webUrl,
    guildId,
    threadId,
    messageId,
}: DiscordPublishedMessageLinkOptions): string | null {
    if (openMode === 'app' && guildId && threadId) {
        return buildDiscordAppThreadUrl({ guildId, threadId, messageId });
    }

    return webUrl || null;
}

function resolveDiscordChannelSegments({ guildId, channelId }: DiscordChannelLinkOptions) {
    const normalizedGuildId = guildId || import.meta.env.VITE_GUILD_ID || '@me';

    return {
        guildId: normalizedGuildId,
        channelId,
    };
}

export function buildDiscordWebChannelUrl(options: DiscordChannelLinkOptions): string {
    const { guildId, channelId } = resolveDiscordChannelSegments(options);
    return `${DISCORD_WEB_BASE}/channels/${guildId}/${channelId}`;
}

export interface OpenDiscordTargetOptions {
    appUrl?: string | null;
    webUrl: string;
    openMode: DiscordOpenMode;
    fallbackTimeoutMs?: number;
    onFallback?: (context: { webUrl: string }) => void;
}

/**
 * 打开 Discord 目标：
 * - 当 openMode 为 web 时，直接在浏览器新标签页打开；
 * - 当 openMode 为 app 时，尝试通过 DeepLink 唤端。若 1.5~2s 未离开页面/未失焦，触发 onFallback 回调。
 */
export function openDiscordTarget(options: OpenDiscordTargetOptions): void {
    const { appUrl, webUrl, openMode, fallbackTimeoutMs = 1800, onFallback } = options;

    if (openMode !== 'app' || !appUrl) {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    let hasPageLeft = false;
    const markPageLeft = () => {
        hasPageLeft = true;
    };

    document.addEventListener('visibilitychange', markPageLeft);
    window.addEventListener('blur', markPageLeft);
    window.addEventListener('pagehide', markPageLeft);

    const startTime = Date.now();

    // 触发 App 唤起
    try {
        window.location.href = appUrl;
    } catch {
        // 如果直接抛错，立即降级
        hasPageLeft = false;
    }

    window.setTimeout(() => {
        document.removeEventListener('visibilitychange', markPageLeft);
        window.removeEventListener('blur', markPageLeft);
        window.removeEventListener('pagehide', markPageLeft);

        // 如果定时器触发时页面没有隐藏或失焦，且未被系统挂起
        const isStillHere = !hasPageLeft && !document.hidden && document.visibilityState === 'visible';
        const elapsed = Date.now() - startTime;

        if (isStillHere && elapsed < fallbackTimeoutMs + 1500) {
            onFallback?.({ webUrl });
        }
    }, fallbackTimeoutMs);
}

