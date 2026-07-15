import { createServer } from "node:http";

import { createApp } from "./app";
import { appConfig } from "./core/config";
import { initializeRealtime } from "./realtime";

const app = createApp();
const server = createServer(app);

initializeRealtime(server);

server.listen(appConfig.port, appConfig.host, () => {
  console.log(`Q-App API listening on http://${appConfig.host}:${appConfig.port}`);
});
