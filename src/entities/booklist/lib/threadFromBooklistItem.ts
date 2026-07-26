import type { BooklistItem } from "@/entities/booklist/types";
import type { Thread } from "@/entities/thread/types";

/**
 * 把书单/赛事条目转成 Thread，供 ThreadCard / ThreadListItem 直接渲染。
 * 赛事等场景的差异字段（is_tournament、tournament_info_list）通过 extra 覆盖。
 */
export function threadFromBooklistItem(
  item: BooklistItem,
  extra?: Partial<Thread>,
): Thread {
  return {
    thread_id: item.thread_id,
    guild_id: item.guild_id,
    channel_id: item.channel_id,
    title: item.title,
    author: item.author,
    created_at: item.created_at,
    last_active_at: item.last_active_at || item.created_at,
    reaction_count: item.reaction_count,
    reply_count: item.reply_count,
    display_count: item.display_count || 0,
    first_message_excerpt: item.first_message_excerpt || null,
    tags: item.tags || [],
    virtual_tags: item.virtual_tags || [],
    thumbnail_urls: item.thumbnail_urls || [],
    collected_flag: item.collected_flag,
    collection_count: item.collection_count || 0,
    ...extra,
  };
}
