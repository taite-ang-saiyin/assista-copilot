import { io as createSocketClient } from "socket.io-client";

import { getServerConfig } from "./config.server";

type BackendEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type TicketAcceptPayload = {
  trackingCode: string;
  assignedAgentId: string;
  status: string;
  acceptedAt: string | null;
  updatedAt: string;
};

type TicketReplyPayload = {
  id: string;
  trackingCode: string;
  senderType: "agent";
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
  status: string;
  updatedAt: string;
  resolvedAt: string | null;
};

type ChatAcceptPayload = {
  id: string;
  customerFullName: string;
  category: string;
  briefDescription: string;
  status: string;
  assignedAgentId: string;
  createdAt: string;
  acceptedAt: string | null;
  updatedAt: string;
  closedAt: string | null;
};

type ChatSocketMessagePayload = {
  id: string;
  sessionId: string;
  senderType: "customer" | "agent" | "system";
  senderId: string | null;
  message: string;
  createdAt: string;
};

type ChatClosePayload = {
  sessionId: string;
  status: "closed";
  closedAt: string;
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function requireBackendBaseUrl() {
  const config = getServerConfig();
  if (!config.supportBackendBaseUrl) {
    throw new Error(
      "Missing required environment variable: SUPPORT_BACKEND_BASE_URL or VITE_BACKEND_URL",
    );
  }
  return trimTrailingSlash(config.supportBackendBaseUrl);
}

function buildUrl(path: string) {
  return `${requireBackendBaseUrl()}${path}`;
}

async function fetchBackend<T>(path: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      signal: controller.signal,
    });

    const rawBody = await response.text();
    const parsedBody = rawBody ? (JSON.parse(rawBody) as BackendEnvelope<T>) : {};

    if (!response.ok || parsedBody.success === false) {
      throw new Error(parsedBody.message || `${response.status} ${response.statusText}`);
    }

    return parsedBody.data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function acceptTicketAssignment(input: {
  trackingCode: string;
  agentId: string;
}) {
  return fetchBackend<TicketAcceptPayload>(
    `/api/tickets/${encodeURIComponent(input.trackingCode)}/accept`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: input.agentId,
      }),
    },
  );
}

export async function sendTicketReplyViaBackend(input: {
  trackingCode: string;
  agentId: string;
  agentName: string;
  message: string;
  status?: "in_progress" | "resolved";
}) {
  return fetchBackend<TicketReplyPayload>(
    `/api/tickets/${encodeURIComponent(input.trackingCode)}/replies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: input.agentId,
        agentName: input.agentName,
        message: input.message,
        status: input.status,
      }),
    },
  );
}

export async function acceptChatAssignment(input: {
  sessionId: string;
  agentId: string;
}) {
  return fetchBackend<ChatAcceptPayload>(
    `/api/chat/sessions/${encodeURIComponent(input.sessionId)}/accept`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: input.agentId,
      }),
    },
  );
}

export async function closeChatSessionViaBackend(input: { sessionId: string }) {
  return fetchBackend<ChatClosePayload>(
    `/api/chat/sessions/${encodeURIComponent(input.sessionId)}/close`,
    {
      method: "PATCH",
    },
  );
}

export async function sendChatReplyViaBackendSocket(input: {
  sessionId: string;
  agentId: string;
  message: string;
}) {
  const socket = createSocketClient(requireBackendBaseUrl(), {
    transports: ["websocket"],
    autoConnect: false,
    timeout: 10_000,
  });

  return await new Promise<ChatSocketMessagePayload>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out while sending chat message through the customer backend"));
    }, 15_000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeAllListeners();
      socket.disconnect();
    };

    socket.on("connect", () => {
      socket.emit("join_chat_session", {
        sessionId: input.sessionId,
        agentId: input.agentId,
      });
    });

    socket.on("joined_chat_session", (payload: { sessionId?: string }) => {
      if (payload.sessionId !== input.sessionId) return;

      socket.emit("send_message", {
        sessionId: input.sessionId,
        senderType: "agent",
        senderId: input.agentId,
        message: input.message,
      });
    });

    socket.on("receive_message", (payload: ChatSocketMessagePayload) => {
      if (
        payload.sessionId === input.sessionId &&
        payload.senderType === "agent" &&
        payload.senderId === input.agentId &&
        payload.message === input.message
      ) {
        cleanup();
        resolve(payload);
      }
    });

    socket.on("socket_error", (payload: { message?: string }) => {
      cleanup();
      reject(new Error(payload.message || "Customer backend rejected the chat message"));
    });

    socket.on("connect_error", (error: Error) => {
      cleanup();
      reject(error);
    });

    socket.connect();
  });
}
