import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppStore } from "@/hooks/useAppStore";
import { useBoardReports, useBoards } from "@/api/boards";
import { FadeSlide } from "@/components/animations/FadeSlide";

const COLORS = ["var(--color-accent-teal)", "var(--color-accent-green)", "var(--color-accent-amber)", "var(--color-accent-purple)", "var(--color-error)"];

export default function BoardReports() {
  const { activeWorkspaceId, activeBoardId } = useAppStore();
  const { data: boards = [] } = useBoards(activeWorkspaceId || "");
  const board = boards.find((b) => b.id === activeBoardId) || boards[0];
  const { data: reports, isLoading } = useBoardReports(activeWorkspaceId || "", board?.id || "");

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!reports) return null;

  return (
    <div className="h-full overflow-y-auto p-6 bg-[var(--color-surface-container-lowest)]">
      <h2 className="font-display text-xl font-semibold text-[var(--color-on-surface)] mb-6">Board Reports</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeSlide delay={0}>
          <div className="card-nested p-5">
            <h3 className="font-body font-semibold text-sm text-[var(--color-on-surface)] mb-4">Tasks by Column</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reports.summary.columns}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,209,0.3)" />
                <XAxis dataKey="column" tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
                <Tooltip contentStyle={{ background: "var(--color-surface-container-lowest)", border: "none", borderRadius: "0.5rem", boxShadow: "var(--shadow-ambient)" }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeSlide>

        <FadeSlide delay={100}>
          <div className="card-nested p-5">
            <h3 className="font-body font-semibold text-sm text-[var(--color-on-surface)] mb-4">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reports.priority} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={80}>
                  {reports.priority.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-surface-container-lowest)", border: "none", borderRadius: "0.5rem", boxShadow: "var(--shadow-ambient)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </FadeSlide>

        <FadeSlide delay={200} className="lg:col-span-2">
          <div className="card-nested p-5">
            <h3 className="font-body font-semibold text-sm text-[var(--color-on-surface)] mb-4">Weekly Velocity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={reports.velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(194,198,209,0.3)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }} />
                <Tooltip contentStyle={{ background: "var(--color-surface-container-lowest)", border: "none", borderRadius: "0.5rem", boxShadow: "var(--shadow-ambient)" }} />
                <Line type="monotone" dataKey="completed" stroke="var(--color-accent-teal)" strokeWidth={2} dot={{ fill: "var(--color-accent-teal)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FadeSlide>
      </div>
    </div>
  );
}
