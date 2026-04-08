import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { FileTree, FilePreview } from "@/components/layout/file-explorer";
import { RepoInput } from "@/components/repo/repo-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useChat } from "@/hooks/use-chat";
import { FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const [repoName, setRepoName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState(true);
  const { messages, sendMessage, isLoading } = useChat();

  function handleSend(content: string) {
    if (!repoName) return;
    sendMessage(content, repoName);
  }

  function handleSelectFile(path: string) {
    setSelectedFile(path === selectedFile ? null : path);
  }

  return (
    <SidebarProvider className="h-screen !min-h-0 overflow-hidden">
      <AppSidebar />
      <div className="flex h-full flex-1 overflow-hidden">
        {filesOpen && (
          <>
            <div className="h-full w-64 shrink-0 overflow-hidden border-r border-border">
              <FileTree selectedFile={selectedFile} onSelectFile={handleSelectFile} />
            </div>
            {selectedFile && (
              <div className="h-full w-[36rem] shrink-0 overflow-hidden border-r border-border">
                <FilePreview filePath={selectedFile} onClose={() => setSelectedFile(null)} />
              </div>
            )}
          </>
        )}
        <main className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFilesOpen(!filesOpen)}
              title="Toggle file explorer"
            >
              <FolderTree className="size-4" />
            </Button>
            <div className="mx-auto max-w-6xl flex-1">
              <RepoInput onCloned={setRepoName} />
            </div>
          </div>
          <ChatMessages messages={messages} isLoading={isLoading} />
          <div className="p-4">
            <div className="mx-auto max-w-6xl">
              <ChatInput
                onSend={handleSend}
                disabled={!repoName || isLoading}
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
