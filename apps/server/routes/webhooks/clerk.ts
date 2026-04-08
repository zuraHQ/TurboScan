import { Hono } from "hono";
import { Webhook } from "svix";
import { db } from "@reposcope/db";
import { users } from "@reposcope/db/schema";
import { eq } from "drizzle-orm";

const clerkWebhook = new Hono();

clerkWebhook.post("/clerk", async (c) => {
  const svixHeaders = {
    "svix-id": c.req.header("svix-id")!,
    "svix-timestamp": c.req.header("svix-timestamp")!,
    "svix-signature": c.req.header("svix-signature")!,
  };

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const body = await c.req.text();

  let event: any;
  try {
    event = wh.verify(body, svixHeaders);
  } catch {
    return c.json({ error: "Invalid webhook signature" }, 400);
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = event.data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const name = [first_name, last_name].filter(Boolean).join(" ");

    await db
      .insert(users)
      .values({ clerkId: id, email, name, imageUrl: image_url })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { email, name, imageUrl: image_url, updatedAt: new Date() },
      });
  }

  if (event.type === "user.deleted") {
    const { id } = event.data;
    if (id) {
      await db.delete(users).where(eq(users.clerkId, id));
    }
  }

  return c.json({ received: true });
});

export { clerkWebhook };
