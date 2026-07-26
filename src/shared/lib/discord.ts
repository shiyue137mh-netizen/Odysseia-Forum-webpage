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

