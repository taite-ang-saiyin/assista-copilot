import type { QueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

let supportDashboardSocket: Socket | null = null;

export function getCustomerBackendClientUrl() {
  return import.meta.env.VITE_SUPPORT_BACKEND_URL ?? import.meta.env.VITE_BACKEND_URL ?? "";
}

export function createCustomerBackendSocket() {
  const url = getCustomerBackendClientUrl();
  if (!url) return null;

  return io(url, {
    transports: ["websocket"],
    autoConnect: false,
  });
}

export function getSupportDashboardSocket() {
  if (supportDashboardSocket) return supportDashboardSocket;

  const socket = createCustomerBackendSocket();
  if (!socket) return null;

  supportDashboardSocket = socket;
  return supportDashboardSocket;
}

export async function invalidateSupportRealtimeQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["support-overview"] }),
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] }),
    queryClient.invalidateQueries({ queryKey: ["support-ticket"] }),
    queryClient.invalidateQueries({ queryKey: ["chat-session"] }),
  ]);
}
