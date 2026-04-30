import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initGameSocket } from "../gameSocket";
import { seedWeapons } from "../db";
import { registerStripeWebhook } from "../stripeWebhook";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook must be registered BEFORE express.json()
  registerStripeWebhook(app);

  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Custom routes
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Socket.IO
  initGameSocket(server);

  // Seed data (non-blocking)
  seedWeapons().catch(console.error);

  // Environment-based setup
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ✅ REQUIRED FOR AWS / CLOUD
  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);