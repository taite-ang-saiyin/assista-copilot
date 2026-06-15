import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

import { getServerConfig } from "./config.server";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseAdmin() {
  const config = getServerConfig();
  const supabaseUrl = requireEnv(config.supabaseUrl, "SUPABASE_URL");
  const serviceRoleKey = requireEnv(
    config.supabaseServiceRoleKey,
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });
}

export function getDefaultAgent() {
  const config = getServerConfig();

  return {
    id: config.defaultAgentId ?? "demo-agent",
    name: config.defaultAgentName ?? "Demo Agent",
  };
}
