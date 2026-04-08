import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-base-100">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Reposcope
        </h1>
        <p className="text-lg opacity-70">
          AI-powered codebase intelligence. Clone repos, analyze them with AI
          agents, and chat about the code — with a live file tree that shows
          exactly where the AI is looking.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/sign-up" className="btn btn-primary btn-lg">
            Get Started
          </Link>
          <Link to="/sign-in" className="btn btn-ghost btn-lg">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
