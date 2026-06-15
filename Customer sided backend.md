# Support Chat Backend

Node.js, Express, Socket.IO, and Supabase backend for live customer support chat.

## Team Handoff

This document is the shared integration contract for:

- Customer frontend developers
- Support dashboard frontend developers
- Backend developers
- QA testers

The current implementation is an MVP. It supports multiple customer sessions, a waiting queue, atomic agent acceptance, room-scoped real-time messaging, a three-chat capacity limit per agent, and chat closure.

## System Overview

```text
Customer frontend (port 3000)
           |
           | REST + Socket.IO
           v
Express and Socket.IO backend (port 5000)
           |
           v
Supabase PostgreSQL
           ^
           |
           | REST + Socket.IO
Support dashboard (port 3001)
```

Every chat gets a separate Socket.IO room:

```text
chat:{sessionId}
```

Examples:

```text
Customer A and assigned Agent A -> chat:session-a
Customer B and assigned Agent B -> chat:session-b
```

Messages are never broadcast to every connected user. Only support queue notifications go to:

```text
support_dashboard
```

## Chat Lifecycle

```text
waiting -> accepted -> closed
```

1. A customer submits the pre-chat form.
2. The backend creates a `waiting` session.
3. The customer joins `chat:{sessionId}`.
4. The backend emits `new_chat_session` to `support_dashboard`.
5. A support agent accepts the session through the REST API.
6. The backend atomically changes the session to `accepted`.
7. The backend emits `session_claimed` to support dashboards.
8. The backend emits `chat_accepted` to the customer room.
9. The assigned agent joins `chat:{sessionId}`.
10. Customer and agent exchange messages through `send_message`.
11. Every message is saved in Supabase before `receive_message` is emitted.
12. Closing the session changes its status to `closed` and emits `chat_closed`.

## Responsibilities

### Customer Frontend

- Create a chat session.
- Save the returned `sessionId`.
- Join the session room.
- Send customer messages.
- Listen for agent replies, acceptance, closure, and socket errors.

### Support Dashboard Frontend

- Join `support_dashboard`.
- Load waiting sessions from the REST API.
- Listen for newly created sessions.
- Accept a selected session.
- Remove sessions claimed by other agents from the waiting queue.
- Join the accepted session room.
- Send agent messages using the same assigned agent ID.

### Backend

- Store sessions and messages.
- Keep agent acceptance atomic.
- Enforce the three-active-chat limit.
- Verify that an agent is assigned before saving their message.
- Emit messages only to the correct session room.

## Setup

Install dependencies:

```bash
cd backend
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Set these values in `.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
SUPPORT_FRONTEND_URL=http://localhost:3001
PORT=5000
```

The service role key must stay on the backend only. Do not expose it in the customer dashboard.

## Frontend Environment

Both Vite frontends should use:

```env
VITE_BACKEND_URL=http://localhost:5000
```

The customer frontend origin must match `FRONTEND_URL`. The support dashboard origin must match `SUPPORT_FRONTEND_URL`.

Restart a Vite development server after changing its environment file.

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Docker Compose

Docker Compose runs only the Node.js chat backend. Supabase remains an external hosted service.

Requirements:

- Docker Desktop or Docker Engine with Docker Compose
- A configured `backend/.env`

From the repository root, build and start the backend:

```bash
docker compose up --build -d
```

Check its status:

```bash
docker compose ps
```

Follow backend logs:

```bash
docker compose logs -f chat-backend
```

Test the health endpoint:

```text
http://localhost:5000/health
```

Stop the backend:

```bash
docker compose down
```

Rebuild after backend code or dependency changes:

```bash
docker compose up --build -d
```

The container reads secrets at runtime from `backend/.env`. That file is excluded from Git and from the Docker image.

To use another host port, set `BACKEND_PORT` before starting Compose:

PowerShell:

```powershell
$env:BACKEND_PORT=5050
docker compose up --build -d
```

The container still listens on port `5000`; only the host port changes.

### Two-Laptop Demo

If both laptops are on the same Wi-Fi:

1. Run Docker Compose on the laptop hosting the backend.
2. Find that laptop's IPv4 address with `ipconfig`.
3. Allow inbound TCP port `5000` through the host firewall.
4. Set both frontends to the backend laptop's address.

Example backend host address:

```text
192.168.1.50
```

Customer and support frontend environment:

```env
VITE_BACKEND_URL=http://192.168.1.50:5000
```

Configure `backend/.env` with the actual frontend origins:

```env
FRONTEND_URL=http://192.168.1.50:3000
SUPPORT_FRONTEND_URL=http://192.168.1.60:3001
```

Restart Compose after changing `backend/.env`:

```bash
docker compose up -d --force-recreate
```

From the second laptop, open:

```text
http://192.168.1.50:5000/health
```

Do not use `localhost` in a frontend when the backend runs on another laptop. On each device, `localhost` refers to that device itself.

### VM Demo

On a VM, copy or clone the repository, configure `backend/.env`, and run:

```bash
docker compose up --build -d
```

Allow inbound TCP port `5000` in the VM firewall or cloud security group. Both frontends then use:

```env
VITE_BACKEND_URL=http://VM_PUBLIC_IP:5000
```

For an internet-facing or HTTPS frontend, place the backend behind a domain and HTTPS reverse proxy. Browsers can block an HTTPS frontend from connecting to an insecure HTTP or WebSocket backend.

Health check:

```text
GET http://localhost:5000/health
```

Expected response:

```json
{
  "success": true,
  "message": "Support chat backend is running"
}
```

## REST API Summary

| Method | Path | Used By | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Everyone | Backend health check |
| `POST` | `/api/chat/sessions` | Customer | Create a waiting chat |
| `GET` | `/api/chat/sessions/:sessionId` | Customer/Agent | Get one session |
| `GET` | `/api/chat/sessions/:sessionId/messages` | Customer/Agent | Load message history |
| `GET` | `/api/agent/chat/sessions?status=waiting` | Agent | Load the waiting queue |
| `POST` | `/api/chat/sessions/:sessionId/accept` | Agent | Atomically claim a chat |
| `PATCH` | `/api/chat/sessions/:sessionId/close` | Customer/Agent | Close a chat |
| `POST` | `/api/tickets` | Customer | Submit an issue ticket |
| `GET` | `/api/tickets/track/:trackingCode` | Customer | Track a ticket by public code |
| `GET` | `/api/agent/tickets?status=submitted` | Agent | Load the ticket queue |
| `POST` | `/api/tickets/:trackingCode/accept` | Agent | Atomically claim a ticket |
| `POST` | `/api/tickets/:trackingCode/replies` | Agent | Reply and optionally resolve a ticket |
| `PATCH` | `/api/tickets/:trackingCode/status` | Agent | Update ticket status |

## API

### Create Chat Session

```text
POST /api/chat/sessions
```

Request:

```json
{
  "customerFullName": "Mg Mg",
  "category": "Account Issue",
  "briefDescription": "I cannot login to my account"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "waiting"
  }
}
```

This emits `new_chat_session` to the `support_dashboard` Socket.IO room.

### Get Chat Session

```text
GET /api/chat/sessions/:sessionId
```

### Get Session Messages

```text
GET /api/chat/sessions/:sessionId/messages
```

Messages are returned in `created_at` ascending order.

### Get Waiting Sessions

```text
GET /api/agent/chat/sessions?status=waiting
```

This returns waiting sessions in oldest-first order so the support dashboard can render its queue.

### Accept Chat Session

```text
POST /api/chat/sessions/:sessionId/accept
```

Request:

```json
{
  "agentId": "agent-001"
}
```

An agent may have at most three accepted chats. Acceptance uses a conditional database update, so only one agent can claim a waiting session. A competing request receives:

```json
{
  "success": false,
  "message": "Chat already accepted"
}
```

After acceptance, the server emits:

- `session_claimed` to `support_dashboard`
- `chat_accepted` to `chat:{sessionId}`

Successful response:

```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "customerFullName": "Mg Mg",
    "category": "Account Issue",
    "briefDescription": "I cannot login to my account",
    "status": "accepted",
    "assignedAgentId": "agent-001",
    "createdAt": "2026-06-09T00:00:00.000Z",
    "acceptedAt": "2026-06-09T00:01:00.000Z",
    "updatedAt": "2026-06-09T00:01:00.000Z",
    "closedAt": null
  }
}
```

If another agent already claimed it:

```json
{
  "success": false,
  "message": "Chat already accepted"
}
```

If the agent already has three accepted chats:

```json
{
  "success": false,
  "message": "Agent has reached maximum active chats"
}
```

### Close Chat Session

```text
PATCH /api/chat/sessions/:sessionId/close
```

This updates the session to `closed`, sets `closed_at`, and emits `chat_closed` to only:

```text
chat:{sessionId}
```

API errors use:

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Socket.IO Event Summary

| Direction | Event | Room/Target | Purpose |
| --- | --- | --- | --- |
| Client to server | `join_support_dashboard` | Support socket | Subscribe to queue events |
| Server to client | `joined_support_dashboard` | Requesting socket | Confirm queue subscription |
| Server to client | `new_chat_session` | `support_dashboard` | Announce a waiting chat |
| Server to client | `session_claimed` | `support_dashboard` | Remove an accepted chat from queues |
| Client to server | `join_chat_session` | Session socket | Join `chat:{sessionId}` |
| Server to client | `joined_chat_session` | Requesting socket | Confirm session room join |
| Server to client | `chat_accepted` | `chat:{sessionId}` | Tell customer which agent accepted |
| Client to server | `send_message` | Session socket | Save and send a message |
| Server to client | `receive_message` | `chat:{sessionId}` | Deliver a saved message |
| Server to client | `chat_closed` | `chat:{sessionId}` | Notify both sides that chat closed |
| Server to client | `socket_error` | Requesting socket | Report socket validation errors |
| Socket.IO | `connect` | Requesting socket | Connection established |
| Socket.IO | `disconnect` | Requesting socket | Connection ended |
| Client to server | `join_ticket_tracking` | Customer socket | Join `ticket:{trackingCode}` |
| Server to client | `joined_ticket_tracking` | Requesting socket | Confirm ticket tracking join |
| Server to client | `new_ticket` | `support_dashboard` | Announce a submitted ticket |
| Server to client | `ticket_claimed` | `support_dashboard` | Remove an accepted ticket from queues |
| Server to client | `ticket_accepted` | `ticket:{trackingCode}` | Notify customer of acceptance |
| Server to client | `ticket_reply` | Ticket room and support dashboard | Deliver a persisted agent reply |
| Server to client | `ticket_status_updated` | Ticket room and support dashboard | Notify ticket status change |

Chat acceptance is performed through `POST /api/chat/sessions/:sessionId/accept`. There is no `accept_chat_session` Socket.IO event in this MVP.

## Socket.IO Payload Reference

### `new_chat_session`

```json
{
  "sessionId": "session-uuid",
  "customerFullName": "Mg Mg",
  "category": "Account Issue",
  "briefDescription": "I cannot login to my account",
  "status": "waiting",
  "createdAt": "2026-06-09T00:00:00.000Z"
}
```

### `joined_support_dashboard`

```json
{
  "room": "support_dashboard"
}
```

### `joined_chat_session`

```json
{
  "sessionId": "session-uuid",
  "room": "chat:session-uuid",
  "status": "accepted",
  "assignedAgentId": "agent-001"
}
```

### `session_claimed` and `chat_accepted`

```json
{
  "sessionId": "session-uuid",
  "assignedAgentId": "agent-001",
  "status": "accepted"
}
```

### `receive_message`

```json
{
  "id": "message-uuid",
  "sessionId": "session-uuid",
  "senderType": "agent",
  "senderId": "agent-001",
  "message": "Hello, I can help you.",
  "createdAt": "2026-06-09T00:02:00.000Z"
}
```

### `chat_closed`

```json
{
  "sessionId": "session-uuid",
  "status": "closed",
  "closedAt": "2026-06-09T00:10:00.000Z"
}
```

### `socket_error`

```json
{
  "message": "Agent is not assigned to this chat session"
}
```

## Socket.IO Events

Connect to:

```text
http://localhost:5000
```

### Join Customer Chat Session

Client emits:

```js
socket.emit('join_chat_session', {
  sessionId: 'session-uuid'
});
```

Server emits back:

```js
socket.on('joined_chat_session', (payload) => {
  console.log(payload.sessionId, payload.room);
});
```

### Send Message

Customer client emits:

```js
socket.emit('send_message', {
  sessionId: 'session-uuid',
  senderType: 'customer',
  senderId: 'customer-temp-id-or-null',
  message: 'Hello, I need help'
});
```

Support dashboard can use the same event with:

```js
socket.emit('send_message', {
  sessionId: 'session-uuid',
  senderType: 'agent',
  senderId: 'agent-id',
  message: 'Hi, I can help you.'
});
```

Server emits to only the chat room `chat:{sessionId}`:

```js
socket.on('receive_message', (message) => {
  console.log(message);
});
```

Payload:

```json
{
  "id": "message-uuid",
  "sessionId": "session-uuid",
  "senderType": "customer",
  "senderId": "customer-temp-id-or-null",
  "message": "Hello, I need help",
  "createdAt": "2026-06-08T00:00:00.000Z"
}
```

### Join Support Dashboard

Support dashboard emits:

```js
socket.emit('join_support_dashboard');
```

Server joins the socket to:

```text
support_dashboard
```

New sessions emit only to that room:

```js
socket.on('new_chat_session', (session) => {
  console.log(session);
});
```

The server confirms the dashboard join with:

```js
socket.on('joined_support_dashboard', (payload) => {
  console.log(payload.room);
});
```

When another agent accepts a waiting chat:

```js
socket.on('session_claimed', (payload) => {
  console.log(payload);
});
```

Payload:

```json
{
  "sessionId": "session-uuid",
  "assignedAgentId": "agent-001",
  "status": "accepted"
}
```

### Agent Joins An Accepted Chat

After successfully accepting a session, the agent emits:

```js
socket.emit('join_chat_session', {
  sessionId: 'session-uuid',
  agentId: 'agent-001'
});
```

An agent may join a waiting session, but cannot send an agent message until that session is assigned to the same `agentId`.

The customer already uses the compatible form:

```js
socket.emit('join_chat_session', {
  sessionId: 'session-uuid'
});
```

The customer receives the acceptance notification:

```js
socket.on('chat_accepted', (payload) => {
  console.log(payload.assignedAgentId);
});
```

### Agent Sends A Message

```js
socket.emit('send_message', {
  sessionId: 'session-uuid',
  senderType: 'agent',
  senderId: 'agent-001',
  message: 'Hello, I can help you.'
});
```

The backend verifies that `senderId` matches `assigned_agent_id`, saves the message, and emits `receive_message` only to:

```text
chat:{sessionId}
```

### Socket Errors

```js
socket.on('socket_error', (error) => {
  console.error(error.message);
});
```

Payload:

```json
{
  "message": "Error message here"
}
```

## Customer Frontend Usage

Install the client:

```bash
npm install socket.io-client
```

Create one socket per mounted chat feature and clean it up on unmount:

```js
import { io } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const socket = io(backendUrl, {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Customer connected', socket.id);
});

socket.on('joined_chat_session', console.log);
socket.on('chat_accepted', console.log);
socket.on('receive_message', console.log);
socket.on('chat_closed', console.log);
socket.on('socket_error', console.error);
socket.on('disconnect', () => {
  console.log('Customer disconnected');
});
```

Create and join a session:

```js
const response = await fetch(`${backendUrl}/api/chat/sessions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerFullName: 'Mg Mg',
    category: 'Account Issue',
    briefDescription: 'I cannot login to my account'
  })
});

const result = await response.json();

if (!response.ok) {
  throw new Error(result.message);
}

const sessionId = result.data.sessionId;

socket.emit('join_chat_session', {
  sessionId
});
```

Send a customer message:

```js
socket.emit('send_message', {
  sessionId,
  senderType: 'customer',
  senderId: null,
  message: 'Hello, I need help.'
});
```

On component unmount:

```js
socket.removeAllListeners();
socket.disconnect();
```

The existing customer implementation is under:

```text
src/components/live-chat/
src/hooks/useCustomerChat.js
src/lib/api.js
src/lib/socket.js
```

## Support Dashboard Frontend Usage

Install the client:

```bash
npm install socket.io-client
```

Use one stable agent ID for the entire accept, join, and message flow:

```js
const agentId = 'agent-001';
```

Create the support socket and subscribe to queue events:

```js
import { io } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const socket = io(backendUrl, {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Agent connected', socket.id);
  socket.emit('join_support_dashboard');
});

socket.on('joined_support_dashboard', ({ room }) => {
  console.log(`Joined ${room}`);
});

socket.on('new_chat_session', (session) => {
  // Add the session to the waiting queue.
  console.log('New waiting session', session);
});

socket.on('session_claimed', ({ sessionId }) => {
  // Remove this session from every agent's waiting queue.
  console.log('Session claimed', sessionId);
});

socket.on('receive_message', (message) => {
  console.log('Message received', message);
});

socket.on('chat_closed', ({ sessionId }) => {
  console.log('Chat closed', sessionId);
});

socket.on('socket_error', ({ message }) => {
  console.error(message);
});
```

Load the initial waiting queue:

```js
const response = await fetch(
  `${backendUrl}/api/agent/chat/sessions?status=waiting`
);
const result = await response.json();

if (!response.ok) {
  throw new Error(result.message);
}

const waitingSessions = result.data;
```

Accept a selected session:

```js
async function acceptChat(sessionId) {
  const response = await fetch(
    `${backendUrl}/api/chat/sessions/${sessionId}/accept`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ agentId })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  socket.emit('join_chat_session', {
    sessionId,
    agentId
  });

  return result.data;
}
```

Load existing messages after joining:

```js
const response = await fetch(
  `${backendUrl}/api/chat/sessions/${sessionId}/messages`
);
const result = await response.json();
const messages = result.data;
```

Send an agent reply:

```js
socket.emit('send_message', {
  sessionId,
  senderType: 'agent',
  senderId: agentId,
  message: 'Hello, I can help you.'
});
```

Close the chat:

```js
const response = await fetch(
  `${backendUrl}/api/chat/sessions/${sessionId}/close`,
  {
    method: 'PATCH'
  }
);

const result = await response.json();

if (!response.ok) {
  throw new Error(result.message);
}
```

On component unmount:

```js
socket.removeAllListeners();
socket.disconnect();
```

## Recommended Support Dashboard State

The support frontend should keep:

```js
{
  agentId: 'agent-001',
  waitingSessions: [],
  activeSessions: [],
  selectedSessionId: null,
  messagesBySession: {},
  isConnected: false,
  error: null
}
```

Suggested behavior:

- Initial page load: fetch waiting sessions and join `support_dashboard`.
- `new_chat_session`: append only if the ID is not already present.
- Accept success: remove from waiting and add to active.
- `session_claimed`: remove from waiting even when another agent accepted it.
- Select active session: join its room and load message history.
- `receive_message`: append to `messagesBySession[message.sessionId]`.
- `chat_closed`: remove from active or mark as closed.

## Supabase SQL

Run this SQL in the Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_full_name text not null,
  category text not null,
  brief_description text not null,
  status text not null default 'waiting',
  assigned_agent_id text null,
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone null,
  updated_at timestamp with time zone default now(),
  closed_at timestamp with time zone null
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  sender_type text not null,
  sender_id text null,
  message text not null,
  created_at timestamp with time zone default now()
);

alter table chat_sessions
  add constraint chat_sessions_status_check
  check (status in ('waiting', 'accepted', 'closed'));

alter table chat_messages
  add constraint chat_messages_sender_type_check
  check (sender_type in ('customer', 'agent', 'system'));

create index if not exists idx_chat_messages_session_created_at
  on chat_messages (session_id, created_at);

create index if not exists idx_chat_sessions_status_created_at
  on chat_sessions (status, created_at);

create index if not exists idx_chat_sessions_agent_status
  on chat_sessions (assigned_agent_id, status);
```

If the tables were created from an earlier version of this README, run this migration:

```sql
alter table chat_sessions
  add column if not exists accepted_at timestamp with time zone null;

alter table chat_sessions
  alter column assigned_agent_id type text
  using assigned_agent_id::text;

create index if not exists idx_chat_sessions_agent_status
  on chat_sessions (assigned_agent_id, status);
```

The MVP uses text IDs such as `agent-001`. A production auth system may instead use UUID agent IDs.

## Postman Test

Create these collection variables:

```text
baseUrl = http://localhost:5000
sessionId =
agentId = agent-001
```

### 1. Health Check

```text
GET {{baseUrl}}/health
```

### 2. Create Customer Session

```text
POST {{baseUrl}}/api/chat/sessions
```

```json
{
  "customerFullName": "Mg Mg",
  "category": "Account Issue",
  "briefDescription": "I cannot login to my account"
}
```

Save the returned `data.sessionId` as the `sessionId` collection variable.

### 3. Get Waiting Queue

```text
GET {{baseUrl}}/api/agent/chat/sessions?status=waiting
```

### 4. Accept Session

```text
POST {{baseUrl}}/api/chat/sessions/{{sessionId}}/accept
```

```json
{
  "agentId": "{{agentId}}"
}
```

### 5. Load Messages

```text
GET {{baseUrl}}/api/chat/sessions/{{sessionId}}/messages
```

### 6. Close Session

```text
PATCH {{baseUrl}}/api/chat/sessions/{{sessionId}}/close
```

Postman REST requests do not test the complete Socket.IO flow. Use the customer frontend and support dashboard, or a Socket.IO client script, for real-time event testing.

## End-to-End Manual Test

There is no automated test framework in this backend yet. Use the following manual test:

1. Start the backend with `npm run dev`.
2. Open the customer frontend and create a chat session.
3. Confirm the support dashboard socket receives `new_chat_session`.
4. Fetch the queue with `GET /api/agent/chat/sessions?status=waiting`.
5. Accept it with `POST /api/chat/sessions/:sessionId/accept` and body `{ "agentId": "agent-001" }`.
6. Confirm the customer receives `chat_accepted`.
7. Confirm all support dashboards receive `session_claimed`.
8. Have the agent emit `join_chat_session` with the same `sessionId` and `agentId`.
9. Send an agent message and confirm both customer and agent receive one `receive_message`.
10. Check Supabase `chat_messages` to confirm the message was persisted.
11. Try sending with `agent-002` and confirm the socket receives `Agent is not assigned to this chat session`.
12. Open two agent clients and accept the same waiting session simultaneously. Only one should succeed; the other should receive `Chat already accepted`.
13. Assign three accepted sessions to one agent, then attempt a fourth. The fourth should receive `Agent has reached maximum active chats`.
14. Close the chat and confirm later message attempts receive `Chat session is closed`.

## Common Errors

### Socket connection error

Check:

- Backend is running on port `5000`.
- Frontend has `VITE_BACKEND_URL=http://localhost:5000`.
- Customer origin matches `FRONTEND_URL`.
- Agent origin matches `SUPPORT_FRONTEND_URL`.
- Backend was restarted after environment changes.

### Chat already accepted

Another agent accepted the session first. Remove it from the waiting queue.

### Agent has reached maximum active chats

The agent already has three sessions with status `accepted`. Close one before accepting another.

### Agent is not assigned to this chat session

The `senderId` used in `send_message` does not match the `agentId` used during acceptance.

### Chat session is closed

The session no longer accepts room joins or messages.

### Route contains `%20`

`%20` means the request URL contains a trailing space. Remove the space after the endpoint path.

## Issue Ticket System

The ticket system is separate from live chat. Tickets are asynchronous support requests and use public tracking codes instead of customer email addresses.

### Ticket Lifecycle

```text
submitted -> accepted -> in_progress -> resolved -> closed
```

The public code format is:

```text
TCK-8F3K2Q
```

The code is normalized to uppercase and acts as a bearer secret for the MVP. Internal database UUIDs are never used as customer tracking codes.

### Submit Ticket

```text
POST /api/tickets
```

Request:

```json
{
  "customerFullName": "Mg Mg",
  "category": "Billing",
  "priority": "high",
  "subject": "Double charge issue",
  "description": "I was charged twice yesterday."
}
```

Limits:

| Field | Maximum length |
| --- | --- |
| `customerFullName` | 100 |
| `category` | 80 |
| `priority` | `high`, `medium`, or `low` |
| `subject` | 150 |
| `description` | 2000 |

Response:

```json
{
  "success": true,
  "data": {
    "trackingCode": "TCK-8F3K2Q",
    "status": "submitted"
  }
}
```

The backend emits `new_ticket` only to `support_dashboard`:

```json
{
  "trackingCode": "TCK-8F3K2Q",
  "customerFullName": "Mg Mg",
  "category": "Billing",
  "priority": "high",
  "subject": "Double charge issue",
  "description": "I was charged twice yesterday.",
  "status": "submitted",
  "createdAt": "2026-06-09T00:00:00.000Z"
}
```

### Track Ticket

```text
GET /api/tickets/track/:trackingCode
```

This public endpoint returns only the customer-facing ticket fields:

```json
{
  "success": true,
  "data": {
    "trackingCode": "TCK-8F3K2Q",
    "customerFullName": "Mg Mg",
    "category": "Billing",
    "priority": "high",
    "subject": "Double charge issue",
    "description": "I was charged twice yesterday.",
    "status": "submitted",
    "createdAt": "2026-06-09T00:00:00.000Z",
    "acceptedAt": null,
    "updatedAt": "2026-06-09T00:00:00.000Z",
    "resolvedAt": null,
    "closedAt": null,
    "replies": []
  }
}
```

### Load Agent Ticket Queue

```text
GET /api/agent/tickets?status=submitted
```

Allowed queue filters:

```text
submitted
accepted
in_progress
resolved
closed
```

Tickets are ordered by `created_at` ascending.

### Accept Ticket

```text
POST /api/tickets/:trackingCode/accept
```

Request:

```json
{
  "agentId": "agent-001"
}
```

Acceptance is a conditional database update. It only succeeds while the ticket is `submitted` and unassigned.

On success:

- `ticket_accepted` is emitted to `ticket:{trackingCode}`.
- `ticket_claimed` is emitted to `support_dashboard`.

Payload:

```json
{
  "trackingCode": "TCK-8F3K2Q",
  "assignedAgentId": "agent-001",
  "status": "accepted",
  "acceptedAt": "2026-06-09T00:02:00.000Z",
  "updatedAt": "2026-06-09T00:02:00.000Z"
}
```

A competing acceptance receives:

```json
{
  "success": false,
  "message": "Ticket already accepted"
}
```

### Agent Reply And Resolve

```text
POST /api/tickets/:trackingCode/replies
```

The ticket must already be accepted. The `agentId` must match the ticket's assigned agent.

Reply while continuing work:

```json
{
  "agentId": "agent-001",
  "agentName": "Sarah (Support Specialist)",
  "message": "I found the duplicate charge and I am checking the refund record.",
  "status": "in_progress"
}
```

Reply and resolve in one request:

```json
{
  "agentId": "agent-001",
  "agentName": "Sarah (Support Specialist)",
  "message": "The duplicate charge has been refunded. It should appear within 3-5 business days.",
  "status": "resolved"
}
```

`status` is optional. If omitted on the first reply, an accepted ticket moves to `in_progress`.

Limits:

| Field | Maximum length |
| --- | --- |
| `agentId` | 100 |
| `agentName` | 100 |
| `message` | 4000 |

Response:

```json
{
  "success": true,
  "data": {
    "id": "reply-uuid",
    "trackingCode": "TCK-8F3K2Q",
    "senderType": "agent",
    "senderId": "agent-001",
    "senderName": "Sarah (Support Specialist)",
    "message": "The duplicate charge has been refunded.",
    "createdAt": "2026-06-09T00:04:00.000Z",
    "status": "resolved",
    "updatedAt": "2026-06-09T00:04:00.000Z",
    "resolvedAt": "2026-06-09T00:04:00.000Z"
  }
}
```

The backend persists the reply and emits `ticket_reply` only to:

```text
ticket:{trackingCode}
support_dashboard
```

The customer tracker appends the reply to Conversation Logs immediately. If the reply changes status, `ticket_status_updated` is emitted as well.

### Update Ticket Status

```text
PATCH /api/tickets/:trackingCode/status
```

Request:

```json
{
  "status": "in_progress"
}
```

Allowed update values:

```text
in_progress
resolved
closed
```

The backend emits `ticket_status_updated` to both the ticket room and `support_dashboard`:

```json
{
  "trackingCode": "TCK-8F3K2Q",
  "status": "in_progress",
  "updatedAt": "2026-06-09T00:03:00.000Z",
  "resolvedAt": null,
  "closedAt": null
}
```

### Customer Ticket Socket

The customer joins ticket tracking after loading the ticket:

```js
socket.emit('join_ticket_tracking', {
  trackingCode: 'TCK-8F3K2Q'
});
```

The server confirms:

```js
socket.on('joined_ticket_tracking', (payload) => {
  console.log(payload);
});
```

```json
{
  "trackingCode": "TCK-8F3K2Q",
  "room": "ticket:TCK-8F3K2Q",
  "status": "submitted"
}
```

Listen for updates:

```js
socket.on('ticket_accepted', (ticket) => {
  console.log('Ticket accepted', ticket);
});

socket.on('ticket_status_updated', (ticket) => {
  console.log('Ticket status changed', ticket);
});

socket.on('ticket_reply', (reply) => {
  console.log('Agent replied', reply);
});
```

Ticket events are never broadcast globally:

```text
Customer updates -> ticket:{trackingCode}
Support queue updates -> support_dashboard
```

### Support Dashboard Ticket Integration

The support dashboard uses the same socket connection and `join_support_dashboard` event as live chat.

```js
socket.on('new_ticket', (ticket) => {
  // Add to the submitted ticket queue.
});

socket.on('ticket_claimed', ({ trackingCode }) => {
  // Remove from the submitted queue.
});

socket.on('ticket_status_updated', (ticket) => {
  // Update the ticket in the agent UI.
});

socket.on('ticket_reply', (reply) => {
  // Update the active ticket conversation.
});
```

Recommended agent flow:

1. Join `support_dashboard`.
2. Fetch `/api/agent/tickets?status=submitted`.
3. Merge `new_ticket` events without duplicating tracking codes.
4. Accept a selected ticket through the REST API.
5. Remove `ticket_claimed` tickets from the submitted queue.
6. Update status through the REST API.
7. Send replies through `POST /api/tickets/:trackingCode/replies`.

### Ticket Database SQL

Run [supabase/support_tickets.sql](supabase/support_tickets.sql) in the Supabase SQL editor. The complete SQL is also included below:

```sql
create extension if not exists pgcrypto;

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  customer_full_name text not null,
  category text not null,
  priority text not null default 'medium',
  subject text not null,
  description text not null,
  status text not null default 'submitted',
  assigned_agent_id text null,
  created_at timestamp with time zone not null default now(),
  accepted_at timestamp with time zone null,
  updated_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone null,
  closed_at timestamp with time zone null,
  constraint support_tickets_status_check
    check (status in ('submitted', 'accepted', 'in_progress', 'resolved', 'closed')),
  constraint support_tickets_priority_check
    check (priority in ('high', 'medium', 'low')),
  constraint support_tickets_customer_name_length_check
    check (char_length(customer_full_name) between 1 and 100),
  constraint support_tickets_category_length_check
    check (char_length(category) between 1 and 80),
  constraint support_tickets_subject_length_check
    check (char_length(subject) between 1 and 150),
  constraint support_tickets_description_length_check
    check (char_length(description) between 1 and 2000)
);

alter table support_tickets
  add column if not exists priority text not null default 'medium';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_tickets_priority_check'
  ) then
    alter table support_tickets
      add constraint support_tickets_priority_check
      check (priority in ('high', 'medium', 'low'));
  end if;
end
$$;

create index if not exists idx_support_tickets_tracking_code
  on support_tickets (tracking_code);

create index if not exists idx_support_tickets_status_created_at
  on support_tickets (status, created_at);

create index if not exists idx_support_tickets_agent_status
  on support_tickets (assigned_agent_id, status);

create table if not exists support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  tracking_code text not null,
  sender_type text not null default 'agent',
  sender_id text null,
  sender_name text not null,
  message text not null,
  created_at timestamp with time zone not null default now(),
  constraint support_ticket_replies_sender_type_check
    check (sender_type in ('customer', 'agent', 'system')),
  constraint support_ticket_replies_sender_name_length_check
    check (char_length(sender_name) between 1 and 100),
  constraint support_ticket_replies_message_length_check
    check (char_length(message) between 1 and 4000)
);

create index if not exists idx_support_ticket_replies_ticket_created_at
  on support_ticket_replies (ticket_id, created_at);

create index if not exists idx_support_ticket_replies_tracking_code
  on support_ticket_replies (tracking_code);
```

### Ticket Manual Test

1. Run the ticket SQL in Supabase.
2. Rebuild and start the Docker backend.
3. Start the customer frontend.
4. Submit a ticket without an email address.
5. Copy the generated `TCK-XXXXXX` tracking code.
6. Open Track Ticket and load it with only that code.
7. Confirm the customer page shows `submitted` and live updates are connected.
8. Join `support_dashboard` from a support frontend or Socket.IO console.
9. Confirm `new_ticket` appears for newly submitted tickets.
10. Accept it with `POST /api/tickets/:trackingCode/accept`.
11. Confirm the customer receives `ticket_accepted` and a notification.
12. Reply with `POST /api/tickets/:trackingCode/replies`.
13. Confirm the reply appears immediately in Conversation Logs.
14. Reply again with `"status": "resolved"`.
15. Confirm the milestone tracker reaches Resolved.
16. Confirm no ticket event appears in unrelated chat or ticket rooms.

The customer frontend stores the latest tracking code in `localStorage` for convenience. It does not store the internal ticket UUID.

## MVP Security Notes

This backend is intentionally simple for MVP integration.

Before production, add:

- Customer authentication before creating or joining customer chat sessions.
- Support agent authentication before joining `support_dashboard`, replying as `agent`, assigning sessions, or closing chats.
- Supabase Row Level Security policies for customer and agent access.
- Rate limiting on session creation and message sending.
- Audit logs for session acceptance and closure.
- A Redis Socket.IO adapter when running multiple backend instances.
- Input size limits and abuse monitoring.

For this MVP, `agentId`, `senderType`, and `senderId` come from client payloads. They must come from verified JWT claims before production.

Messages are never emitted globally. Chat messages, `chat_accepted`, and `chat_closed` are sent only to `chat:{sessionId}`. Queue events are sent only to `support_dashboard`.

Ticket-specific MVP limitations:

- No customer or agent authentication.
- The tracking code acts as a bearer secret.
- Anyone with the tracking code can view the customer-facing ticket details.
- Agent acceptance and status updates are currently unauthenticated.
- Add rate limiting to ticket submission and tracking.
- Add Supabase RLS and stricter ownership rules.
- Add audit logs for acceptance and status transitions.
