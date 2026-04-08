import { createMiddleware } from "hono/factory";
import { createClerkClient } from "@clerk/backend";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const clerk = clerkSecretKey
  ? createClerkClient({ secretKey: clerkSecretKey })
  : null;

export const authMiddleware = createMiddleware(async (c, next) => {
  // Skip auth for webhooks
  if (c.req.path.startsWith("/webhooks/")) return next();

  // Skip auth if Clerk is not configured (dev mode)
  if (!clerk) return next();

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = await clerk.verifyToken(token!);
    c.set("auth", { userId: payload.sub });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  return next();
});
