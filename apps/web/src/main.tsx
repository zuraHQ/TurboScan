import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

// Apply theme before render to prevent flash
const savedTheme = localStorage.getItem("theme") || "system";
const isDark = savedTheme === "dark" || (savedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
if (isDark) document.documentElement.classList.add("dark");

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function Providers({ children }: { children: React.ReactNode }) {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <BrowserRouter>{children}</BrowserRouter>
      </ClerkProvider>
    );
  }
  // Dev mode — no Clerk, direct access
  return <BrowserRouter>{children}</BrowserRouter>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
