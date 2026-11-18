import { useState } from "react";
import { Search, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAssignedTasks, useCompleteAssignedTask } from "@/api/boards";
import { ListStagger } from "@/components/animations/ListStagger";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { BoardTask } from "@/types";

const PRIORITY_STYLES: Record<string, { bg: string; label: string }> = {
  urgent: { bg: "var(--color-error)", label: "Urgent" },
  high: { bg: "var(--color-accent-amber)", label: "High" },
  medium: { bg: "var(--color-accent-teal)", label: "Medium" },
  low: { bg: "var(--color-accent-green)", label: "Low" },
};

type StatusFilter = "all" | "todo" | "in_progress" | "done";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

function matchesStatusFilter(task: BoardTask, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "todo") return task.priority === "low";
  if (filter === "in_progress") return task.priority === "medium" || task.priority === "high";
  if (filter === "done") return task.priority === "urgent";
  return true;
}

function TaskRow({ task, onComplete }: { task: BoardTask; onComplete: (task: BoardTask) => void }) {
  const priority = PRIORITY_STYLES[task.priority];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-container-lowest)] rounded-lg shadow-ghost hover:shadow-ambient transition-shadow group">
      <button
        onClick={() => onComplete(task)}
        className="w-5 h-5 rounded-full border-2 border-[var(--color-outline-variant)] flex-shrink-0 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors flex items-center justify-center"
        title="Mark complete"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <span className="flex-1 text-sm text-[var(--color-on-surface)] font-body">{task.title}</span>
      {task.board_name && (
        <span className="text-xs text-[var(--color-on-surface-variant)] font-body bg-[var(--color-surface-container)] px-1.5 py-0.5 rounded hidden sm:inline-block">
          {task.board_name}
        </span>
      )}
      {priority && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-body font-medium flex-shrink-0"
          style={{ background: priority.bg + "22", color: priority.bg }}
        >
          {priority.label}
        </span>
      )}
      {task.due_date && (
        <div className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)] font-body flex-shrink-0">
          <Clock className="w-3 h-3" />
          {task.due_date}
        </div>
      )}
    </div>
  );
}

export default function TasksView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const debouncedSearch = useDebounce(search, 300);
  const { data: tasks = [], isLoading } = useAssignedTasks();
  const completeTask = useCompleteAssignedTask();

  const filtered = tasks.filter((t: BoardTask) => {
    const matchSearch = !debouncedSearch || t.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = matchesStatusFilter(t, statusFilter);
    return matchSearch && matchStatus;
  });

  const handleComplete = async (task: BoardTask) => {
    if (!task.board_id) {
      toast.error("Cannot complete this task: board info unavailable");
      return;
    }
    try {
      await completeTask.mutateAsync({ boardId: task.board_id, taskId: task.id });
      toast.success("Task completed");
    } catch {
      toast.error("Failed to complete task");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="px-4 sm:px-6 pt-5 pb-4 flex-shrink-0 border-b border-[rgba(194,198,209,0.15)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl font-semibold text-[var(--color-on-surface)]">My Tasks</h1>
          <span className="text-sm text-[var(--color-on-surface-variant)] font-body">{filtered.length} tasks</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 bg-[var(--color-surface-container)] rounded-md px-3 py-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-[var(--color-outline)] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto hide-scrollbar flex-shrink-0">
            {STATUS_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setStatusFilter(statusFilter === id ? "all" : id)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium font-body transition-all",
                  statusFilter === id
                    ? "bg-[var(--color-primary)] text-white shadow-ambient"
                    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <AlertCircle className="w-10 h-10 text-[var(--color-outline)] opacity-50 mb-3" />
            <p className="text-sm text-[var(--color-on-surface-variant)] font-body">No tasks assigned to you</p>
          </div>
        ) : (
          <ListStagger
            items={filtered.map((task: BoardTask) => (
              <TaskRow key={task.id} task={task} onComplete={handleComplete} />
            ))}
            className="space-y-2"
            staggerMs={30}
          />
        )}
      </div>
    </div>
  );
}
