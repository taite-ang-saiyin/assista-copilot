import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    supportBackendBaseUrl:
      process.env.SUPPORT_BACKEND_BASE_URL ?? process.env.VITE_BACKEND_URL,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    defaultAgentId: process.env.DEFAULT_AGENT_ID,
    defaultAgentName: process.env.DEFAULT_AGENT_NAME,
    member1ApiBaseUrl: process.env.MEMBER1_API_BASE_URL,
    member2ApiBaseUrl: process.env.MEMBER2_API_BASE_URL,
    member2ApiKey: process.env.MEMBER2_API_KEY,
    member3ApiBaseUrl: process.env.MEMBER3_API_BASE_URL,
    member4ApiBaseUrl: process.env.MEMBER4_API_BASE_URL,
  };
}
