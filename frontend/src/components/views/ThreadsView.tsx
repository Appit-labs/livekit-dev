import { MessageSquare } from "lucide-react";
import { FadeSlide } from "@/components/animations/FadeSlide";

export default function ThreadsView() {
  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="px-6 pt-6 pb-4 border-b border-[rgba(194,198,209,0.15)] flex-shrink-0">
        <h1 className="font-display text-xl font-semibold text-[var(--color-on-surface)]">Threads</h1>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5 font-body">Conversations you're following</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <FadeSlide>
          <div className="text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[var(--color-outline)] opacity-50" />
            <p className="text-sm text-[var(--color-on-surface-variant)] font-body">No threads yet</p>
            <p className="text-xs text-[var(--color-outline)] mt-1 font-body">Reply to a message to start a thread</p>
          </div>
        </FadeSlide>
      </div>
    </div>
  );
}
