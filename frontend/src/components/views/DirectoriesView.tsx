import { useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/hooks/useAppStore";
import { useWorkspaceMembers } from "@/api/workspaces";
import { useCreateDMConversation } from "@/api/dm";
import { useDebounce } from "@/hooks/useDebounce";
import { ListStagger } from "@/components/animations/ListStagger";
import type { User } from "@/types";

const STATUS_ORDER: Record<string, number> = {
  online: 0,
  away: 1,
  busy: 2,
  offline: 3,
};

const STATUS_COLORS: Record<string, string> = {
  online: "var(--color-accent-green)",
  away: "var(--color-accent-amber)",
  busy: "var(--color-error)",
  offline: "var(--color-outline)",
};

function MemberCard({
  member,
  onMessage,
}: {
  member: User & { role: string };
  onMessage: (userId: string) => void;
}) {
  return (
    <div className="card-nested p-4 hover:shadow-ambient-lg transition-shadow">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center font-display font-bold text-lg text-[var(--color-primary)]"
            style={{ boxShadow: `0 0 0 2px var(--color-surface-container-lowest), 0 0 0 4px ${STATUS_COLORS[member.status] || STATUS_COLORS.offline}` }}
          >
            {member.avatar_url ? (
              <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              member.name[0]?.toUpperCase()
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--color-on-surface)] font-body truncate">{member.name}</p>
          {member.title && <p className="text-xs text-[var(--color-on-surface-variant)] truncate font-body">{member.title}</p>}
          {member.department && (
            <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-body">
              {member.department}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onMessage(member.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-[var(--color-surface-container)] text-xs text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors font-body"
        >
          <MessageSquare className="w-3 h-3" />
          Message
        </button>
      </div>
    </div>
  );
}

export default function DirectoriesView() {
  const { activeWorkspaceId, setActiveDMConversation } = useAppStore();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string | undefined>();
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useWorkspaceMembers(activeWorkspaceId || "", {
    q: debouncedQuery || undefined,
    department,
    size: 100,
  });

  const createDM = useCreateDMConversation(activeWorkspaceId || "");

  const rawMembers: (User & { role: string })[] = data?.items || [];

  const members = [...rawMembers].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });

  const departments = [...new Set(rawMembers.map((m) => m.department).filter((d): d is string => !!d))];

  const handleMessage = async (userId: string) => {
    try {
      const conversation = await createDM.mutateAsync([userId]);
      setActiveDMConversation(conversation.id);
    } catch {
      toast.error("Failed to open conversation");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="px-4 sm:px-6 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-semibold text-[var(--color-on-surface)]">Directory</h1>
          <span className="text-sm text-[var(--color-on-surface-variant)] font-body">{data?.total || 0} members</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface-container)] rounded-md px-3 py-2 min-w-0">
            <Search className="w-4 h-4 text-[var(--color-outline)] flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or title…"
              className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body"
            />
          </div>
          <select
            value={department || ""}
            onChange={(e) => setDepartment(e.target.value || undefined)}
            className="bg-[var(--color-surface-container)] border-0 rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body flex-shrink-0"
          >
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ListStagger
            items={members.map((m) => <MemberCard key={m.id} member={m} onMessage={handleMessage} />)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            staggerMs={30}
            trigger={debouncedQuery + department}
          />
        )}
      </div>
    </div>
  );
}
