"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
}

export function getSocket() {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}
