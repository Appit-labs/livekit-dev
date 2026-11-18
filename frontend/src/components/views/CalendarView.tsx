import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { useAppStore } from "@/hooks/useAppStore";
import { useCalendarEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/api/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting: "var(--color-primary)",
  personal: "var(--color-accent-teal)",
  team: "var(--color-accent-green)",
  deadline: "var(--color-error)",
  holiday: "var(--color-accent-amber)",
};

const EVENT_TYPES = ["meeting", "personal", "team", "deadline", "holiday"] as const;

type ViewMode = "month" | "week" | "day";

interface EventFormState {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: CalendarEvent["event_type"];
}

const DEFAULT_FORM: EventFormState = {
  title: "",
  event_date: format(new Date(), "yyyy-MM-dd"),
  start_time: "09:00:00",
  end_time: "10:00:00",
  event_type: "meeting",
};

function toTimeInput(hms: string) {
  return hms.slice(0, 5);
}

function fromTimeInput(hm: string): string {
  return hm.length === 5 ? hm + ":00" : hm;
}

function EventModal({
  open,
  onClose,
  editEvent,
  defaultDate,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  editEvent: CalendarEvent | null;
  defaultDate: string | null;
  workspaceId: string;
}) {
  const createEvent = useCreateEvent(workspaceId);
  const updateEvent = useUpdateEvent(workspaceId);
  const deleteEvent = useDeleteEvent(workspaceId);

  const [form, setForm] = useState<EventFormState>(() =>
    editEvent
      ? {
          title: editEvent.title,
          event_date: editEvent.event_date,
          start_time: editEvent.start_time,
          end_time: editEvent.end_time,
          event_type: editEvent.event_type,
        }
      : { ...DEFAULT_FORM, event_date: defaultDate || DEFAULT_FORM.event_date }
  );

  const isPending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  const set = (field: keyof EventFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editEvent) {
        await updateEvent.mutateAsync({ eventId: editEvent.id, ...form });
        toast.success("Event updated");
      } else {
        await createEvent.mutateAsync(form);
        toast.success("Event created");
      }
      onClose();
    } catch {
      toast.error(editEvent ? "Failed to update event" : "Failed to create event");
    }
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    try {
      await deleteEvent.mutateAsync(editEvent.id);
      toast.success("Event deleted");
      onClose();
    } catch {
      toast.error("Failed to delete event");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[var(--color-surface-container)] border-[rgba(194,198,209,0.2)] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[var(--color-on-surface)]">
            {editEvent ? "Edit Event" : "New Event"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">Title</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Event title…"
              className="w-full bg-[var(--color-surface-container-lowest)] rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">Date</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
              className="w-full bg-[var(--color-surface-container-lowest)] rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">Start time</label>
              <input
                type="time"
                value={toTimeInput(form.start_time)}
                onChange={(e) => set("start_time", fromTimeInput(e.target.value))}
                className="w-full bg-[var(--color-surface-container-lowest)] rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">End time</label>
              <input
                type="time"
                value={toTimeInput(form.end_time)}
                onChange={(e) => set("end_time", fromTimeInput(e.target.value))}
                className="w-full bg-[var(--color-surface-container-lowest)] rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">Event type</label>
            <select
              value={form.event_type}
              onChange={(e) => set("event_type", e.target.value)}
              className="w-full bg-[var(--color-surface-container-lowest)] rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body border-0"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          {editEvent && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 hover:bg-[var(--color-error)]/20 transition-colors font-body mr-auto disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md text-sm text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container)] transition-colors font-body"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !form.title.trim()}
            className="btn-primary px-4 py-2 rounded-md text-sm font-semibold font-body disabled:opacity-60"
          >
            {isPending ? "Saving…" : editEvent ? "Save changes" : "Create event"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarView() {
  const { activeWorkspaceId } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const { data: events = [] } = useCalendarEvents(
    activeWorkspaceId || "",
    format(calStart, "yyyy-MM-dd"),
    format(calEnd, "yyyy-MM-dd")
  );

  const days = useMemo(() => {
    const result: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { result.push(day); day = addDays(day, 1); }
    return result;
  }, [calStart.getTime(), calEnd.getTime()]);

  const getEventsForDay = (date: Date) =>
    events.filter((e: CalendarEvent) => isSameDay(new Date(e.event_date), date));

  const openCreate = (date?: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date ? format(date, "yyyy-MM-dd") : null);
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 flex-shrink-0 border-b border-[rgba(194,198,209,0.15)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
          </button>
          <h2 className="font-display text-base font-semibold text-[var(--color-on-surface)] min-w-[120px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--color-surface-container)] transition-colors flex-shrink-0">
            <ChevronRight className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="hidden sm:block px-3 py-1.5 text-xs rounded bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors font-body flex-shrink-0">
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-surface-container)] rounded-md p-0.5">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn("px-2 sm:px-3 py-1 text-xs rounded font-body transition-all capitalize", viewMode === mode ? "bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] shadow-ghost" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]")}
              >
                {mode}
              </button>
            ))}
          </div>
          <button onClick={() => openCreate()} className="btn-primary flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold font-body hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Event</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-[rgba(194,198,209,0.15)] flex-shrink-0">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-2 text-center text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider font-body">
            <span className="sm:hidden">{d}</span>
            <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(4rem, 1fr)" }}>
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={i}
                onClick={() => openCreate(day)}
                className={cn(
                  "p-1 border-b border-r border-[rgba(194,198,209,0.1)] transition-colors overflow-hidden cursor-pointer hover:bg-[var(--color-surface-container)]/40",
                  !isCurrentMonth && "bg-[rgba(237,238,239,0.3)]"
                )}
              >
                <div className={cn(
                  "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-body mb-1 font-medium",
                  isToday ? "bg-[var(--color-primary)] text-white font-semibold" : isCurrentMonth ? "text-[var(--color-on-surface)]" : "text-[var(--color-outline)]"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(event); }}
                      className="text-xs px-1 sm:px-1.5 py-0.5 rounded truncate font-body cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: (EVENT_TYPE_COLORS[event.event_type] || "#737781") + "22", color: EVENT_TYPE_COLORS[event.event_type] || "#737781" }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-xs text-[var(--color-on-surface-variant)] font-body px-1">+{dayEvents.length - 2}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeWorkspaceId && (
        <EventModal
          open={modalOpen}
          onClose={closeModal}
          editEvent={selectedEvent}
          defaultDate={selectedDate}
          workspaceId={activeWorkspaceId}
        />
      )}
    </div>
  );
}
