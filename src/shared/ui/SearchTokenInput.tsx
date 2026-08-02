import {
  parseSearchQuery,
  removeToken,
  SearchToken,
  tokensToQuery,
} from "@/shared/lib/searchTokenizer";
import { LazyImage } from "@/shared/ui/LazyImage";
import { CalendarRange, Hash, MessageCircle, Tag as TagIcon, ThumbsUp, User, X } from "lucide-react";
import {
  ChangeEvent,
  CompositionEvent,
  KeyboardEvent,
  type MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";

interface SearchTokenInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  externalInputRef?: MutableRefObject<HTMLInputElement | null>;
  placeholder?: string;
  className?: string;
  authorDetails?: Record<string, { displayName: string; avatarUrl?: string | null }>;
}

export function SearchTokenInput({
  value,
  onChange,
  onSearch,
  onFocus,
  onBlur,
  externalInputRef,
  placeholder = "搜索...",
  className = "",
  authorDetails = {},
}: SearchTokenInputProps) {
  const [tokens, setTokens] = useState<SearchToken[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [editingTokenIndex, setEditingTokenIndex] = useState<number | null>(
    null,
  );
  const [editingValue, setEditingValue] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const isComposingRef = useRef(false);
  const compositionValueRef = useRef("");

  // 解析 value 到 tokens
  useEffect(() => {
    const parsed = parseSearchQuery(value);
    setTokens(parsed);

    // 如果只有文本 token，显示在输入框中
    if (parsed.length === 1 && parsed[0].type === "text") {
      setInputValue(parsed[0].value);
    } else if (parsed.length === 0) {
      setInputValue("");
    } else {
      // 提取非文本 token 后的文本部分
      const lastToken = parsed[parsed.length - 1];
      if (lastToken.type === "text") {
        setInputValue(lastToken.value);
      } else {
        setInputValue("");
      }
    }
  }, [value]);

  // 监听 tokens 变化，如果有空的 token (来自模板)，自动聚焦到输入框
  useEffect(() => {
    const emptyTokenIndex = tokens.findIndex(
      (t) => t.type !== "text" && !t.value,
    );
    if (emptyTokenIndex !== -1) {
      // 如果有空 token，我们实际上不需要做特殊处理，因为渲染逻辑会把它变成 input
      // 但我们需要确保 inputRef 聚焦
      // 这里稍微复杂点：如果我们在渲染列表里放 input，那 inputRef 指向的是主输入框
      // 我们需要为每个 token chip 准备 ref 吗？
      // 简化方案：点击模板 -> 插入 "$type:$" -> 解析出空 token -> 渲染为带 input 的 chip -> 自动聚焦
    }
  }, [tokens]);

  const handleRemoveToken = (token: SearchToken) => {
    const newQuery = removeToken(value, token);
    onChange(newQuery);
  };

  // 点击 Token：进入编辑模式，在 token 位置显示输入框
  const handleTokenClick = (token: SearchToken) => {
    const nonTextTokens = tokens.filter((t) => t.type !== "text");
    const tokenIndex = nonTextTokens.indexOf(token);

    setEditingTokenIndex(tokenIndex);
    setEditingValue(token.value);

    // 聚焦到编辑输入框
    setTimeout(() => {
      const editInput = editInputRefs.current.get(tokenIndex);
      editInput?.focus();
      editInput?.select();
    }, 0);
  };

  // 完成 token 编辑
  const handleFinishEdit = (token: SearchToken, newValue: string) => {
    if (!newValue.trim()) {
      // 如果值为空，删除 token
      handleRemoveToken(token);
    } else {
      // 更新 token 值
      const tokenPrefix = token.mode === "exclude" ? "-" : "";
      const newQuery = value.replace(
        token.raw,
        `${tokenPrefix}$${token.type}:${newValue}$`,
      );
      onChange(newQuery);
    }
    setEditingTokenIndex(null);
    setEditingValue("");
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingTokenIndex(null);
    setEditingValue("");
  };

  const commitInputValue = (nextValue: string) => {
    setInputValue(nextValue);

    const nonTextTokens = tokens.filter((t) => t.type !== "text");
    const newQuery =
      nonTextTokens.length > 0
        ? `${tokensToQuery(nonTextTokens)} ${nextValue}`.trim()
        : nextValue;

    onChange(newQuery);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const nativeEvent = e.nativeEvent as InputEvent & { isComposing?: boolean };

    if (isComposingRef.current || nativeEvent.isComposing) {
      setInputValue(newValue);
      compositionValueRef.current = newValue;
      return;
    }

    compositionValueRef.current = "";
    commitInputValue(newValue);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const finalizedValue = e.currentTarget.value;
    compositionValueRef.current = "";
    commitInputValue(finalizedValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing) {
      return;
    }

    // Enter 键触发搜索
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch?.();
      inputRef.current?.blur();
      return;
    }

    // Backspace 删除最后一个 token
    if (e.key === "Backspace" && inputValue === "" && tokens.length > 0) {
      const lastNonTextToken = [...tokens]
        .reverse()
        .find((t) => t.type !== "text");
      if (lastNonTextToken) {
        handleRemoveToken(lastNonTextToken);
      }
    }
  };

  const getTokenIcon = (token: SearchToken) => {
    const author = token.type === "author" ? authorDetails[token.value] : null;
    if (author) {
      return (
        <LazyImage
          src={author.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
          alt={author.displayName}
          className="h-4 w-4 shrink-0 rounded-full object-cover"
        />
      );
    }

    switch (token.type) {
      case "tag":
        return <TagIcon className="h-3 w-3" />;
      case "author":
        return <User className="h-3 w-3" />;
      case "channel":
        return <Hash className="h-3 w-3" />;
      case "date":
        return <CalendarRange className="h-3 w-3" />;
      case "likes":
        return <ThumbsUp className="h-3 w-3" />;
      case "replies":
        return <MessageCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTokenColor = (token: SearchToken) => {
    if (token.mode === "exclude") {
      return "border-rose-500/40 bg-rose-500/12 text-rose-300";
    }

    switch (token.type) {
      case "tag":
        return "border-sky-500/40 bg-sky-500/12 text-sky-300";
      case "author":
        return "border-violet-500/40 bg-violet-500/12 text-violet-300";
      case "channel":
        return "border-amber-500/40 bg-amber-500/12 text-amber-300";
      case "date":
        return "border-teal-500/40 bg-teal-500/12 text-teal-300";
      case "likes":
        return "border-pink-500/40 bg-pink-500/12 text-pink-300";
      case "replies":
        return "border-emerald-500/40 bg-emerald-500/12 text-emerald-300";
      default:
        return "border-(--od-shell-line) bg-(--od-surface-soft) text-(--od-text-secondary)";
    }
  };

  const getTokenLabel = (token: SearchToken) => {
    if (token.type === "date") return `日期 ${token.value.replace("..", " → ")}`;
    if (token.type === "likes") return `点赞 ${token.value}`;
    if (token.type === "replies") return `评论 ${token.value}`;
    return token.value;
  };

  return (
    <div
      ref={containerRef}
      onClick={() => inputRef.current?.focus()}
      role="combobox"
      aria-expanded={tokens.length > 0 || inputValue.length > 0}
      aria-haspopup="listbox"
      aria-controls="search-suggestions-listbox"
      className={`flex min-h-[40px] w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none rounded-lg border-none bg-(--od-bg-secondary) px-2 py-1.5 text-sm text-(--od-text-primary) transition-all duration-200 ${className}`}
    >
      {/* 显示 token chips */}
      {tokens
        .filter((token) => token.type !== "text")
        .map((token, index) => {
          const isEditing = editingTokenIndex === index;
          const author = token.type === "author" ? authorDetails[token.value] : null;

          return (
            <div
              key={`${token.type}-${token.value}-${index}`}
              className={`flex max-w-[42%] shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-all duration-200 ${
                isEditing ? "ring-2 ring-(--od-accent)" : "hover:scale-105"
              } ${getTokenColor(token)}`}
            >
              {getTokenIcon(token)}

              {isEditing ? (
                <input
                  ref={(el) => {
                    if (el) editInputRefs.current.set(index, el);
                  }}
                  type="text"
                  autoComplete="off"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFinishEdit(token, editingValue);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                  onBlur={() => handleFinishEdit(token, editingValue)}
                  className="min-w-[48px] max-w-[96px] bg-transparent outline-hidden"
                  style={{
                    width: `${Math.max(60, editingValue.length * 8)}px`,
                  }}
                />
              ) : (
                <span
                  className={`${token.type === "date" ? "max-w-[180px]" : "max-w-[72px]"} truncate cursor-pointer`}
                  onClick={(e) => {
                    if (author) return;
                    e.stopPropagation();
                    handleTokenClick(token);
                  }}
                  title={author ? author.displayName : "点击修改"}
                >
                  {author?.displayName || getTokenLabel(token) || "(空)"}
                </span>
              )}

              {!isEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveToken(token);
                  }}
                  className="rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label={`移除${token.mode === "exclude" ? "排除" : "包含"} ${token.type}: ${token.value}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

      {/* 输入框 */}
      <input
        aria-autocomplete="list"
        aria-controls="search-suggestions-listbox"
        ref={(element) => {
          inputRef.current = element;
          if (externalInputRef) {
            externalInputRef.current = element;
          }
        }}
        type="search"
        name="odysseia-forum-search"
        autoComplete="off"
        data-form-type="search"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={tokens.length === 0 ? placeholder : ""}
        className="min-w-0 flex-1 bg-transparent text-(--od-text-primary) placeholder:text-(--od-text-tertiary) focus:outline-hidden"
      />
    </div>
  );
}
