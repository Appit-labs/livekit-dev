import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hash, MessageCircle, GitBranch, PhoneCall, FileText,
  Users, Columns, CheckSquare, Calendar, Settings, Plus,
  ChevronDown, Search, UserPlus, Building2, X, Copy, Check,
  Menu, LogOut, User as UserIcon,
} from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { useWorkspaces, useCreateInvite } from "@/api/workspaces";
import { useChannels, useCreateChannel } from "@/api/channels";
import { useDMConversations } from "@/api/dm";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AppSection } from "@/types";

const NAV_ITEMS: { icon: React.ElementType; section: AppSection; label: string; accentColor: string }[] = [
  { icon: MessageCircle, section: "dm", label: "Messages", accentColor: "var(--color-accent-teal)" },
  { icon: GitBranch, section: "threads", label: "Threads", accentColor: "var(--color-accent-green)" },
  { icon: PhoneCall, section: "bundle", label: "Calls", accentColor: "var(--color-accent-amber)" },
  { icon: FileText, section: "drafts", label: "Drafts", accentColor: "var(--color-accent-purple)" },
  { icon: Columns, section: "board", label: "Board", accentColor: "var(--color-accent-teal)" },
  { icon: CheckSquare, section: "tasks", label: "Tasks", accentColor: "var(--color-accent-green)" },
  { icon: Calendar, section: "calendar", label: "Calendar", accentColor: "var(--color-accent-amber)" },
  { icon: Users, section: "directories", label: "Directory", accentColor: "var(--color-accent-purple)" },
];

function InviteModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutateAsync: createInvite, isPending } = useCreateInvite(workspaceId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const result = await createInvite({ email: email.trim() });
      setInviteUrl(result.invite_url);
      toast.success("Invite created!");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Failed to create invite";
      toast.error(msg);
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-nested w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-[var(--color-on-surface)]">Invite members</h3>
          <button onClick={onClose} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!inviteUrl ? (
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-body"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "var(--color-primary)" }}
            >
              {isPending ? "Creating invite…" : "Send invite"}
            </button>
            <p className="text-xs text-[var(--color-on-surface-variant)] font-body text-center">
              The invitee must have a Lively account to accept the invite.
            </p>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-on-surface-variant)] font-body">
              Invite link created for <strong className="text-[var(--color-on-surface)]">{email}</strong>. Copy and share it:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-3 py-2">
              <span className="text-xs text-[var(--color-on-surface)] truncate flex-1 font-mono">{inviteUrl}</span>
              <button onClick={handleCopy} className="flex-shrink-0 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)] font-body">Link expires in 72 hours.</p>
            <button onClick={onClose} className="w-full py-2 rounded-lg text-sm font-semibold border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-all">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateChannelModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { setActiveChannel } = useAppStore();
  const { mutateAsync: createChannel, isPending } = useCreateChannel(workspaceId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed) return;
    try {
      const channel = await createChannel({ name: trimmed, is_private: isPrivate });
      setActiveChannel(channel.id);
      toast.success(`#${channel.name} created`);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Failed to create channel";
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card-nested w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-[var(--color-on-surface)]">Create channel</h3>
          <button onClick={onClose} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">Channel name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. announcements"
              className="w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] transition-colors font-body"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-[var(--color-on-surface-variant)] font-body">Private channel</span>
          </label>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: "var(--color-primary)" }}
          >
            {isPending ? "Creating…" : "Create channel"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProfileDropdown({
  user,
  onSettings,
  onLogout,
}: {
  user: { name: string; email: string; avatar_url: string | null; status: string } | null;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={user?.name}
        className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center mt-2 relative"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
        ) : (
          <span className="text-white font-semibold text-xs font-body">{user?.name?.[0]?.toUpperCase()}</span>
        )}
        <span
          className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border-2"
          style={{
            background: user?.status === "online" ? "var(--color-accent-green)" : user?.status === "away" ? "var(--color-accent-amber)" : user?.status === "busy" ? "var(--color-error)" : "#737781",
            borderColor: "var(--color-primary)",
          }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-12 left-0 z-50 w-56 card-nested py-1 shadow-xl"
            style={{ background: "var(--color-surface-container-high)" }}
          >
            <div className="px-3 py-2 border-b border-[rgba(194,198,209,0.12)]">
              <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate">{user?.name}</p>
              <p className="text-xs text-[var(--color-on-surface-variant)] truncate">{(user as any)?.email}</p>
            </div>
            <button
              onClick={() => { onSettings(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              Profile &amp; Settings
            </button>
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChannelsDMsList({
  channels,
  conversations,
  activeChannelId,
  activeDMConversationId,
  activeSection,
  user,
  setActiveChannel,
  setActiveSection,
  onNavigate,
  onAddChannel,
}: {
  channels: any[];
  conversations: any[];
  activeChannelId: string | null;
  activeDMConversationId: string | null;
  activeSection: string;
  user: any;
  setActiveChannel: (id: string) => void;
  setActiveSection: (s: AppSection) => void;
  onNavigate?: () => void;
  onAddChannel?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4 hide-scrollbar">
      <div>
        <div className="flex items-center gap-2 px-2 mb-1">
          <div className="accent-pill" style={{ background: "var(--color-accent-teal)" }} />
          <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Channels</span>
          <button
            onClick={() => { onAddChannel?.(); onNavigate?.(); }}
            title="New channel"
            className="ml-auto text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => { setActiveChannel(ch.id); onNavigate?.(); }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
                activeChannelId === ch.id && activeSection === "channel"
                  ? "sidebar-item-active text-[var(--color-on-surface)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
              )}
            >
              <Hash className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
              <span className="truncate font-body">{ch.name}</span>
              {ch.unread > 0 && (
                <span className="ml-auto bg-[var(--color-primary)] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 font-semibold">
                  {ch.unread > 9 ? "9+" : ch.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 px-2 mb-1">
          <div className="accent-pill" style={{ background: "var(--color-accent-green)" }} />
          <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Direct Messages</span>
        </div>
        <div className="space-y-0.5">
          {conversations.map((conv) => {
            const other = conv.participants.find((p: any) => p.user_id !== user?.id) || conv.participants[0];
            const isActive = activeDMConversationId === conv.id && activeSection === "dm";
            return (
              <button
                key={conv.id}
                onClick={() => { useAppStore.getState().setActiveDMConversation(conv.id); onNavigate?.(); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-left transition-colors",
                  isActive
                    ? "sidebar-item-active text-[var(--color-on-surface)]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-xs font-semibold font-body text-[var(--color-on-surface)]">
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
    </div>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();
  const { activeSection, activeWorkspaceId, activeChannelId, activeDMConversationId, setActiveSection, setActiveChannel, setActiveWorkspace } = useAppStore();
  const { user, logout } = useAuth();
  const { data: workspaces = [] } = useWorkspaces();
  const { data: channels = [] } = useChannels(activeWorkspaceId || "");
  const { data: conversations = [] } = useDMConversations(activeWorkspaceId || "");
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const showSecondarySidebar = activeSection === "channel" || activeSection === "dm";

  const closeMobile = () => setMobileOpen(false);

  const sharedListProps = {
    channels,
    conversations,
    activeChannelId,
    activeDMConversationId: activeDMConversationId || null,
    activeSection,
    user,
    setActiveChannel,
    setActiveSection,
    onAddChannel: () => setShowCreateChannelModal(true),
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <>
      {/* ── MOBILE: Fixed top header (lg:hidden) ── */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-4 border-b border-white/10"
        style={{ background: "var(--color-primary)" }}
      >
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-9 h-9 flex items-center justify-center text-white/80 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Open menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <span className="font-display font-bold text-white text-sm truncate max-w-[140px]">
          {activeWs?.name || "Lively"}
        </span>

        <button
          onClick={() => { setActiveSection("settings"); closeMobile(); }}
          className="w-9 h-9 flex items-center justify-center text-white/80 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* ── MOBILE: Slide-in drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" onClick={closeMobile}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative mt-14 w-72 flex flex-col overflow-hidden shadow-xl animate-fade-in"
            style={{ background: "var(--color-surface-container-low)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Workspace + search header */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-[rgba(194,198,209,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-[var(--color-on-surface)] truncate text-sm">
                  {activeWs?.name || "Lively"}
                </h2>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-on-surface-variant)] flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 bg-[var(--color-surface-container)] rounded-md px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-[var(--color-outline)]" />
                <input placeholder="Search" className="bg-transparent text-xs text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none w-full font-body" />
              </div>
            </div>

            {/* Section nav */}
            <div className="flex-shrink-0 px-2 pt-3 pb-2 border-b border-[rgba(194,198,209,0.15)]">
              <p className="px-2 mb-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Sections</p>
              <div className="space-y-0.5">
                {NAV_ITEMS.map(({ icon: Icon, section, label, accentColor }) => (
                  <button
                    key={section}
                    onClick={() => { setActiveSection(section); closeMobile(); }}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded text-sm text-left transition-colors w-full",
                      activeSection === section
                        ? "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]"
                        : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accentColor }} />
                    <span className="font-body">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <ChannelsDMsList {...sharedListProps} onNavigate={closeMobile} />
          </div>
        </div>
      )}

      {/* ── DESKTOP: Full sidebar (hidden on mobile) ── */}
      <div className="hidden lg:flex h-screen flex-shrink-0 overflow-hidden">
        {/* Primary rail — 64px dark navy */}
        <div
          className="w-16 flex flex-col items-center py-4 gap-1 flex-shrink-0 relative"
          style={{ background: "var(--color-primary)" }}
        >
          {/* Workspace switcher */}
          <button
            onClick={() => setWsMenuOpen(!wsMenuOpen)}
            className="w-10 h-10 rounded-md bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center mb-3 relative"
          >
            <span className="font-display font-bold text-white text-sm">
              {activeWs?.name?.[0]?.toUpperCase() || "L"}
            </span>
          </button>

          {/* Section nav */}
          {NAV_ITEMS.map(({ icon: Icon, section, label }) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              title={label}
              className={cn(
                "w-10 h-10 rounded-md flex items-center justify-center transition-all relative group",
                activeSection === section ? "bg-white/20" : "hover:bg-white/10"
              )}
            >
              <Icon className="w-5 h-5 text-white/80" />
              {activeSection === section && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-1.5 h-5 bg-white rounded-full" />
              )}
            </button>
          ))}

          <div className="flex-1" />

          {/* Settings */}
          <button
            onClick={() => setActiveSection("settings")}
            title="Settings"
            className={cn(
              "w-10 h-10 rounded-md flex items-center justify-center transition-all",
              activeSection === "settings" ? "bg-white/20" : "hover:bg-white/10"
            )}
          >
            <Settings className="w-5 h-5 text-white/70" />
          </button>

          {/* User avatar with profile dropdown */}
          <ProfileDropdown
            user={user as any}
            onSettings={() => setActiveSection("settings")}
            onLogout={handleLogout}
          />
        </div>

        {/* Workspace menu dropdown */}
        {wsMenuOpen && (
          <div
            className="absolute left-16 top-4 z-50 card-nested w-60 py-2"
            onMouseLeave={() => setWsMenuOpen(false)}
          >
            <p className="px-3 py-1 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">Workspaces</p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws.id); setWsMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors rounded-sm mx-1",
                  ws.id === activeWorkspaceId ? "bg-[var(--color-surface-container-high)]" : "hover:bg-[var(--color-surface-container)]"
                )}
              >
                <div className="w-7 h-7 rounded bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold font-display flex-shrink-0">
                  {ws.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-on-surface)] truncate">{ws.name}</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{ws.members_online} online</p>
                </div>
              </button>
            ))}

            <div className="h-px bg-[var(--color-outline-variant)] mx-3 my-2" />

            <button
              onClick={() => { navigate("/onboarding"); setWsMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors rounded-sm mx-1"
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              Create workspace
            </button>

            {activeWorkspaceId && (
              <button
                onClick={() => { setShowInviteModal(true); setWsMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)] transition-colors rounded-sm mx-1"
              >
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                Invite members
              </button>
            )}
          </div>
        )}

        {/* Secondary sidebar — only for channel/DM sections */}
        {showSecondarySidebar && (
          <div
            className="w-[260px] flex flex-col h-screen overflow-hidden flex-shrink-0 border-r border-[rgba(194,198,209,0.12)]"
            style={{ background: "var(--color-surface-container-low)" }}
          >
            {/* Workspace name + search */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-[var(--color-on-surface)] truncate text-sm">
                  {activeWs?.name || "Lively"}
                </h2>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-on-surface-variant)] flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 bg-[var(--color-surface-container)] rounded-md px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-[var(--color-outline)]" />
                <input placeholder="Search" className="bg-transparent text-xs text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none w-full font-body" />
              </div>
            </div>

            <ChannelsDMsList {...sharedListProps} />
          </div>
        )}
      </div>

      {showInviteModal && activeWorkspaceId && (
        <InviteModal workspaceId={activeWorkspaceId} onClose={() => setShowInviteModal(false)} />
      )}

      {showCreateChannelModal && activeWorkspaceId && (
        <CreateChannelModal workspaceId={activeWorkspaceId} onClose={() => setShowCreateChannelModal(false)} />
      )}
    </>
  );
}
