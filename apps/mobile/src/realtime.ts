import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "./config";

/* Live queue updates over the API's Socket.IO channel. One shared connection;
 * screens watch a shop or a queue entry and get told the moment it changes.
 * Polling stays as the fallback — sockets just make it feel instant. */

let socket: Socket | null = null;

function connection(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, { transports: ["websocket"] });
  }
  return socket;
}

export function watchShop(slug: string, onUpdate: () => void): () => void {
  const s = connection();
  const handler = (payload: { slug?: string }) => {
    if (!payload?.slug || payload.slug === slug) onUpdate();
  };
  s.emit("shop:watch", slug);
  s.on("shop:updated", handler);
  // Re-join the room if the socket reconnects (server forgets rooms on drop).
  const rejoin = () => s.emit("shop:watch", slug);
  s.on("connect", rejoin);
  return () => {
    s.off("shop:updated", handler);
    s.off("connect", rejoin);
  };
}

export function watchQueue(trackingToken: string, onUpdate: () => void): () => void {
  const s = connection();
  const handler = (payload: { trackingToken?: string }) => {
    if (!payload?.trackingToken || payload.trackingToken === trackingToken) onUpdate();
  };
  s.emit("queue:watch", trackingToken);
  s.on("queue:updated", handler);
  const rejoin = () => s.emit("queue:watch", trackingToken);
  s.on("connect", rejoin);
  return () => {
    s.off("queue:updated", handler);
    s.off("connect", rejoin);
  };
}
