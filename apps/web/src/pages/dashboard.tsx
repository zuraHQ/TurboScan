import { useState, useEffect, useCallback } from "react";
import { AppSidebar, SidebarToggle } from "@/components/layout/app-sidebar";
import { FileTree, FilePreview } from "@/components/layout/file-explorer";
import type { ScanStatus } from "@/components/layout/file-explorer";
import { RepoInput } from "@/components/repo/repo-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { useChat } from "@/hooks/use-chat";
import { FolderTree } from "lucide-react";

// Demo: files to scan in order, 0.5s each — remove when real scanning is wired up
const DEMO_SCAN_ORDER = [
  "src/index.ts",
  "src/App.tsx",
  "src/components/Header.tsx",
  "src/components/Sidebar.tsx",
  "src/components/Button.tsx",
];

function useDemoScan() {
  const [scanMap, setScanMap] = useState<Record<string, ScanStatus>>(() => {
    const map: Record<string, ScanStatus> = {};
    DEMO_SCAN_ORDER.forEach((f) => (map[f] = "queued"));
    return map;
  });

  const runScan = useCallback(() => {
    // reset all to queued
    setScanMap(() => {
      const map: Record<string, ScanStatus> = {};
      DEMO_SCAN_ORDER.forEach((f) => (map[f] = "queued"));
      return map;
    });

    DEMO_SCAN_ORDER.forEach((file, i) => {
      // start scanning at i * 500ms
      setTimeout(() => {
        setScanMap((prev) => ({ ...prev, [file]: "scanning" }));
      }, i * 500);
      // finish scanning at (i+1) * 500ms
      setTimeout(() => {
        setScanMap((prev) => ({ ...prev, [file]: "done" }));
      }, (i + 1) * 500);
    });
  }, []);

  // auto-run on mount, reset 1s after finishing
  useEffect(() => {
    runScan();
    const totalDuration = DEMO_SCAN_ORDER.length * 500;
    const id = setInterval(() => runScan(), totalDuration + 1000);
    return () => clearInterval(id);
  }, [runScan]);

  return { scanMap, runScan };
}

export function DashboardPage() {
  const [repoName, setRepoName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, sendMessage, isLoading } = useChat();
  const { scanMap } = useDemoScan();

  function handleSend(content: string) {
    if (!repoName) return;
    sendMessage(content, repoName);
  }

  function handleSelectFile(path: string) {
    setSelectedFile(path === selectedFile ? null : path);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base-200">
      <AppSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
      <div className="flex h-full flex-1 overflow-hidden">
        {filesOpen && (
          <>
            <div className="m-2 mr-0 h-[calc(100%-1rem)] w-64 shrink-0 overflow-hidden rounded-lg border border-base-content/10 bg-base-100 p-2">
              <FileTree
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
                scanMap={scanMap}
              />
            </div>
            {selectedFile && (
              <div className="m-2 mr-0 h-[calc(100%-1rem)] w-[36rem] shrink-0 overflow-hidden rounded-lg border border-base-content/10 bg-base-100 p-2">
                <FilePreview filePath={selectedFile} onClose={() => setSelectedFile(null)} />
              </div>
            )}
          </>
        )}
        <main className="m-2 flex flex-1 flex-col overflow-hidden rounded-lg border border-base-content/10 bg-base-100">
          <div className="flex items-center gap-2 p-4">
            {!sidebarOpen && <SidebarToggle onClick={() => setSidebarOpen(true)} />}
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={() => setFilesOpen(!filesOpen)}
              title="Toggle file explorer"
            >
              <FolderTree className="size-4" />
            </button>
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
    </div>
  );
}
