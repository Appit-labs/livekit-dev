import { useState } from "react";
import { Phone, PhoneOff, Video, Plus, Users } from "lucide-react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { toast } from "sonner";
import { useAppStore } from "@/hooks/useAppStore";
import { useCallRooms, useCreateCallRoom, useJoinRoom, useLeaveRoom } from "@/api/calls";
import type { JoinRoomResponse } from "@/api/calls";

export default function BundleView() {
  const { activeWorkspaceId } = useAppStore();
  const [callSession, setCallSession] = useState<JoinRoomResponse | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState("");

  const { data: rooms = [], isLoading } = useCallRooms(activeWorkspaceId || "");
  const createRoom = useCreateCallRoom(activeWorkspaceId || "");
  const joinRoom = useJoinRoom();
  const leaveRoom = useLeaveRoom();

  const handleCreateAndJoin = async () => {
    if (!roomName.trim()) return;
    try {
      const room = await createRoom.mutateAsync(roomName.trim());
      const session = await joinRoom.mutateAsync(room.id);
      setCallSession(session);
      setShowCreateForm(false);
      setRoomName("");
    } catch {
      toast.error("Failed to create call");
    }
  };

  const handleJoin = async (roomId: string) => {
    try {
      const session = await joinRoom.mutateAsync(roomId);
      setCallSession(session);
    } catch {
      toast.error("Failed to join call");
    }
  };

  const handleLeave = async () => {
    if (!callSession) return;
    try {
      await leaveRoom.mutateAsync(callSession.room_id);
    } finally {
      setCallSession(null);
    }
  };

  if (callSession) {
    return (
      <div className="flex-1 h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-[var(--color-on-surface)] text-sm">{callSession.room_name}</p>
              <p className="text-xs text-green-400">Connected</p>
            </div>
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            <PhoneOff className="w-4 h-4" />
            Leave Call
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <LiveKitRoom
            token={callSession.token}
            serverUrl={callSession.livekit_url}
            connect
            onDisconnected={handleLeave}
            onError={() => toast.error("Call connection error")}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--color-surface-container-lowest)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h1 className="font-display font-semibold text-[var(--color-on-surface)] text-lg">Calls</h1>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">Start or join a call with your team</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Call
        </button>
      </div>

      {showCreateForm && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-[var(--color-surface-container)] border border-white/10">
          <p className="text-sm font-medium text-[var(--color-on-surface)] mb-3">Start a new call</p>
          <input
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-on-surface)] text-sm placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] mb-3"
            placeholder="Call name (e.g. Team standup)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAndJoin()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateAndJoin}
              disabled={!roomName.trim() || createRoom.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <Phone className="w-4 h-4" />
              Start Call
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setRoomName(""); }}
              className="px-4 py-2 rounded-lg text-[var(--color-on-surface-variant)] text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center">
              <Video className="w-7 h-7 text-[var(--color-on-surface-variant)] opacity-50" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-[var(--color-on-surface)] text-sm">No active calls</p>
              <p className="font-body text-xs mt-1 text-[var(--color-on-surface-variant)]">Start a new call to collaborate with your team</p>
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-on-surface)] text-sm">{room.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-[var(--color-on-surface-variant)]">Active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleJoin(room.id)}
                disabled={joinRoom.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                Join
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
