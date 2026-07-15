import cors from "cors";
import express from "express";

import { appConfig } from "./core/config";
import { sendItem } from "./core/http";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestContext } from "./middleware/request-context";
import { createV1Router } from "./routers/v1-router";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);

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
      name: "Q-App API",
      version: "v1",
      purpose: "Mobile-first queue and scheduling backend",
      platformTargets: ["customer web", "barber portal", "future iOS app", "future Android app"],
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
