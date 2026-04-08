import { Hono } from "hono";
import Stripe from "stripe";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripeWebhook = new Hono();

stripeWebhook.post("/stripe", async (c) => {
  if (!endpointSecret) {
    return c.json({ error: "Stripe webhook not configured" }, 503);
  }

  const sig = c.req.header("stripe-signature")!;
  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    return c.json({ error: "Invalid signature" }, 400);
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

  return c.json({ received: true });
});

export { stripeWebhook };
