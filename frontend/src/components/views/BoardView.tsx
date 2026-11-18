import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Clock, Columns } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/hooks/useAppStore";
import { useBoards, useBoard, useMoveTask, useCreateTask, useCreateColumn, useCreateBoard } from "@/api/boards";
import { FadeSlide } from "@/components/animations/FadeSlide";
import { ScaleSpring } from "@/components/animations/ScaleSpring";
import { cn } from "@/lib/utils";
import type { BoardTask, BoardColumn } from "@/types";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--color-error)",
  high: "var(--color-accent-amber)",
  medium: "var(--color-accent-teal)",
  low: "var(--color-accent-green)",
};

const DEFAULT_COLUMN_COLORS = [
  "#6B7FD7", "#E8754A", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
];

function TaskCard({ task, isDragging }: { task: BoardTask; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={cn("bg-[var(--color-surface-container-lowest)] rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-ghost hover:shadow-ambient transition-all group", isDragging && "shadow-ambient-lg")}
    >
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((l) => (
            <span key={l.id} className="text-xs px-1.5 py-0.5 rounded-full font-body font-medium" style={{ background: l.color + "22", color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm font-body text-[var(--color-on-surface)] leading-snug">{task.title}</p>
      <div className="flex items-center gap-2 mt-2.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[task.priority] || "#737781" }} />
        {task.due_date && (
          <div className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)] font-body">
            <Clock className="w-3 h-3" />
            {task.due_date}
          </div>
        )}
        {task.subtasks.length > 0 && (
          <span className="text-xs text-[var(--color-on-surface-variant)] font-body ml-auto">
            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </div>
  );
}

function ColumnPanel({ column, boardId }: { column: BoardColumn; boardId: string }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const createTask = useCreateTask(boardId);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createTask.mutateAsync({ column_id: column.id, title: newTitle.trim() });
    setNewTitle("");
    setAdding(false);
  };

  return (
    <div className="flex-shrink-0 w-64 flex flex-col rounded-xl overflow-hidden" style={{ background: "var(--color-surface-container)" }}>
      <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.color }} />
        <span className="font-semibold text-xs text-[var(--color-on-surface)] font-body uppercase tracking-wider flex-1">{column.title}</span>
        <span className="text-xs text-[var(--color-on-surface-variant)] font-body bg-[var(--color-surface-container-high)] rounded-full px-1.5 py-0.5">{column.tasks.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[4rem]">
        <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <ScaleSpring key={task.id} trigger={column.id} from={0.94} to={1} damping={16} stiffness={200} durationFrames={36}>
              <TaskCard task={task} />
            </ScaleSpring>
          ))}
        </SortableContext>
      </div>

      <div className="px-2 pb-2 flex-shrink-0">
        {adding ? (
          <div className="bg-[var(--color-surface-container-lowest)] rounded-lg p-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Task title…"
              className="w-full text-sm bg-transparent text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body"
            />
            <div className="flex gap-1 mt-1.5">
              <button onClick={handleAdd} className="btn-primary text-xs px-2 py-1 rounded font-body">Add</button>
              <button onClick={() => setAdding(false)} className="text-xs px-2 py-1 rounded bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] font-body">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-colors font-body">
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

function AddColumnPanel({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(DEFAULT_COLUMN_COLORS[0]);
  const createColumn = useCreateColumn(boardId);

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      await createColumn.mutateAsync({ title: title.trim(), color });
      setTitle("");
      setColor(DEFAULT_COLUMN_COLORS[0]);
      setOpen(false);
    } catch {
      toast.error("Failed to create column");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-64 h-10 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors font-body self-start mt-0"
      >
        <Plus className="w-4 h-4" />
        Add column
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-64 rounded-xl p-3 self-start" style={{ background: "var(--color-surface-container)" }}>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Column title…"
        className="w-full text-sm bg-[var(--color-surface-container-lowest)] rounded px-2.5 py-1.5 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body mb-2"
      />
      <div className="mb-3">
        <p className="text-xs text-[var(--color-on-surface-variant)] font-body mb-1.5">Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {DEFAULT_COLUMN_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn("w-6 h-6 rounded-full transition-transform", color === c && "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110")}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={createColumn.isPending || !title.trim()}
          className="btn-primary text-xs px-3 py-1.5 rounded font-body flex-1 disabled:opacity-60"
        >
          {createColumn.isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-body">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyBoardState({ workspaceId }: { workspaceId: string }) {
  const { setActiveBoard } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createBoard = useCreateBoard(workspaceId);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const board = await createBoard.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      setActiveBoard(board.id);
      toast.success("Board created");
    } catch {
      toast.error("Failed to create board");
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 bg-[var(--color-surface-container-lowest)] px-6">
      <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center">
        <Columns className="w-7 h-7 text-[var(--color-on-surface-variant)] opacity-50" />
      </div>
      {showForm ? (
        <div className="w-full max-w-sm bg-[var(--color-surface-container)] rounded-xl p-4 space-y-3">
          <p className="font-display font-semibold text-[var(--color-on-surface)] text-sm">Create your first board</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowForm(false); }}
            placeholder="Board name…"
            className="w-full text-sm bg-[var(--color-surface-container-lowest)] rounded px-3 py-2 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full text-sm bg-[var(--color-surface-container-lowest)] rounded px-3 py-2 text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none font-body"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createBoard.isPending || !name.trim()}
              className="btn-primary flex-1 px-3 py-2 rounded text-sm font-semibold font-body disabled:opacity-60"
            >
              {createBoard.isPending ? "Creating…" : "Create Board"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded text-sm bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-body">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-display font-semibold text-[var(--color-on-surface)] text-sm">Create your first board</p>
          <p className="font-body text-xs mt-1 text-[var(--color-on-surface-variant)] mb-4">Organize your work into columns and tasks</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 rounded-md text-sm font-semibold font-body">
            <Plus className="w-4 h-4 inline mr-1.5" />
            Create Board
          </button>
        </div>
      )}
    </div>
  );
}

export default function BoardView() {
  const { activeWorkspaceId, activeBoardId, setActiveBoard } = useAppStore();
  const { data: boardSummaries = [] } = useBoards(activeWorkspaceId || "");
  const activeBoardSummary = boardSummaries.find((b) => b.id === activeBoardId) || boardSummaries[0];
  const { data: board, isLoading } = useBoard(activeBoardSummary?.id || "");
  const moveTask = useMoveTask(activeBoardSummary?.id || "");
  const [dragTask, setDragTask] = useState<BoardTask | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const task = board?.columns.flatMap((c) => c.tasks).find((t) => t.id === e.active.id);
    setDragTask(task || null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setDragTask(null);
    const { active, over } = e;
    if (!over || active.id === over.id || !board) return;

    const targetColumn = board.columns.find((col) =>
      col.id === over.id || col.tasks.some((t) => t.id === over.id)
    );
    if (!targetColumn) return;

    const targetIdx = targetColumn.tasks.findIndex((t) => t.id === over.id);
    await moveTask.mutateAsync({
      task_id: String(active.id),
      target_column_id: targetColumn.id,
      position: targetIdx >= 0 ? targetIdx : targetColumn.tasks.length,
    });
  };

  if (!activeBoardSummary) {
    return <EmptyBoardState workspaceId={activeWorkspaceId || ""} />;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="flex items-center gap-3 px-4 sm:px-5 h-14 flex-shrink-0 border-b border-[rgba(194,198,209,0.15)] overflow-x-auto hide-scrollbar">
        <div className="flex gap-1 flex-shrink-0">
          {boardSummaries.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBoard(b.id)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium font-body transition-colors",
                b.id === activeBoardSummary.id ? "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 p-5 h-full">
              {board?.columns.map((col) => (
                <FadeSlide key={col.id} direction="up" delay={col.position * 50}>
                  <ColumnPanel column={col} boardId={board.id} />
                </FadeSlide>
              ))}
              {board && <AddColumnPanel boardId={board.id} />}
            </div>
            <DragOverlay>
              {dragTask && <TaskCard task={dragTask} isDragging />}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
