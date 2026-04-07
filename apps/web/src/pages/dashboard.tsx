import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { RepoInput } from "@/components/repo/repo-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useChat } from "@/hooks/use-chat";

export function DashboardPage() {
  const [repoName, setRepoName] = useState<string | null>(null);
  const { messages, sendMessage, isLoading } = useChat();

  function handleSend(content: string) {
    if (!repoName) return;
    sendMessage(content, repoName);
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <RepoInput onCloned={setRepoName} />
          </div>
          <ChatMessages messages={messages} isLoading={isLoading} />
          <ChatInput
            onSend={handleSend}
            disabled={!repoName || isLoading}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}
