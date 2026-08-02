import { useQuery } from '@tanstack/react-query';
import { Hash, MessageCircle, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AISearchTokenChip } from '@/features/ai-search/components/AISearchTokenChip';
import {
  getAISearchComposerCaret,
  parseAISearchComposer,
  serializeAISearchComposer,
  setAISearchComposerCaret,
} from '@/features/ai-search/lib/composer';
import {
  applyAISearchMentionToken,
  findAISearchMentionTrigger,
  insertAISearchLineBreak,
  type AISearchMentionTrigger,
} from '@/features/ai-search/lib/mentions';
import { searchApi, type SearchSuggestionAuthor } from '@/features/search/api/searchApi';
import { searchKeys } from '@/features/search/lib/queryKeys';
import { useThemeSettings } from '@/shared/hooks/useSettings';
import { LazyImage } from '@/shared/ui/LazyImage';

export interface AISearchMentionChannel {
  id: string;
  name: string;
  tags: string[];
}

type MentionItem =
  | { type: 'tag'; value: string; label: string }
  | { type: 'author'; value: string; label: string; avatarUrl?: string | null }
  | { type: 'channel'; value: string; label: string };

interface AISearchTokenInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  channels: AISearchMentionChannel[];
  placeholder?: string;
  inputRef?: RefObject<HTMLDivElement | null>;
  autoFocus?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function AISearchTokenInput({
  value,
  onChange,
  onSubmit,
  channels,
  placeholder,
  inputRef,
  autoFocus,
  disabled = false,
  rows = 1,
  className = '',
}: AISearchTokenInputProps) {
  const { backgroundImageEnabled } = useThemeSettings();
  const segments = useMemo(() => parseAISearchComposer(value), [value]);
  const ownInputRef = useRef<HTMLDivElement>(null);
  const editorRef = inputRef || ownInputRef;
  const isComposingRef = useRef(false);
  const inputSyncTimerRef = useRef<number | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const [tokenPortals, setTokenPortals] = useState<Array<{
    element: HTMLElement;
    segment: Extract<(typeof segments)[number], { type: 'token' }>;
  }>>([]);
  const [trigger, setTrigger] = useState<AISearchMentionTrigger | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (serializeAISearchComposer(editor) !== value) {
      const portals: typeof tokenPortals = [];
      const nodes = segments.map((segment) => {
        if (segment.type === 'text') return document.createTextNode(segment.content);
        const element = document.createElement('span');
        element.contentEditable = 'false';
        element.dataset.aiTokenRaw = segment.raw;
        element.className = 'mx-0.5 inline-block align-middle';
        portals.push({ element, segment });
        return element;
      });
      editor.replaceChildren(...nodes);
      setTokenPortals(portals);
    } else {
      const tokenSegments = segments.filter(
        (segment): segment is Extract<(typeof segments)[number], { type: 'token' }> => segment.type === 'token',
      );
      const elements = Array.from(editor.querySelectorAll<HTMLElement>('[data-ai-token-raw]'));
      if (elements.length === tokenSegments.length) {
        setTokenPortals(elements.map((element, index) => ({ element, segment: tokenSegments[index] })));
      }
    }

    if (pendingCaretRef.current !== null) {
      setAISearchComposerCaret(editor, pendingCaretRef.current);
      pendingCaretRef.current = null;
    }
  }, [editorRef, segments, value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus, editorRef]);

  useEffect(() => () => {
    if (inputSyncTimerRef.current !== null) window.clearTimeout(inputSyncTimerRef.current);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(trigger?.query.trim() || ''), 220);
    return () => window.clearTimeout(timer);
  }, [trigger?.query]);

  const { data: suggestedAuthors = [] } = useQuery({
    queryKey: searchKeys.suggestions({ query: debouncedQuery, channel: null, preferenceSignature: 'ai-search' }),
    queryFn: async () => (await searchApi.getSuggestions(debouncedQuery, false)).authors || [],
    enabled: Boolean(trigger && debouncedQuery),
    staleTime: 30_000,
    retry: false,
  });

  const selectedTokens = useMemo(
    () => new Set(segments.filter((segment) => segment.type === 'token').map((segment) => `${segment.token.type}:${segment.token.value}`)),
    [segments],
  );
  const suggestions = useMemo(() => {
    if (!trigger) return [];
    const query = trigger.query.trim().toLowerCase();
    const tags = Array.from(new Set(channels.flatMap((channel) => channel.tags)))
      .filter((tag) => (!query || tag.toLowerCase().includes(query)) && !selectedTokens.has(`tag:${tag}`))
      .slice(0, 6)
      .map((tag): MentionItem => ({ type: 'tag', value: tag, label: tag }));
    const channelItems = channels
      .filter((channel) => (!query || channel.name.toLowerCase().includes(query)) && !selectedTokens.has(`channel:${channel.id}`))
      .slice(0, 5)
      .map((channel): MentionItem => ({ type: 'channel', value: channel.id, label: channel.name }));
    const authors = query
      ? suggestedAuthors
          .filter((author) => !selectedTokens.has(`author:${author.id}`))
          .slice(0, 5)
          .map((author: SearchSuggestionAuthor): MentionItem => ({
            type: 'author',
            value: author.id,
            label: author.display_name || author.name,
            avatarUrl: author.avatar_url,
          }))
      : [];
    return [...authors, ...tags, ...channelItems];
  }, [channels, selectedTokens, suggestedAuthors, trigger]);

  useEffect(() => setSelectedIndex(0), [trigger?.query]);

  const updateTrigger = (nextValue: string, caret: number | null) => {
    setTrigger(findAISearchMentionTrigger(nextValue, caret ?? nextValue.length));
  };

  const commitValue = (nextValue: string, caret?: number | null) => {
    pendingCaretRef.current = caret ?? null;
    onChange(nextValue);
  };

  const selectSuggestion = (item: MentionItem) => {
    if (!trigger) return;
    const next = applyAISearchMentionToken(value, trigger, item.type, item.value);
    commitValue(next.value, next.caret);
    setTrigger(null);
    window.requestAnimationFrame(() => editorRef.current?.focus());
  };

  const removeTokenAt = (start: number, end: number) => {
    commitValue(`${value.slice(0, start)}${value.slice(end)}`, start);
    setTrigger(null);
  };

  const syncEditorValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = serializeAISearchComposer(editor);
    const caret = getAISearchComposerCaret(editor);
    commitValue(nextValue, caret);
    updateTrigger(nextValue, caret);
  };

  const cancelPendingInputSync = () => {
    if (inputSyncTimerRef.current === null) return;
    window.clearTimeout(inputSyncTimerRef.current);
    inputSyncTimerRef.current = null;
  };

  const handleInput = (event: FormEvent<HTMLDivElement>) => {
    // 部分中文输入法的首个 input 仍会错误报告 isComposing=false，延后一拍让 compositionstart 先接管。
    const nativeEvent = event.nativeEvent as InputEvent;
    if (isComposingRef.current || nativeEvent.isComposing || nativeEvent.inputType === 'insertCompositionText') return;
    cancelPendingInputSync();
    inputSyncTimerRef.current = window.setTimeout(() => {
      inputSyncTimerRef.current = null;
      if (!isComposingRef.current) syncEditorValue();
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.keyCode === 229) {
      cancelPendingInputSync();
      isComposingRef.current = true;
      return;
    }
    if (isComposingRef.current || event.nativeEvent.isComposing) return;
    if (trigger && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        return;
      }
    }
    if (event.key === 'Escape' && trigger) {
      event.preventDefault();
      setTrigger(null);
      return;
    }
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      const caret = getAISearchComposerCaret(event.currentTarget) ?? value.length;
      const next = insertAISearchLineBreak(value, caret, caret);
      commitValue(next.value, next.caret);
      setTrigger(null);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit?.();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(event.clipboardData.getData('text/plain'));
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    handleInput(event);
  };

  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="描述想搜索的内容"
        aria-disabled={disabled}
        aria-expanded={Boolean(trigger)}
        aria-autocomplete="list"
        data-placeholder={placeholder}
        onInput={handleInput}
        onBeforeInput={(event) => {
          const nativeEvent = event.nativeEvent as InputEvent;
          if (nativeEvent.isComposing || nativeEvent.inputType === 'insertCompositionText') {
            cancelPendingInputSync();
            isComposingRef.current = true;
          }
        }}
        onClick={() => {
          const editor = editorRef.current;
          if (editor) updateTrigger(serializeAISearchComposer(editor), getAISearchComposerCaret(editor));
        }}
        onKeyUp={(event) => {
          if (!event.key.startsWith('Arrow')) return;
          const editor = editorRef.current;
          if (editor) updateTrigger(serializeAISearchComposer(editor), getAISearchComposerCaret(editor));
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={() => {
          cancelPendingInputSync();
          isComposingRef.current = true;
        }}
        onCompositionEnd={(event: CompositionEvent<HTMLDivElement>) => {
          cancelPendingInputSync();
          isComposingRef.current = false;
          const editor = event.currentTarget;
          const nextValue = serializeAISearchComposer(editor);
          const caret = getAISearchComposerCaret(editor);
          commitValue(nextValue, caret);
          updateTrigger(nextValue, caret);
        }}
        onBlur={() => window.setTimeout(() => setTrigger(null), 120)}
        className={`max-h-36 min-h-11 min-w-0 overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-1 py-2 text-sm leading-6 text-(--od-text-primary) outline-hidden empty:before:pointer-events-none empty:before:text-(--od-text-tertiary) empty:before:content-[attr(data-placeholder)] sm:text-base ${rows > 1 ? 'min-h-24' : ''}`}
      />

      {tokenPortals.map(({ element, segment }) => createPortal(
        <AISearchTokenChip
          token={segment.token}
          channels={channels}
          onRemove={() => removeTokenAt(segment.start, segment.end)}
        />,
        element,
        `${segment.raw}-${segment.start}`,
      ))}

      {trigger && (
        <div
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className={`${backgroundImageEnabled ? 'od-floating-glass' : 'od-floating-panel-solid'} absolute bottom-[calc(100%+0.65rem)] left-0 z-50 max-h-72 w-full overflow-y-auto rounded-2xl border border-(--od-border-strong) p-2 shadow-2xl`}
        >
          {suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-(--od-text-tertiary)">
              {trigger.query.trim() ? '暂无匹配的 Tag、作者或频道' : '输入关键词可继续查找作者'}
            </p>
          ) : suggestions.map((item, index) => (
            <button
              key={`${item.type}-${item.value}`}
              type="button"
              role="option"
              aria-selected={selectedIndex === index}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => selectSuggestion(item)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${selectedIndex === index ? 'bg-(--od-surface-soft) text-(--od-accent)' : 'text-(--od-text-secondary) hover:text-(--od-accent)'}`}
            >
              {item.type === 'author' && item.avatarUrl ? (
                <LazyImage src={item.avatarUrl} alt={item.label} className="h-5 w-5 rounded-full object-cover" />
              ) : item.type === 'author' ? (
                <User className="h-4 w-4" />
              ) : item.type === 'channel' ? (
                <MessageCircle className="h-4 w-4" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="text-[10px] uppercase tracking-wider text-(--od-text-tertiary)">
                {item.type === 'tag' ? 'Tag' : item.type === 'author' ? '作者' : '频道'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
