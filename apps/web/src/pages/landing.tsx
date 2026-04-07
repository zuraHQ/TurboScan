import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Reposcope
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered codebase intelligence. Clone repos, analyze them with AI
          agents, and chat about the code — with a live file tree that shows
          exactly where the AI is looking.
        </p>
        <div className="flex items-center gap-4">
          <Button size="lg" render={<Link to="/sign-up" />}>
            Get Started
          </Button>
          <Button variant="ghost" size="lg" render={<Link to="/sign-in" />}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
