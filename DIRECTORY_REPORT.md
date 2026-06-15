# Directory Report

Generated on: 2026-06-15

Directory reviewed: `c:\Users\Msi GF66\Desktop\cas ui customer`

## 1. Executive Summary

This repository is a customer-facing support portal composed of:

- A React 19 + Vite frontend in `src/`
- A separate Node.js + Express + Socket.IO backend in `backend/`
- Supabase-backed chat session and support ticket flows
- A help-center style customer UI with article browsing, ticket submission/tracking, notifications, and live chat

The codebase is functional in shape, but the root-level metadata and documentation still carry AI Studio / Gemini scaffold artifacts that do not match the actual product now in the directory.

## 2. Repository Inventory

- Tracked files discovered with `rg --files`: `52`
- Approximate total tracked file size: `459,373 bytes`
- Main source directories:
  - `src/` - customer frontend
  - `backend/src/` - backend API and socket server
  - `backend/supabase/` - SQL schema for support tickets
- `assets/` currently contains only `.aistudio` metadata
- No installed `node_modules` directory was present in either root or `backend/` at inspection time

## 3. Top-Level Structure

```text
C:.
|   .env.example
|   .gitignore
|   index.html
|   metadata.json
|   package-lock.json
|   package.json
|   README.md
|   tsconfig.json
|   vite.config.ts
|
+---assets
|   \---.aistudio
|           .gitignore
|
+---backend
|   |   .dockerignore
|   |   .env.example
|   |   docker-compose.yml
|   |   Dockerfile
|   |   package-lock.json
|   |   package.json
|   |   README.md
|   |
|   +---src
|   |   |   server.js
|   |   |
|   |   +---config
|   |   |       supabase.js
|   |   |
|   |   +---controllers
|   |   |       agent.controller.js
|   |   |       chat.controller.js
|   |   |       ticket.controller.js
|   |   |
|   |   +---routes
|   |   |       agent.routes.js
|   |   |       chat.routes.js
|   |   |       ticket.routes.js
|   |   |
|   |   +---services
|   |   |       chat.service.js
|   |   |       ticket.service.js
|   |   |
|   |   +---sockets
|   |   |       chat.socket.js
|   |   |
|   |   \---utils
|   |           asyncHandler.js
|   |           errors.js
|   |           trackingCode.js
|   |
|   \---supabase
|           support_tickets.sql
|
\---src
    |   App.tsx
    |   data.ts
    |   index.css
    |   main.tsx
    |   types.ts
    |
    +---components
    |   |   ArticlesView.tsx
    |   |   ChatWidget.tsx
    |   |   ContactView.tsx
    |   |   Footer.tsx
    |   |   HomeView.tsx
    |   |   Navigation.tsx
    |   |   NotificationCenter.tsx
    |   |   SubmitTicketView.tsx
    |   |   TicketDetailView.tsx
    |   |   TrackTicketView.tsx
    |   |
    |   \---live-chat
    |           ChatStartForm.jsx
    |           ChatWindow.jsx
    |           CustomerLiveChat.jsx
    |           MessageInput.jsx
    |           MessageList.jsx
    |
    +---hooks
    |       useCustomerChat.js
    |
    \---lib
            api.js
            socket.js
```

## 4. Frontend Assessment

### Stack

- React 19
- Vite 6
- TypeScript compiler config, but mixed `.tsx` and `.js/.jsx` source
- Tailwind CSS v4 via `@tailwindcss/vite`
- `lucide-react` for icons
- `socket.io-client` for live chat and ticket tracking sockets

### Frontend Entry and Routing

- `src/main.tsx` mounts a single `App` component.
- `src/App.tsx` implements a custom hash-based router instead of React Router.
- Default route is `#/customer`.
- The main customer routes are:
  - `/customer`
  - `/customer/articles`
  - `/customer/articles/:id`
  - `/customer/submit-ticket`
  - `/customer/track-ticket`
  - `/customer/tickets/:trackingCode`
  - `/customer/contact`

### Frontend Functional Areas

- `HomeView.tsx`:
  - help center landing view
  - article navigation
  - chat trigger entry points
- `ArticlesView.tsx`:
  - knowledge-base browsing
  - category filtering
  - article detail rendering
- `SubmitTicketView.tsx`:
  - ticket creation form
  - uses backend ticket API
  - stores returned tracking code in `localStorage`
- `TrackTicketView.tsx`:
  - ticket lookup by public tracking code
  - preloads from `localStorage`
- `TicketDetailView.tsx`:
  - loads current ticket state from backend
  - joins `ticket:{trackingCode}` socket room
  - updates UI on `ticket_accepted`, `ticket_reply`, and `ticket_status_updated`
- `NotificationCenter.tsx`:
  - customer-facing notification drawer
- `live-chat/*` + `useCustomerChat.js`:
  - creates chat session
  - joins `chat:{sessionId}` room
  - sends customer messages
  - listens for replies and closure

### Frontend Data Model

- `src/types.ts` defines both:
  - older mock ticket/article UI models
  - newer backend-backed support ticket models
- `src/data.ts` provides:
  - mock customer data
  - mock articles
  - mock notifications
  - mock tickets

Important detail: the article and notification experience is still mock-data based, while ticket tracking and live chat connect to the backend.

### Frontend Observations

- `src/components/ChatWidget.tsx` exists but is not referenced by `src/App.tsx`.
- `MOCK_TICKETS` in `src/data.ts` appears unused by the active app flow.
- `triggerChatWidget` state in `src/App.tsx` is set but not consumed.
- Root frontend package still contains scaffold-era dependencies and metadata that are no longer aligned with the current UI.

## 5. Backend Assessment

### Stack

- Node.js
- Express 4
- Socket.IO 4
- Supabase JS client
- CORS middleware
- Dockerfile and `docker-compose.yml` for backend containerization

### Server Structure

- `backend/src/server.js`:
  - initializes Express and HTTP server
  - configures CORS
  - mounts REST routes
  - registers Socket.IO handlers
  - exposes `GET /health`

### Backend Route Surface

| Area | Method | Path | Purpose |
| --- | --- | --- | --- |
| Health | `GET` | `/health` | Backend health check |
| Chat | `POST` | `/api/chat/sessions` | Create customer chat session |
| Chat | `GET` | `/api/chat/sessions/:sessionId` | Read one chat session |
| Chat | `GET` | `/api/chat/sessions/:sessionId/messages` | Read chat messages |
| Chat | `POST` | `/api/chat/sessions/:sessionId/accept` | Agent accepts waiting chat |
| Chat | `PATCH` | `/api/chat/sessions/:sessionId/close` | Close chat session |
| Agent | `GET` | `/api/agent/chat/sessions` | List sessions by status |
| Ticket | `POST` | `/api/tickets` | Submit support ticket |
| Ticket | `GET` | `/api/tickets/track/:trackingCode` | Public tracking endpoint |
| Ticket | `POST` | `/api/tickets/:trackingCode/accept` | Agent accepts ticket |
| Ticket | `POST` | `/api/tickets/:trackingCode/replies` | Agent reply |
| Ticket | `PATCH` | `/api/tickets/:trackingCode/status` | Update ticket status |
| Agent | `GET` | `/api/agent/tickets` | List tickets by status |

### Socket Model

Socket rooms in use:

- `support_dashboard`
- `chat:{sessionId}`
- `ticket:{trackingCode}`

Implemented socket events support:

- support dashboard room join
- customer chat room join
- chat message send/receive
- ticket tracking room join
- socket error responses

### Backend Business Rules

Implemented rules include:

- chat session statuses: `waiting`, `accepted`, `closed`
- ticket statuses: `submitted`, `accepted`, `in_progress`, `resolved`, `closed`
- chat acceptance limit: max `3` active accepted chats per agent
- ticket tracking code format: `TCK-XXXXXX`
- public ticket tracker never exposes internal ticket UUIDs

### Data Layer

- `backend/src/config/supabase.js` requires:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `backend/supabase/support_tickets.sql` defines:
  - `support_tickets`
  - `support_ticket_replies`

Note: chat SQL is described in `backend/README.md`, but there is no dedicated SQL file for chat tables inside the repository.

## 6. Environment and Runtime Notes

### Root Environment Example

`/.env.example` contains:

- `GEMINI_API_KEY`
- `APP_URL`
- `VITE_BACKEND_URL`

Only `VITE_BACKEND_URL` is relevant to the current customer support portal. The Gemini and AI Studio values are stale scaffold artifacts.

### Backend Environment Example

`/backend/.env.example` contains:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `SUPPORT_FRONTEND_URL`
- `PORT`

### Port Assumptions

- Customer frontend: `3000` in docs
- Backend: `5000`
- Support dashboard: `3001` in docs, but that frontend is not present in this repository

### Docker Coverage

- `backend/Dockerfile` packages only the backend server
- `backend/docker-compose.yml` runs only the backend container
- Supabase is expected to be external and preconfigured

## 7. Validation Performed

The following commands were executed from the repository root:

- `npm run lint`
- `npm run build`

Result:

- Both commands failed because frontend dependencies are not installed in the current workspace.
- `tsc` was not found during `npm run lint`.
- `vite` was not found during `npm run build`.

This is an environment state issue at inspection time, not proof that the source itself is broken.

## 8. Notable Findings

### High Priority

1. Backend authentication and authorization are intentionally incomplete.
   - Multiple controllers and socket handlers contain TODOs for JWT-based identity, rate limiting, RLS, and audit logging.
   - Current agent/customer identity is accepted from request payloads in several paths.

2. Ticket tracking is public to anyone with the tracking code.
   - The tracking code acts as a bearer secret in the MVP.
   - This is explicitly acknowledged in both code comments and UI copy.

3. Critical backend actions are exposed without production-grade controls.
   - Accepting chats
   - Accepting tickets
   - Closing chats
   - Updating ticket statuses
   - Sending agent replies

### Medium Priority

4. Root documentation and metadata do not match the current product.
   - `README.md` still describes an AI Studio Gemini app.
   - `.env.example` still includes Gemini-specific variables.
   - `metadata.json` still carries AI Studio metadata.
   - `package.json` still uses the package name `react-example`.

5. The repository references a support dashboard that is not included here.
   - Backend docs and socket behavior assume a separate agent UI on port `3001`.
   - This directory contains only the customer-facing frontend.

6. Ticket reply creation and ticket status update are not transactional.
   - `ticket.service.js` inserts the reply first and updates the ticket second.
   - A TODO already notes that this should move into a transaction or RPC.

### Low Priority

7. The root `clean` script is Unix-specific.
   - `rm -rf dist server.js`
   - That is not portable in standard PowerShell / Windows shells.

8. There are stale or unused frontend artifacts.
   - `src/components/ChatWidget.tsx` appears unused.
   - `src/data.ts` exports `MOCK_TICKETS`, which appears unused.
   - `src/App.tsx` keeps `triggerChatWidget` state that is not used in rendering.

9. `vite.config.ts` still contains mojibake text in a comment:
   - `Do not modifyâ...`
   - This does not affect runtime, but it is a cleanup signal.

10. Test coverage is absent.
   - No automated frontend tests found
   - No automated backend tests found
   - Current verification guidance is manual and README-driven

## 9. Strengths

- Clear separation between frontend UI and backend services
- Reasonable REST and Socket.IO naming consistency
- Chat room scoping is correctly modeled around session-specific rooms
- Ticket tracking code normalization is centralized
- SQL schema for the ticket system is included and documented
- Backend README is detailed and useful for integration handoff

## 10. Recommended Next Steps

1. Align the root-level docs and metadata with the actual customer support portal.
2. Install dependencies and run real validation:
   - root: `npm install`, `npm run lint`, `npm run build`
   - backend: `cd backend && npm install`
3. Remove or justify stale scaffold artifacts:
   - Gemini env vars
   - AI Studio metadata
   - unused components/data
   - unused root dependencies such as `@google/genai` if no longer needed
4. Add authentication, rate limiting, and audit logging before any production exposure.
5. Move ticket reply + status update into a single transactional operation.
6. Either add the referenced support dashboard to source control or clearly document that it lives in a different repository.
7. Replace Unix-only scripts with cross-platform equivalents if Windows development is expected.

## 11. Bottom Line

This directory contains a real customer support portal, not an AI Studio Gemini app. The core implementation is split cleanly between a customer frontend and a Supabase-backed chat/ticket backend, but the repo still carries scaffold leftovers, missing production security controls, and no automated test coverage. As a handoff base or MVP, it is understandable. As a production-ready repository, it still needs documentation cleanup, dependency validation, and backend hardening.
