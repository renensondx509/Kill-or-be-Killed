import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { creditWallet } from "./db";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export function registerStripeWebhook(app: Express) {
  // Raw body needed for webhook signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      if (!stripe) {
        console.warn("[Stripe] Webhook called but Stripe not configured");
        return res.json({ received: true });
      }

      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret || "");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe] Webhook signature verification failed:", message);
        return res.status(400).send(`Webhook Error: ${message}`);
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe] Event: ${event.type} | ID: ${event.id}`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userIdStr = session.metadata?.user_id || session.client_reference_id;
            const userId = userIdStr ? parseInt(userIdStr, 10) : null;

            if (!userId) {
              console.error("[Stripe] No user ID in checkout session metadata");
              break;
            }

            const amountPaid = (session.amount_total || 0) / 100; // cents to dollars
            if (amountPaid > 0) {
              await creditWallet(
                userId,
                amountPaid,
                "topup",
                `Stripe top-up of $${amountPaid.toFixed(2)}`,
                undefined,
                session.id
              );
              console.log(`[Stripe] Credited $${amountPaid} to user ${userId}`);
            }
            break;
          }

          case "payment_intent.succeeded": {
            // Handled via checkout.session.completed
            break;
          }

          default:
            console.log(`[Stripe] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Stripe] Error processing webhook event:", err);
        return res.status(500).json({ error: "Webhook processing failed" });
      }

      return res.json({ received: true });
    }
  );
}

export async function createCheckoutSession(
  userId: number,
  userEmail: string | null,
  userName: string | null,
  amount: number,
  origin: string
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Kill or Be Killed — Wallet Top-Up",
            description: `Add $${amount.toFixed(2)} to your in-game wallet`,
          },
          unit_amount: Math.round(amount * 100), // dollars to cents
        },
        quantity: 1,
      },
    ],
    client_reference_id: userId.toString(),
    customer_email: userEmail || undefined,
    metadata: {
      user_id: userId.toString(),
      customer_email: userEmail || "",
      customer_name: userName || "",
      amount: amount.toString(),
    },
    allow_promotion_codes: true,
    success_url: `${origin}/wallet?success=1`,
    cancel_url: `${origin}/wallet?cancelled=1`,
  });

  return session.url;
}
