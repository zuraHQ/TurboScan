import { lazy, Suspense } from "react";
import { MessageSquare, Plus, PanelLeftClose, PanelLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const LazyUserButton = hasClerk
  ? lazy(async () => {
      const { UserButton } = await import("@clerk/clerk-react");
      return { default: () => <UserButton afterSignOutUrl="/" /> };
    })
  : null;

const PLACEHOLDER_CHATS = [
  { id: "1", title: "React project analysis" },
  { id: "2", title: "API architecture review" },
  { id: "3", title: "Bug hunt in auth module" },
];

interface AppSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function AppSidebar({ open, onToggle }: AppSidebarProps) {
  if (!open) return null;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-base-200">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-semibold">Reposcope</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm btn-square" onClick={onToggle}>
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>
      <div className="px-3">
        <button className="btn btn-primary btn-sm w-full gap-2">
          <Plus className="size-4" />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="menu menu-sm w-full">
          {PLACEHOLDER_CHATS.map((chat) => (
            <li key={chat.id}>
              <a>
                <MessageSquare className="size-4" />
                {chat.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4">
        {LazyUserButton ? (
          <Suspense fallback={null}>
            <LazyUserButton />
          </Suspense>
        ) : (
          <span className="text-xs opacity-60">Dev Mode</span>
        )}
      </div>
    </aside>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn btn-ghost btn-sm btn-square" onClick={onClick}>
      <PanelLeft className="size-4" />
    </button>
  );
}
