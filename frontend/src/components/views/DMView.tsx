import { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, MessageCircle, Plus, X } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { useDMConversations, useDMMessages, useSendDM, useCreateDMConversation } from "@/api/dm";
import { useWorkspaceMembers } from "@/api/workspaces";
import { useAuth } from "@/contexts/AuthContext";
import { ListStagger } from "@/components/animations/ListStagger";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function NewDMModal({
  workspaceId,
  currentUserId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  currentUserId: string;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: membersData } = useWorkspaceMembers(workspaceId);
  const { mutateAsync: createDM, isPending } = useCreateDMConversation(workspaceId);

  const members = (membersData?.members ?? membersData ?? []) as any[];
  const filtered = members.filter(
    (m: any) =>
      m.user_id !== currentUserId &&
      (m.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (userId: string) => {
    try {
      const conv = await createDM([userId]);
      onCreated(conv.id);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Failed to start conversation";
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-nested w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-[var(--color-on-surface)]">New direct message</h3>
          <button onClick={onClose} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-body"
          autoFocus
        />

        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-[var(--color-on-surface-variant)] text-center py-4 font-body">No members found</p>
          ) : (
            filtered.map((m: any) => (
              <button
                key={m.user_id}
                onClick={() => handleSelect(m.user_id)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-container)] transition-colors text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-sm font-bold font-display text-[var(--color-primary)] flex-shrink-0">
                  {m.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-on-surface)] font-body truncate">{m.name}</p>
                  {m.title && <p className="text-xs text-[var(--color-on-surface-variant)] font-body truncate">{m.title}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function DMView() {
  const { activeWorkspaceId, activeDMConversationId, setActiveDMConversation } = useAppStore();
  const { user } = useAuth();
  const { data: conversations = [] } = useDMConversations(activeWorkspaceId || "");
  const activeConv = conversations.find((c) => c.id === activeDMConversationId) || conversations[0];
  const { data: messages = [] } = useDMMessages(activeWorkspaceId || "", activeConv?.id || "");
  const sendDM = useSendDM(activeWorkspaceId || "");
  const [input, setInput] = useState("");
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const otherUser = activeConv?.participants.find((p) => p.user_id !== user?.id) || activeConv?.participants[0];

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    const content = input.trim();
    setInput("");
    await sendDM.mutateAsync({ conversationId: activeConv.id, content });
  };

  const handleDMCreated = (conversationId: string) => {
    setActiveDMConversation(conversationId);
    setShowNewDMModal(false);
  };

  return (
    <div className="flex h-full">
      {/* DM sidebar list */}
      <div
        className="w-[220px] flex-shrink-0 flex flex-col border-r border-[rgba(194,198,209,0.12)] h-full overflow-hidden"
        style={{ background: "var(--color-surface-container-low)" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
          <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Direct Messages</span>
          <button
            onClick={() => setShowNewDMModal(true)}
            className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
            title="New direct message"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 hide-scrollbar">
          {conversations.map((conv) => {
            const other = conv.participants.find((p) => p.user_id !== user?.id) || conv.participants[0];
            const isActive = conv.id === (activeConv?.id);
            return (
              <button
                key={conv.id}
                onClick={() => setActiveDMConversation(conv.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-left transition-colors",
                  isActive
                    ? "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-xs font-bold font-display text-[var(--color-primary)]">
                    {other?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span
                    className="absolute -bottom-px -right-px w-2 h-2 rounded-full border border-[var(--color-surface-container-low)]"
                    style={{
                      background: other?.status === "online" ? "var(--color-accent-green)" : other?.status === "away" ? "var(--color-accent-amber)" : "#737781",
                    }}
                  />
                </div>
                <span className="truncate font-body">{other?.name || "Unknown"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main DM area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface-container-lowest)]">
        {!activeConv ? (
          <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 px-6">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-[var(--color-on-surface-variant)] opacity-50" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-[var(--color-on-surface)] text-sm">No conversation selected</p>
              <p className="font-body text-xs mt-1 text-[var(--color-on-surface-variant)]">Choose a conversation or start a new one</p>
            </div>
            <button
              onClick={() => setShowNewDMModal(true)}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: "var(--color-primary)" }}
            >
              New message
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 h-14 flex-shrink-0 border-b border-[rgba(194,198,209,0.15)]">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-sm font-bold font-display text-[var(--color-primary)]">
                  {otherUser?.name?.[0]?.toUpperCase()}
                </div>
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface-container-lowest)]"
                  style={{ background: otherUser?.status === "online" ? "var(--color-accent-green)" : "var(--color-outline)" }}
                />
              </div>
              <div>
                <h2 className="font-display font-semibold text-sm text-[var(--color-on-surface)]">{otherUser?.name}</h2>
                <p className="text-xs text-[var(--color-on-surface-variant)] capitalize font-body">{otherUser?.status}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] transition-colors">
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4">
              <ListStagger
                items={messages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex px-5 py-1.5", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[70%] rounded-xl px-3.5 py-2", isMe ? "bg-[var(--color-primary)] text-white rounded-br-none" : "bg-[var(--color-surface-container)] text-[var(--color-on-surface)] rounded-bl-none")}>
                        <p className="text-sm font-body">{msg.content}</p>
                        <p className={cn("text-xs mt-0.5", isMe ? "text-white/60" : "text-[var(--color-on-surface-variant)]")}>
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                staggerMs={20}
                trigger={activeConv.id}
              />
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 flex-shrink-0">
              <div className="flex items-end gap-2 bg-[var(--color-surface-container)] rounded-lg px-4 py-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Message ${otherUser?.name || ""}…`}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none resize-none font-body"
                />
                <button onClick={handleSend} disabled={!input.trim()} className="btn-primary w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showNewDMModal && activeWorkspaceId && user && (
        <NewDMModal
          workspaceId={activeWorkspaceId}
          currentUserId={user.id}
          onClose={() => setShowNewDMModal(false)}
          onCreated={handleDMCreated}
        />
      )}
    </div>
  );
}
