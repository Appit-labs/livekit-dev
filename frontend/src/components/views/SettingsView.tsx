import { useRef, useState } from "react";
import { User, Bell, Palette, Lock, Building, Plug, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/api/settings";
import { useAppearance, useUpdateAppearance } from "@/api/settings";
import { useUpdateProfile, useUploadAvatar } from "@/api/users";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "notifications" | "appearance" | "security" | "workspace" | "integrations";

const TABS: { id: SettingsTab; icon: React.ElementType; label: string }[] = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "appearance", icon: Palette, label: "Appearance" },
  { id: "security", icon: Lock, label: "Security" },
  { id: "workspace", icon: Building, label: "Workspace" },
  { id: "integrations", icon: Plug, label: "Integrations" },
];

function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [title, setTitle] = useState(user?.title || "");
  const [department, setDepartment] = useState(user?.department || "");

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, title, department });
      await refreshUser();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      await refreshUser();
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    }
    e.target.value = "";
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-[var(--color-on-surface)]">Profile</h2>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5 font-body">Update your personal information</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group flex-shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center font-display font-bold text-2xl text-[var(--color-primary)] overflow-hidden relative"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              user?.name?.[0]?.toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-on-surface)] font-body">{user?.name}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)] font-body">{user?.email}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="text-xs text-[var(--color-primary)] hover:underline mt-1 font-body disabled:opacity-60"
          >
            {uploadAvatar.isPending ? "Uploading…" : "Change photo"}
          </button>
        </div>
      </div>

      {[
        { label: "Full name", value: name, onChange: setName },
        { label: "Title", value: title, onChange: setTitle },
        { label: "Department", value: department, onChange: setDepartment },
      ].map(({ label, value, onChange }) => (
        <div key={label}>
          <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-1.5">{label}</label>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[var(--color-surface-container)] rounded-md px-3 py-2 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] font-body"
          />
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={updateProfile.isPending}
        className="btn-primary px-4 py-2 rounded-md text-sm font-semibold font-body hover:opacity-90 disabled:opacity-60"
      >
        {updateProfile.isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function NotificationsTab() {
  const { data: prefs } = useNotificationPrefs();
  const updatePrefs = useUpdateNotificationPrefs();

  const toggle = (key: string, current: boolean) => {
    updatePrefs.mutate({ [key]: !current }, {
      onError: () => toast.error("Failed to update notification preferences"),
    });
  };

  if (!prefs) return null;

  const items = [
    { key: "email_messages", label: "Email notifications for messages", value: prefs.email_messages },
    { key: "email_mentions", label: "Email notifications for mentions", value: prefs.email_mentions },
    { key: "push_messages", label: "Push notifications for messages", value: prefs.push_messages },
    { key: "push_mentions", label: "Push notifications for mentions", value: prefs.push_mentions },
    { key: "sound_enabled", label: "Sound notifications", value: prefs.sound_enabled },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-[var(--color-on-surface)]">Notifications</h2>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5 font-body">Control how you receive notifications</p>
      </div>
      {items.map(({ key, label, value }) => (
        <div key={key} className="flex items-center justify-between py-3 border-b border-[rgba(194,198,209,0.15)]">
          <span className="text-sm text-[var(--color-on-surface)] font-body">{label}</span>
          <button
            onClick={() => toggle(key, value)}
            disabled={updatePrefs.isPending}
            className={cn("w-10 h-5 rounded-full transition-colors relative disabled:opacity-60", value ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface-container-high)]")}
          >
            <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", value ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>
      ))}
    </div>
  );
}

function AppearanceTab() {
  const { data: appearance } = useAppearance();
  const updateAppearance = useUpdateAppearance();

  const applyTheme = (theme: string) => {
    document.documentElement.setAttribute("data-theme", theme);
    updateAppearance.mutate({ theme: theme as "light" | "dark" | "system" }, {
      onError: () => toast.error("Failed to update appearance"),
    });
  };

  if (!appearance) return null;

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-[var(--color-on-surface)]">Appearance</h2>
        <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5 font-body">Customize how Lively looks</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-on-surface-variant)] mb-2">Theme</label>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => applyTheme(theme)}
              className={cn(
                "flex-1 py-3 rounded-lg text-sm font-medium font-body capitalize border-2 transition-all",
                appearance.theme === theme
                  ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[rgba(194,198,209,0.3)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline)]"
              )}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-on-surface)] font-body">Compact mode</p>
          <p className="text-xs text-[var(--color-on-surface-variant)] font-body">Show more content with less spacing</p>
        </div>
        <button
          onClick={() => updateAppearance.mutate({ compact_mode: !appearance.compact_mode })}
          className={cn("w-10 h-5 rounded-full transition-colors relative", appearance.compact_mode ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface-container-high)]")}
        >
          <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", appearance.compact_mode ? "translate-x-5" : "translate-x-0.5")} />
        </button>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-lg">
      <h2 className="font-display text-lg font-semibold text-[var(--color-on-surface)]">{title}</h2>
      <p className="text-sm text-[var(--color-on-surface-variant)] mt-0.5 font-body">{description}</p>
      <div className="mt-6 p-8 rounded-xl bg-[var(--color-surface-container)] text-center">
        <p className="text-sm text-[var(--color-on-surface-variant)] font-body">Coming soon</p>
      </div>
    </div>
  );
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const tabContent: Record<SettingsTab, React.ReactNode> = {
    profile: <ProfileTab />,
    notifications: <NotificationsTab />,
    appearance: <AppearanceTab />,
    security: <PlaceholderTab title="Security" description="Manage your password and two-factor authentication" />,
    workspace: <PlaceholderTab title="Workspace" description="Configure your workspace settings" />,
    integrations: <PlaceholderTab title="Integrations" description="Connect third-party services to your workspace" />,
  };

  return (
    <div className="h-full flex flex-col sm:flex-row bg-[var(--color-surface-container-lowest)]">
      <div className="flex-shrink-0 sm:w-48 border-b sm:border-b-0 sm:border-r border-[rgba(194,198,209,0.15)]">
        <div className="flex sm:flex-col gap-1 overflow-x-auto hide-scrollbar px-3 py-3 sm:py-6 sm:px-3">
          <p className="hidden sm:block text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider px-2 mb-1 font-body">Settings</p>
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-2 py-1.5 sm:py-2 rounded text-sm font-body transition-colors text-left whitespace-nowrap",
                activeTab === id
                  ? "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-medium"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
