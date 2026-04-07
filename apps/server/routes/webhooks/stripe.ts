import type { FastifyInstance } from "fastify";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function stripeWebhookRoute(app: FastifyInstance) {
  // Override content-type parser in this encapsulated scope only
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req: any, body: Buffer, done: any) => { done(null, body); }
  );

  app.post("/webhooks/stripe", async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string;
    const rawBody = req.body as Buffer;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      return reply.status(400).send({ error: "Invalid signature" });
    }

    switch (event.type) {
      case "checkout.session.completed":
        // TODO: Handle payment success
        break;
      case "customer.subscription.updated":
        // TODO: Handle subscription updates
        break;
      case "customer.subscription.deleted":
        // TODO: Handle subscription cancellation
        break;
    }

    return reply.status(200).send({ received: true });
  });
}
