import { UserButton } from "@clerk/clerk-react";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

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
          <span className="text-sm font-semibold text-foreground">
            Reposcope
          </span>
          <Button variant="ghost" size="icon-sm">
            <Plus className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="flex flex-col gap-1">
            {PLACEHOLDER_CHATS.map((chat) => (
              <button
                key={chat.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <MessageSquare className="size-4 shrink-0" />
                <span className="truncate">{chat.title}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="p-4">
        <UserButton afterSignOutUrl="/" />
      </SidebarFooter>
    </Sidebar>
  );
}
