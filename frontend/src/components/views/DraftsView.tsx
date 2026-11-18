import { useState } from "react";
import { FileText, Send, Trash2 } from "lucide-react";
import { useDrafts, useDeleteDraft } from "@/api/drafts";
import { FadeSlide } from "@/components/animations/FadeSlide";
import { ListStagger } from "@/components/animations/ListStagger";
import { format } from "date-fns";
import type { Draft } from "@/types";

function DraftCard({ draft, onDelete }: { draft: Draft; onDelete: () => void }) {
  return (
    <div className="bg-[var(--color-surface-container-lowest)] rounded-lg p-4 shadow-ghost hover:shadow-ambient transition-shadow group">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[var(--color-on-surface)] font-body line-clamp-2 flex-1">{draft.content}</p>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-[var(--color-on-surface-variant)] mt-2 font-body">
        {format(new Date(draft.updated_at), "MMM d, h:mm a")}
      </p>
    </div>
  );
}

export default function DraftsView() {
  const [activeTab, setActiveTab] = useState<"drafts" | "sent">("drafts");
  const { data: items = [], isLoading } = useDrafts(activeTab === "sent");
  const deleteDraft = useDeleteDraft();

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="px-6 pt-6 pb-0 flex-shrink-0">
        <h1 className="font-display text-xl font-semibold text-[var(--color-on-surface)]">Drafts</h1>
        <div className="flex gap-1 mt-4">
          {(["drafts", "sent"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium font-body rounded-md transition-colors capitalize ${
                activeTab === tab ? "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <FadeSlide>
            <div className="flex flex-col items-center justify-center h-48">
              {activeTab === "drafts" ? <FileText className="w-10 h-10 text-[var(--color-outline)] opacity-50 mb-3" /> : <Send className="w-10 h-10 text-[var(--color-outline)] opacity-50 mb-3" />}
              <p className="text-sm text-[var(--color-on-surface-variant)] font-body">No {activeTab} yet</p>
            </div>
          </FadeSlide>
        ) : (
          <ListStagger
            items={items.map((draft) => <DraftCard key={draft.id} draft={draft} onDelete={() => deleteDraft.mutate(draft.id)} />)}
            className="space-y-3"
            staggerMs={40}
            trigger={activeTab}
          />
        )}
      </div>
    </div>
  );
}
