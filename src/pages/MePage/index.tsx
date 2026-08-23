import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Bookmark,
  Eye,
  Settings2,
} from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { FakeCaptchaEntry } from "@/features/easter-eggs/components/FakeCaptchaEntry";
import {
  useFollowsFeed,
  useUnfollowThread,
} from "@/features/follows/hooks/useFollowsData";
import type { Booklist } from "@/entities/booklist/types";
import {
  useCollectedBooklistsList,
  useCreateBooklist,
  useDeleteBooklist,
  useMyBooklistsList,
  useToggleBooklistCollection,
  useUpdateBooklist,
} from "@/features/booklists/hooks/useBooklistsData";
import { BooklistFormModal } from "@/features/booklists/components/BooklistFormModal";
import { usePreviewThread } from "@/features/search/hooks/usePreviewThread";
import { useUserPreferences } from "@/features/preferences/hooks/useUserPreferences";
import {
  toPreferencesFormValue,
  toPreferencesUpdatePayload,
  type PreferencesFormValue,
} from "@/features/preferences/lib/preferencesMapper";
import {
  MeBooklistsSection,
  type BooklistSubTab,
} from "@/pages/MePage/MeBooklistsSection";
import { MeFollowsSection } from "@/pages/MePage/MeFollowsSection";
import { MeHistorySection } from "@/pages/MePage/MeHistorySection";
import {
  MePageHeader,
  type MePageTabOption,
} from "@/pages/MePage/MePageHeader";
import { MePreferencesSection } from "@/pages/MePage/MePreferencesSection";
import { useChannels } from "@/shared/hooks/useChannels";
import { GUILD_ID } from "@/shared/config/channelCategories.private";
import {
  clearBrowseHistory,
  getBrowseHistory,
  removeBrowseHistory,
} from "@/shared/lib/browseHistory";
import { notifyError, notifySuccess } from "@/features/mascot/lib/notify";

type MeTab = "booklists" | "follows" | "history" | "preferences";
type FollowStatusFilter = "current" | "past" | "all";

const DEFAULT_FORM: PreferencesFormValue = {
  preferredChannelIds: [],
  includeAuthorIds: [],
  excludeAuthorIds: [],
  includeTagsText: "",
  excludeTagsText: "",
  includeKeywordsText: "",
  excludeKeywordsText: "",
  previewImageMode: "thumbnail",
  resultsPerPage: 24,
  uiPageSize: 48,
  sortMethod: "last_active_desc",
};

const tabOptions: MePageTabOption[] = [
  { key: "booklists", label: "书单", icon: BookOpen },
  { key: "follows", label: "关注", icon: Bookmark },
  { key: "history", label: "足迹", icon: Eye },
  { key: "preferences", label: "偏好", icon: Settings2 },
];

function parseTab(value: string | null): MeTab {
  if (
    value === "booklists" ||
    value === "follows" ||
    value === "history" ||
    value === "preferences"
  ) {
    return value;
  }
  return "booklists";
}

function parseBooklistSubTab(value: string | null): BooklistSubTab {
  return value === "collected" ? "collected" : "mine";
}

function parseFollowStatus(value: string | null): FollowStatusFilter {
  if (value === "past" || value === "all") return value;
  return "current";
}

export function MePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { openPreview, openPreviewById } = usePreviewThread();

  const tab = parseTab(searchParams.get("tab"));
  const booklistSubTab = parseBooklistSubTab(searchParams.get("booklists"));
  const selectedFollowChannel = searchParams.get("channel");
  const followStatus = parseFollowStatus(searchParams.get("follow_status"));

  const [showCreateBooklist, setShowCreateBooklist] = useState(false);
  const [editingBooklist, setEditingBooklist] = useState<Booklist | null>(null);
  const [browseHistoryVersion, setBrowseHistoryVersion] = useState(0);
  const [followSearchQuery, setFollowSearchQuery] = useState("");

  const {
    preferences,
    isLoading: isPrefsLoading,
    isFetching: isPrefsFetching,
    savePreferences,
    isSaving,
  } = useUserPreferences({ guildId: GUILD_ID });

  const [form, setForm] = useState<PreferencesFormValue>(DEFAULT_FORM);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isDirty) return;
    setForm(toPreferencesFormValue(preferences));
  }, [preferences, isDirty]);

  useEffect(() => {
    if (tab === "history") {
      // Allow DOM to update first
      setTimeout(() => {
        document
          .getElementById("history-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [tab]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "odysseia_browse_history") return;
      setBrowseHistoryVersion((value) => value + 1);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const { data: channelsData } = useChannels();
  const channelOptions = useMemo(
    () => channelsData?.channels || [],
    [channelsData?.channels],
  );
  const channelTagCatalog = useMemo(
    () => channelsData?.tagCatalog || [],
    [channelsData?.tagCatalog],
  );
  const availablePreferenceTags = useMemo(() => {
    const preferredChannels = new Set(form.preferredChannelIds);
    const scopedCatalog =
      preferredChannels.size > 0
        ? channelTagCatalog.filter((channel) =>
            preferredChannels.has(channel.channel_id),
          )
        : channelTagCatalog;

    const tagSet = new Set<string>();
    for (const channel of scopedCatalog) {
      for (const tag of channel.available_tags || []) {
        if (tag?.trim()) tagSet.add(tag.trim());
      }
      for (const tag of channel.virtual_tags || []) {
        if (tag?.trim()) tagSet.add(tag.trim());
      }
    }

    return Array.from(tagSet);
  }, [channelTagCatalog, form.preferredChannelIds]);

  const followsQuery = useFollowsFeed({
    active_flag:
      followStatus === "all" ? null : followStatus === "past" ? false : true,
    channel_ids: selectedFollowChannel ? [selectedFollowChannel] : undefined,
  });

  const myBooklistsQuery = useMyBooklistsList();

  const collectedBooklistsQuery = useCollectedBooklistsList();

  const collectMutation = useToggleBooklistCollection();
  const unfollowMutation = useUnfollowThread();

  const createMutation = useCreateBooklist(() => setShowCreateBooklist(false));

  const updateMutation = useUpdateBooklist(undefined, () =>
    setEditingBooklist(null),
  );

  const deleteMutation = useDeleteBooklist();

  const browseHistory = useMemo(
    () => getBrowseHistory(),
    [browseHistoryVersion],
  );
  const filteredFollowedThreads = useMemo(() => {
    const followedThreads = followsQuery.data?.results || [];
    const query = followSearchQuery.trim().toLocaleLowerCase();
    if (!query) return followedThreads;
    return followedThreads.filter((thread) => {
      const author = thread.author;
      const searchableText = [
        thread.title,
        thread.first_message_excerpt,
        author?.display_name,
        author?.global_name,
        author?.name,
        ...(thread.tags || []),
        ...(thread.virtual_tags || []),
      ]
        .filter(Boolean)
        .join("\n")
        .toLocaleLowerCase();
      return searchableText.includes(query);
    });
  }, [followSearchQuery, followsQuery.data?.results]);
  const setTab = (next: MeTab) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  const setBooklistSubTab = (next: BooklistSubTab) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", "booklists");
    sp.set("booklists", next);
    setSearchParams(sp, { replace: true });
  };

  const setFollowStatus = (next: FollowStatusFilter) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", "follows");
    if (next === "current") {
      sp.delete("follow_status");
    } else {
      sp.set("follow_status", next);
    }
    setSearchParams(sp, { replace: true });
  };

  const setFollowChannel = (channelId: string | null) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", "follows");
    if (channelId) {
      sp.set("channel", channelId);
    } else {
      sp.delete("channel");
    }
    setSearchParams(sp, { replace: true });
  };

  const toggleChannel = (channelId: string) => {
    setIsDirty(true);
    setForm((prev) => {
      const exists = prev.preferredChannelIds.includes(channelId);
      return {
        ...prev,
        preferredChannelIds: exists
          ? prev.preferredChannelIds.filter((id) => id !== channelId)
          : [...prev.preferredChannelIds, channelId],
      };
    });
  };

  const savePreferenceForm = async () => {
    try {
      const payload = toPreferencesUpdatePayload(form);
      await savePreferences(payload);
      setIsDirty(false);
      notifySuccess("偏好已保存");
    } catch {
      notifyError("保存偏好失败");
    }
  };

  const activeBooklists = useMemo(() => {
    if (booklistSubTab === "mine") {
      return myBooklistsQuery.data?.results || [];
    }
    return (collectedBooklistsQuery.data?.results || []).map((item) => ({
      ...item,
      collected_flag: true,
    }));
  }, [
    booklistSubTab,
    collectedBooklistsQuery.data?.results,
    myBooklistsQuery.data?.results,
  ]);

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-10 p-4 sm:p-6 lg:gap-14 lg:p-8">
        <section>
          <div className="od-page-heading mb-8 lg:mb-10">
            <h1 className="od-page-title">我的</h1>
          </div>
          <MePageHeader
            currentTab={tab}
            onOpenProfile={() => navigate(`/u/${user!.id}`)}
            onSelectTab={(nextTab) => setTab(nextTab as MeTab)}
            showProfileButton={Boolean(user?.id)}
            tabOptions={tabOptions}
            user={user}
          />
          <div className="mt-5 flex justify-end">
            <FakeCaptchaEntry />
          </div>
        </section>

        {tab === "booklists" && (
          <MeBooklistsSection
            activeBooklists={activeBooklists}
            collectLoading={collectMutation.isPending}
            isLoading={
              myBooklistsQuery.isLoading || collectedBooklistsQuery.isLoading
            }
            subTab={booklistSubTab}
            userId={user?.id}
            onCreate={() => setShowCreateBooklist(true)}
            onDelete={(item) => {
              if (!window.confirm(`确认删除书单「${item.title}」？`)) return;
              deleteMutation.mutate(item.id);
            }}
            onEdit={(item) => setEditingBooklist(item)}
            onOpen={(id) => navigate(`/booklists/${id}`)}
            onRefresh={() => {
              void myBooklistsQuery.refetch();
              void collectedBooklistsQuery.refetch();
            }}
            onSetSubTab={setBooklistSubTab}
            onToggleCollect={(item) => {
              collectMutation.mutate({
                id: item.id,
                collected: Boolean(item.collected_flag),
              });
            }}
          />
        )}

        {tab === "follows" && (
          <MeFollowsSection
            channelOptions={channelOptions}
            hasAnyResults={(followsQuery.data?.results?.length || 0) > 0}
            followStatus={followStatus}
            isError={followsQuery.isError}
            isLoading={followsQuery.isLoading}
            selectedChannel={selectedFollowChannel}
            searchQuery={followSearchQuery}
            threads={filteredFollowedThreads}
            onSearchQueryChange={setFollowSearchQuery}
            onClearChannel={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete("channel");
              setSearchParams(nextParams, { replace: true });
            }}
            onPreview={openPreview}
            onRefresh={() => void followsQuery.refetch()}
            onSetChannel={setFollowChannel}
            onSetFollowStatus={setFollowStatus}
            onUnfollow={(thread) => {
              if (!window.confirm(`确认取消关注「${thread.title}」？`)) return;
              unfollowMutation.mutate(thread.thread_id);
            }}
            unfollowPendingThreadId={
              unfollowMutation.isPending
                ? unfollowMutation.variables
                : null
            }
          />
        )}

        {tab === "history" && (
          <MeHistorySection
            historyItems={browseHistory}
            onClear={() => {
              clearBrowseHistory();
              setBrowseHistoryVersion((value) => value + 1);
            }}
            onOpenThread={openPreviewById}
            onRefresh={() => setBrowseHistoryVersion((value) => value + 1)}
            onRemove={(threadId) => {
              removeBrowseHistory(threadId);
              setBrowseHistoryVersion((value) => value + 1);
            }}
          />
        )}

        {tab === "preferences" && (
          <MePreferencesSection
            availablePreferenceTags={availablePreferenceTags}
            channelOptions={channelOptions}
            form={form}
            isDirty={isDirty}
            isLoading={isPrefsLoading}
            isSaving={isSaving}
            isSyncing={isPrefsFetching}
            onSave={savePreferenceForm}
            onToggleChannel={toggleChannel}
            onUpdateForm={(updater) => {
              setIsDirty(true);
              setForm((prev) => updater(prev));
            }}
          />
        )}
      </div>

      <BooklistFormModal
        isOpen={showCreateBooklist}
        submitting={createMutation.isPending}
        onClose={() => setShowCreateBooklist(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <BooklistFormModal
        isOpen={Boolean(editingBooklist)}
        initialValue={editingBooklist || undefined}
        submitting={updateMutation.isPending}
        onClose={() => setEditingBooklist(null)}
        onSubmit={(payload) => {
          if (!editingBooklist) return;
          updateMutation.mutate({ id: editingBooklist.id, payload });
        }}
      />
    </>
  );
}
