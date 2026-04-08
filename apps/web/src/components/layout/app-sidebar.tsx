import { lazy, Suspense } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Reposcope</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon-sm">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1">
          <SidebarMenu>
            {PLACEHOLDER_CHATS.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton>
                  <MessageSquare className="size-4" />
                  <span>{chat.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {LazyUserButton ? (
          <Suspense fallback={null}>
            <LazyUserButton />
          </Suspense>
        ) : (
          <span className="text-xs text-muted-foreground">Dev Mode</span>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
