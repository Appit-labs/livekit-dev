import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageTransition } from "@/components/animations/PageTransition";
import { useAppStore } from "@/hooks/useAppStore";
import { useWorkspaces } from "@/api/workspaces";
import MessengerView from "@/components/views/MessengerView";
import DMView from "@/components/views/DMView";
import ThreadsView from "@/components/views/ThreadsView";
import BundleView from "@/components/views/BundleView";
import DraftsView from "@/components/views/DraftsView";
import DirectoriesView from "@/components/views/DirectoriesView";
import BoardView from "@/components/views/BoardView";
import TasksView from "@/components/views/TasksView";
import CalendarView from "@/components/views/CalendarView";
import SettingsView from "@/components/views/SettingsView";
import BoardReports from "@/components/views/BoardReports";

const SECTION_VIEWS: Record<string, React.ReactNode> = {
  channel: <MessengerView />,
  dm: <DMView />,
  threads: <ThreadsView />,
  bundle: <BundleView />,
  drafts: <DraftsView />,
  directories: <DirectoriesView />,
  board: <BoardView />,
  tasks: <TasksView />,
  calendar: <CalendarView />,
  settings: <SettingsView />,
  reports: <BoardReports />,
};

export default function Index() {
  const navigate = useNavigate();
  const { activeSection, activeWorkspaceId, setActiveWorkspace } = useAppStore();
  const { data: workspaces, isLoading } = useWorkspaces();

  useEffect(() => {
    if (isLoading) return;
    if (!workspaces?.length) {
      navigate("/onboarding", { replace: true });
      return;
    }
    if (!activeWorkspaceId) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [workspaces, isLoading, activeWorkspaceId, setActiveWorkspace, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-surface)]">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-hidden bg-[var(--color-surface-container)] flex flex-col">
        {/* Spacer offsets fixed mobile header — invisible on desktop */}
        <div className="h-14 flex-shrink-0 lg:hidden" />
        <div className="flex-1 min-h-0 overflow-hidden">
          <PageTransition transitionKey={activeSection}>
            {SECTION_VIEWS[activeSection] ?? <MessengerView />}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
