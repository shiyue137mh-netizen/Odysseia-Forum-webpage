export const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';
export const DISCORD_WEB_BASE = 'https://discord.com';

export interface DiscordUser {
    id: string;
    avatar?: string | null;
    discriminator?: string;
}

/**
 * 获取 Discord 用户头像 URL
 * @param user 用户对象 (包含 id 和 avatar)
 * @param size 头像大小 (默认 128)
 * @returns 头像 URL
 */
export function getAvatarUrl(user: DiscordUser, size: number = 128): string {
    if (user.avatar) {
        const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
        return `${DISCORD_CDN_BASE}/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
    }

    // 默认头像逻辑
    // Discord 默认头像计算方式: (user_id >> 22) % 6
    let index: number;
    try {
        index = Number((BigInt(user.id) >> 22n) % 6n);
    } catch {
        // 如果 ID 不是纯数字（例如 mock 数据），使用简单的 hash
        index = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;
    }
    return `${DISCORD_CDN_BASE}/embed/avatars/${index}.png`;
}

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

export function buildDiscordAppChannelUrl(options: DiscordChannelLinkOptions): string {
    const { guildId, channelId } = resolveDiscordChannelSegments(options);
    return `discord://-/channels/${guildId}/${channelId}`;
}
