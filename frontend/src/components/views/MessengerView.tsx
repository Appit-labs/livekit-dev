import { useState, useRef, useEffect } from "react";
import { Hash, Send, Paperclip, Smile, AtSign, Bold, Italic, Link2, X, ChevronRight } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { useChannels, useMessages, useSendMessage, useMarkChannelRead, useAddReaction } from "@/api/channels";
import { useAuth } from "@/contexts/AuthContext";
import { FadeSlide } from "@/components/animations/FadeSlide";
import { ListStagger } from "@/components/animations/ListStagger";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/types";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "🚀", "👀", "😢"];

function MessageBubble({
  msg,
  channelId,
  onThread,
  currentUserId,
}: {
  msg: Message;
  channelId: string;
  onThread: () => void;
  currentUserId?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const addReaction = useAddReaction();
  const isDeleted = !!msg.deleted_at;

  const handleReact = (emoji: string) => {
    setShowEmojiPicker(false);
    addReaction.mutate(
      { channelId, messageId: msg.id, emoji },
      { onError: () => toast.error("Failed to add reaction") }
    );
  };

  return (
    <div
      className="relative flex gap-3 px-5 py-2 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false); }}
    >
      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-xs font-bold font-display text-[var(--color-primary)] flex-shrink-0 mt-0.5">
        {msg.user_id[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-sm font-semibold text-[var(--color-on-surface)] font-body">
            {msg.user_id === currentUserId ? "You" : `User ${msg.user_id.slice(0, 6)}`}
          </span>
          <span className="text-xs text-[var(--color-on-surface-variant)]">
            {format(new Date(msg.created_at), "h:mm a")}
          </span>
        </div>
        <p className={cn("text-sm text-[var(--color-on-surface)] font-body leading-relaxed", isDeleted && "italic text-[var(--color-on-surface-variant)]")}>
          {isDeleted ? "This message was deleted" : msg.content}
        </p>
        {msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className="inline-flex items-center gap-1 text-xs bg-[var(--color-surface-container)] rounded-full px-2 py-0.5 cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors border border-transparent hover:border-[var(--color-outline-variant)]"
              >
                {r.emoji} <span className="text-[var(--color-on-surface-variant)]">{r.count}</span>
              </button>
            ))}
          </div>
        )}
        {msg.reply_count > 0 && (
          <button onClick={onThread} className="mt-1 text-xs text-[var(--color-primary)] hover:underline font-medium font-body">
            {msg.reply_count} {msg.reply_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover HUD */}
      {hovered && !isDeleted && (
        <div className="absolute right-5 top-1 message-hud flex items-center gap-0.5 rounded-md px-1 py-0.5 z-10">
          {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="w-6 h-6 text-sm hover:scale-125 transition-transform rounded"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="More reactions"
            className="w-6 h-6 flex items-center justify-center hover:bg-[var(--color-surface-container)] rounded text-[var(--color-on-surface-variant)] text-xs"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onThread}
            title="Reply in thread"
            className="w-6 h-6 flex items-center justify-center hover:bg-[var(--color-surface-container)] rounded text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] ml-1"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Extended emoji picker */}
      {showEmojiPicker && (
        <div
          className="absolute right-5 top-8 z-20 card-nested p-2 shadow-xl"
          style={{ background: "var(--color-surface-container-high)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="w-8 h-8 text-lg hover:scale-125 transition-transform rounded hover:bg-[var(--color-surface-container)]"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessengerView() {
  const { activeWorkspaceId, activeChannelId, openThread, threadMessageId } = useAppStore();
  const { user } = useAuth();
  const { data: channels = [] } = useChannels(activeWorkspaceId || "");
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const { data: pages, isLoading } = useMessages(activeChannel?.id || "");
  const sendMessage = useSendMessage();
  const markRead = useMarkChannelRead();

  const [input, setInput] = useState("");
  const [showRibbon, setShowRibbon] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const messages = pages?.pages.flat() || [];

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
    if (activeChannel?.id) markRead.mutate(activeChannel.id);
  }, [messages.length, activeChannel?.id]);

  const handleSend = async () => {
    if (!input.trim() || !activeChannel) return;
    const content = input.trim();
    setInput("");
    try {
      await sendMessage.mutateAsync({ channelId: activeChannel.id, content });
    } catch {
      toast.error("Failed to send message");
      setInput(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 text-[var(--color-on-surface-variant)] px-6">
        <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center">
          <Hash className="w-7 h-7 opacity-40" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-[var(--color-on-surface)] text-sm">No channel selected</p>
          <p className="font-body text-xs mt-1 text-[var(--color-on-surface-variant)]">Pick a channel from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-14 flex-shrink-0 bg-[var(--color-surface-container-lowest)] border-b border-[rgba(194,198,209,0.15)]">
          <Hash className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
          <h2 className="font-display font-semibold text-[var(--color-on-surface)] text-sm">{activeChannel.name}</h2>
          {activeChannel.description && (
            <span className="text-xs text-[var(--color-on-surface-variant)] hidden md:block truncate">— {activeChannel.description}</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-on-surface-variant)]">
              <Hash className="w-8 h-8 opacity-30" />
              <p className="text-sm font-body">No messages yet. Be the first to say hello!</p>
            </div>
          ) : (
            <ListStagger
              items={messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  channelId={activeChannel.id}
                  onThread={() => openThread(msg.id, activeChannel.id)}
                  currentUserId={user?.id}
                />
              ))}
              staggerMs={30}
              trigger={activeChannel.id}
            />
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input area */}
        <div className="px-5 py-4 flex-shrink-0 relative">
          <div className="bg-[var(--color-surface-container-lowest)] rounded-lg shadow-ghost">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowRibbon(true)}
              onBlur={() => setTimeout(() => setShowRibbon(false), 200)}
              placeholder={`Message #${activeChannel.name}`}
              rows={2}
              className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none resize-none font-body"
            />

            {/* Floating formatting ribbon */}
            {showRibbon && (
              <div className="mx-4 mb-3 flex items-center justify-between">
                <div className="floating-ribbon flex items-center gap-0.5 px-2 py-1">
                  {[
                    { icon: Bold, label: "Bold", action: () => setInput((v) => `**${v}**`) },
                    { icon: Italic, label: "Italic", action: () => setInput((v) => `_${v}_`) },
                    { icon: Link2, label: "Link" },
                    { icon: AtSign, label: "Mention", action: () => setInput((v) => v + "@") },
                  ].map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      title={label}
                      onMouseDown={(e) => { e.preventDefault(); action?.(); }}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] transition-colors text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button title="Attach file" className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    title="Emoji"
                    onMouseDown={(e) => { e.preventDefault(); setInput((v) => v + "😊"); }}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMessage.isPending}
                    className="btn-primary w-7 h-7 flex items-center justify-center rounded transition-all disabled:opacity-40 hover:opacity-90"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thread panel — collapses to full-width overlay on small screens */}
      {threadMessageId && (
        <FadeSlide direction="left" className="w-full sm:w-80 flex-shrink-0 border-l border-[rgba(194,198,209,0.15)] bg-[var(--color-surface-container-lowest)] flex flex-col absolute sm:relative inset-0 sm:inset-auto z-10">
          <div className="flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-[rgba(194,198,209,0.15)]">
            <h3 className="font-display font-semibold text-sm text-[var(--color-on-surface)]">Thread</h3>
            <button
              onClick={() => useAppStore.getState().closeThread()}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-[var(--color-on-surface-variant)] text-center">Replies for this thread appear here</p>
          </div>
        </FadeSlide>
      )}
    </div>
  );
}
