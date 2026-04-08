import { useState } from "react";
import { Folder, File, ChevronRight, ChevronDown, X, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScanStatus = "idle" | "queued" | "scanning" | "done";

const DRAFT_FILES: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      { name: "index.ts", type: "file", path: "src/index.ts" },
      { name: "App.tsx", type: "file", path: "src/App.tsx" },
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Header.tsx", type: "file", path: "src/components/Header.tsx" },
          { name: "Sidebar.tsx", type: "file", path: "src/components/Sidebar.tsx" },
          { name: "Button.tsx", type: "file", path: "src/components/Button.tsx" },
        ],
      },
      {
        name: "hooks",
        type: "folder",
        children: [
          { name: "useAuth.ts", type: "file", path: "src/hooks/useAuth.ts" },
          { name: "useTheme.ts", type: "file", path: "src/hooks/useTheme.ts" },
        ],
      },
    ],
  },
  { name: "package.json", type: "file", path: "package.json" },
  { name: "tsconfig.json", type: "file", path: "tsconfig.json" },
  { name: "README.md", type: "file", path: "README.md" },
];

const DRAFT_FILE_CONTENTS: Record<string, string> = {
  "src/index.ts": `import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);`,
  "src/App.tsx": `import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

export default function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">
        <Header />
        <div className="p-4">Content</div>
      </main>
    </div>
  );
}`,
  "src/components/Header.tsx": `export function Header() {
  return (
    <header className="border-b px-4 py-3">
      <h1 className="text-lg font-semibold">My App</h1>
    </header>
  );
}`,
  "src/components/Sidebar.tsx": `export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-muted/40 p-4">
      <nav>Navigation</nav>
    </aside>
  );
}`,
  "src/components/Button.tsx": `interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ children, onClick, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  );
}`,
  "src/hooks/useAuth.ts": `import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth state
    setLoading(false);
  }, []);

  return { user, loading };
}`,
  "src/hooks/useTheme.ts": `import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return { theme, setTheme };
}`,
  "package.json": `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}`,
  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "strict": true,
    "jsx": "react-jsx"
  }
}`,
  "README.md": `# My App

A sample project for file explorer preview.`,
};

export type FileNode = {
  name: string;
  type: "file" | "folder";
  path?: string;
  children?: FileNode[];
};

function ScanIndicator({ status }: { status: ScanStatus }) {
  if (status === "scanning") {
    return <Circle className="file-scan-dot hidden size-2 shrink-0 fill-primary text-primary" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="size-3 shrink-0 text-success opacity-70" />;
  }
  return null;
}

function FileTreeItem({
  node,
  depth = 0,
  selectedFile,
  onSelectFile,
  scanMap,
}: {
  node: FileNode;
  depth?: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  scanMap: Record<string, ScanStatus>;
}) {
  const [open, setOpen] = useState(node.type === "folder");
  const scanStatus = node.path ? (scanMap[node.path] ?? "idle") : "idle";

  function handleClick() {
    if (node.type === "folder") {
      setOpen(!open);
    } else if (node.path) {
      onSelectFile(node.path);
    }
  }

  const isSelected = node.type === "file" && node.path === selectedFile;

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 text-sm transition-all cursor-pointer",
          isSelected
            ? "bg-base-300 text-base-content"
            : "text-base-content/60 hover:bg-base-200 hover:text-base-content",
          scanStatus === "scanning" && "file-scan-active",
          scanStatus === "done" && "file-scan-done",
          scanStatus === "queued" && "file-scan-queued"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === "folder" ? (
          <>
            {open ? (
              <ChevronDown className="size-3.5 shrink-0" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0" />
            )}
            <Folder className="size-3.5 shrink-0 text-blue-400" />
          </>
        ) : (
          <>
            <ScanIndicator status={scanStatus} />
            {scanStatus === "idle" && <span className="size-3.5 shrink-0" />}
            {scanStatus === "queued" && <span className="size-3.5 shrink-0" />}
            <File className="size-3.5 shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" &&
        open &&
        node.children?.map((child) => (
          <FileTreeItem
            key={child.name}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            scanMap={scanMap}
          />
        ))}
    </>
  );
}

interface FileTreeProps {
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  scanMap?: Record<string, ScanStatus>;
}

export function FileTree({ selectedFile, onSelectFile, scanMap = {} }: FileTreeProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-2">
        <Folder className="size-4 text-base-content/60" />
        <span className="text-xs font-medium text-base-content/60">Files</span>
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {DRAFT_FILES.map((node) => (
          <FileTreeItem
            key={node.name}
            node={node}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            scanMap={scanMap}
          />
        ))}
      </div>
    </div>
  );
}

export function FilePreview({ filePath, onClose }: { filePath: string; onClose: () => void }) {
  const content = DRAFT_FILE_CONTENTS[filePath];

  return (
    <div className="flex h-full flex-col bg-base-100">
      <div className="flex items-center justify-between border-b border-base-300 px-3 py-1.5">
        <span className="truncate text-xs font-medium text-base-content/60">{filePath}</span>
        <button className="btn btn-ghost btn-xs btn-square" onClick={onClose}>
          <X className="size-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <pre className="p-3 text-xs leading-relaxed text-base-content">
          <code>{content ?? "File not found"}</code>
        </pre>
      </div>
    </div>
  );
}
