import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface RepoInputProps {
  onCloned: (repoName: string) => void;
}

export function RepoInput({ onCloned }: RepoInputProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api("/download", {
        method: "POST",
        body: JSON.stringify({ repoUrl: url.trim() }),
      });
      onCloned(data.repoName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone repo");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="Paste a GitHub repo URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          disabled={isLoading}
        />
        <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || !url.trim()}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Clone"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
