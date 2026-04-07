import type { FastifyInstance } from "fastify";
import { Webhook } from "svix";
import { db } from "@reposcope/db";
import { users } from "@reposcope/db/schema";
import { eq } from "drizzle-orm";

export async function clerkWebhookRoute(app: FastifyInstance) {
  app.post("/webhooks/clerk", async (req, reply) => {
    const svixHeaders = {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    };

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    let event: any;
    try {
      event = wh.verify(JSON.stringify(req.body), svixHeaders);
    } catch {
      return reply.status(400).send({ error: "Invalid webhook signature" });
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

    return reply.status(200).send({ received: true });
  });
}
