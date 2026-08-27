import cors from "cors";
import express from "express";

import { appConfig } from "./core/config";
import { sendItem } from "./core/http";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestContext } from "./middleware/request-context";
import { requestLog } from "./middleware/request-log";
import { createV1Router } from "./routers/v1-router";
import { webPushPublicKey } from "./webpush";

/** Browsers only: native apps skip CORS entirely. Set CORS_ALLOWED_ORIGINS to a
 * comma-separated allowlist in production; unset means open (pilot/dev). */
function corsOptions() {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  const origins = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return origins.length > 0 ? { origin: origins } : {};
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Behind the production reverse proxy (Caddy) this yields real client IPs.
  app.set("trust proxy", 1);
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);
  app.use(requestLog);

  app.get("/health", (_req, res) => {
    sendItem(res, {
      service: "q-app-api",
      status: "ok",
      env: appConfig.env,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/v1/meta", (_req, res) => {
    sendItem(res, {
      name: "OnQ API",
      version: "v1",
      purpose: "Mobile-first queue and scheduling backend",
      platformTargets: ["customer web", "barber portal", "future iOS app", "future Android app"],
      webPushPublicKey: webPushPublicKey(),
      runtime: {
        apiBaseUrl: appConfig.apiBaseUrl,
        appBaseUrl: appConfig.appBaseUrl,
        databaseConfigured: appConfig.databaseUrlConfigured
      }
    });
  });

  app.use("/v1", createV1Router());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
