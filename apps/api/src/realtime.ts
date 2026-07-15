import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

let io: Server | null = null;

function shopRoom(slug: string) {
  return `shop:${slug}`;
}

function queueRoom(trackingToken: string) {
  return `queue:${trackingToken}`;
}

export function initializeRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  io.on("connection", (socket) => {
    socket.on("shop:watch", (slug: string) => {
      if (typeof slug === "string" && slug.trim()) {
        socket.join(shopRoom(slug));
      }
    });

    socket.on("queue:watch", (trackingToken: string) => {
      if (typeof trackingToken === "string" && trackingToken.trim()) {
        socket.join(queueRoom(trackingToken));
      }
    });
  });

  return io;
}

export function emitShopQueueUpdated(slug: string) {
  io?.to(shopRoom(slug)).emit("shop:updated", {
    slug,
    timestamp: new Date().toISOString()
  });
}

export function emitQueueStatusUpdated(trackingToken: string) {
  io?.to(queueRoom(trackingToken)).emit("queue:updated", {
    trackingToken,
    timestamp: new Date().toISOString()
  });
}
