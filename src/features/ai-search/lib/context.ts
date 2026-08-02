import type { User } from '@/features/auth/api/authApi';
import type { UserPreferencesResponse } from '@/features/preferences/api/preferencesApi';
import { getDiscoveryPreferenceContext } from '@/features/preferences/lib/discoveryPreferences';
import type { ApiChannel } from '@/shared/hooks/useChannels';

export function buildAISearchContext({
  user,
  preferences,
  channels,
}: {
  user?: User;
  preferences?: UserPreferencesResponse | null;
  channels?: ApiChannel[] | null;
}) {
  const preference = getDiscoveryPreferenceContext(preferences);
  const preferredChannels = new Set(preference?.preferredChannelIds || []);
  const excludedTags = new Set(preference?.excludeTags || []);
  const visibleChannels = (channels || []).filter(
    (channel) => preferredChannels.size === 0 || preferredChannels.has(channel.channel_id),
  );

  const channelLines = visibleChannels.map((channel) => {
    const tags = Array.from(
      new Set([
        ...(channel.available_tags || []).map((tag) => tag.name),
        ...(channel.virtual_tags || []).map((tag) => tag.tag_name),
        ...(channel.mapped_source_channels || []).flatMap((source) =>
          (source.available_tags || []).map((tag) => tag.name),
        ),
      ]),
    ).filter((tag) => tag && !excludedTags.has(tag));

    return `- ${channel.name}（channel_id: ${channel.channel_id}）\n  可用 Tag: ${tags.length > 0 ? tags.join('、') : '暂无'}`;
  });

  return [
    '# 当前用户与搜索上下文',
    `用户: ${user?.global_name || user?.username || '未知用户'}`,
    `偏好频道: ${preferredChannels.size > 0 ? visibleChannels.map((channel) => channel.name).join('、') || '无可用频道' : '未限定，允许全频道搜索'}`,
    `偏好包含 Tag: ${preference?.includeTags.join('、') || '无'}`,
    `屏蔽 Tag: ${preference?.excludeTags.join('、') || '无'}`,
    `偏好作者 ID: ${preference?.includeAuthorIds.join('、') || '无'}`,
    `屏蔽作者 ID: ${preference?.excludeAuthorIds.join('、') || '无'}`,
    `偏好包含关键词: ${preferences?.include_keywords || '无'}`,
    `屏蔽关键词: ${preferences?.exclude_keywords || '无'}`,
    `当前日期: ${new Date().toLocaleDateString('sv-SE')}`,
    '',
    '# 当前可搜索频道与允许的 Tag',
    channelLines.join('\n') || '- 暂时没有取得频道目录；可以先使用关键词进行全频道搜索。',
    '',
    '搜索 API 会自动应用上述用户偏好。不要主动绕过屏蔽条件；用户明确要求改变搜索范围时，应先在回答中说明当前偏好的影响。',
  ].join('\n');
}
