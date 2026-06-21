# Member 3 Alignment Checklist

## Goal

This checklist describes what the current system in this repo must change to align with the updated Member 3 API documented in [member3_api.md](./member3_api.md).

It is organized by file and by integration responsibility.

## 1. Resolve The Contract First

Before changing app code, fix the status-language mismatch between the current backend and the current Member 3 API contract.

### Current mismatch

The customer backend ticket system uses:

- `submitted`
- `accepted`
- `in_progress`
- `resolved`
- `closed`

Documented in:

- [Customer sided backend.md](./Customer%20sided%20backend.md)

The current Member 3 API doc lists backend `ticket_status` values as:

- `OPEN`
- `IN_PROGRESS`
- `WAITING_CUSTOMER`
- `WAITING_AGENT`
- `ESCALATED`
- `RESOLVED`
- `CLOSED`

Documented in:

- [member3_api.md](./member3_api.md)

### Required decision

Pick one of these approaches before implementation:

1. Change Member 3 to accept the real backend status values directly.
2. Add a mapping layer in this app before calling Member 3.

### Recommended

Use the real backend values directly. It reduces ambiguity and removes one translation layer.

## 2. Files That Need Changes

### [src/lib/api/copilot.functions.ts](./src/lib/api/copilot.functions.ts)

This is the main integration point for Member 3.

#### Ticket flow changes required

- Replace the current ticket input type.
- Stop sending only `customerMessage`.
- Send the full ticket thread in Member 3's canonical history format.
- Send `latest_customer_message`.
- Send `ticket_status`.
- Continue sending `subject`, `category`, `priority`, `sentiment`, `classification_confidence`, `entities`, `channel`, `customer_plan`, `created_at`, and `retrieved_context`.

#### Current problem

Today the ticket call sends:

- `customer_message`
- no `conversation_history`
- no `latest_customer_message`
- no `ticket_status`

#### Required ticket request shape

Build this payload:

```json
{
  "conversation_history": [
    {
      "sender": "customer",
      "message": "Original issue",
      "timestamp": "2026-06-19T09:00:00Z",
      "message_id": "msg_1"
    },
    {
      "sender": "agent",
      "message": "Agent reply",
      "timestamp": "2026-06-19T09:05:00Z",
      "message_id": "msg_2"
    }
  ],
  "latest_customer_message": "Most recent customer follow-up",
  "subject": "Ticket subject",
  "category": "Billing",
  "priority": "High",
  "sentiment": "Frustrated",
  "classification_confidence": 0.86,
  "entities": {},
  "channel": "email",
  "customer_plan": "standard",
  "created_at": "2026-06-19T09:00:00Z",
  "ticket_status": "in_progress",
  "retrieved_context": []
}
```

#### Live chat changes required

- Keep using `conversation_history` and `latest_message`.
- Ensure `latest_message` is the newest customer-authored message, not just the last message in the array.
- Filter out any `system` messages before sending.
- Add `timestamp` and `message_id` when available so the payload matches the documented canonical schema.

#### Input type changes

Update local TypeScript types so they match the updated Member 3 request contract.

Recommended additions:

- `conversationHistory`
- `latestCustomerMessage`
- `ticketStatus`
- optional `messageId`
- optional `timestamp`

## 3. Ticket Page Integration

### [src/routes/tickets.$id.tsx](./src/routes/tickets.$id.tsx)

This page needs the largest changes.

#### A. Build the ticket thread

Use `ticketDetail.replies` as the source of truth for the ticket conversation.

Map each message to Member 3's canonical history item:

- `sender` from `message.from`
- `message` from `message.text`
- `timestamp` from `message.at`
- `message_id` from `message.id`

#### B. Filter invalid sender types

Member 3 only accepts:

- `customer`
- `agent`

Do not send:

- `system`

#### C. Find the latest customer message

Do not use the original ticket description blindly.

Instead:

- find the newest message in `ticketDetail.replies` where `from === "customer"`
- use that as `latest_customer_message`

#### D. Pass real ticket status

Add the current backend ticket status value into the generation request.

Important:

- if the UI only exposes mapped dashboard status values, you need access to the raw backend status instead
- if raw status is not currently available in the loaded ticket detail, extend the data model to include it

#### E. Auto-regenerate on customer follow-up

The current page refreshes when `ticket_reply` arrives, but it does not regenerate a new AI draft automatically.

Required change:

- when a realtime `ticket_reply` arrives from the customer, trigger a new `generateTicketCopilot` request
- do not auto-regenerate when the new reply came from the agent

#### F. Avoid duplicate regeneration

Add a guard so the same customer message does not trigger multiple new draft generations.

Recommended local tracking:

- latest processed `message_id`
- or latest processed ticket reply timestamp

## 4. Live Chat Page Integration

### [src/routes/chat.$id.tsx](./src/routes/chat.$id.tsx)

This page is closer to the new Member 3 contract, but it still needs cleanup.

#### A. Normalize conversation history

Map live chat messages to the canonical schema:

- `sender`
- `message`
- `timestamp`
- `message_id`

#### B. Filter out `system` messages

The support message model supports `system`, but Member 3 does not.

Required:

- exclude `system` entries before building `conversation_history`

#### C. Fix latest message selection

Do not rely on:

- `sessionDetail?.messages.at(-1)`

That may be an agent message or a system message.

Required:

- find the newest customer-authored message and use that as `latest_message`

#### D. Auto-regenerate on customer reply

The current page refreshes on `receive_message`, but does not explicitly regenerate a new suggestion when the customer sends a follow-up.

Required:

- detect whether the new realtime message came from the customer
- regenerate a fresh Member 3 suggestion only in that case

#### E. Prevent stale visible suggestions

When a new customer message arrives:

- invalidate the old suggestion as the current working reply
- replace it with the newly generated suggestion once available

## 5. Support Data Model Changes

### [src/lib/support-models.ts](./src/lib/support-models.ts)

The current `SupportMessage` model is close, but the integration layer needs explicit support for Member 3's canonical request schema.

Recommended additions:

- create a local helper type for Member 3 history items
- keep the sender type constrained to `customer | agent` for outbound Member 3 payloads

Example:

```ts
type Member3HistoryItem = {
  sender: "customer" | "agent";
  message: string;
  timestamp?: string;
  message_id?: string;
};
```

## 6. Support Server Data Loading

### [src/lib/support.server.ts](./src/lib/support.server.ts)

This may need changes if the UI currently does not receive the raw backend status values required by Member 3.

#### Required check

Ensure ticket detail data includes the raw backend ticket status.

If it currently exposes only transformed UI status:

- add the raw backend status alongside the UI-friendly status

Recommended field:

- `backendStatus`

This is needed so the app can send the correct `ticket_status` to Member 3.

## 7. Message Payload Construction Helpers

### Recommended new helper location

- [src/lib/api/copilot.functions.ts](./src/lib/api/copilot.functions.ts)
- or a new helper module under `src/lib/`

Add shared helpers to avoid duplicating transformation logic between ticket and chat.

Recommended helpers:

- `toMember3HistoryItem(message)`
- `getLatestCustomerMessage(messages)`
- `filterMember3Conversation(messages)`

## 8. Query And Retrieval Behavior

### [src/lib/api/copilot.functions.ts](./src/lib/api/copilot.functions.ts)

Update retrieval/query building so it uses the new thread state, not just the original ticket text.

#### Ticket query changes required

Current behavior is based on:

- subject
- original customer message
- sentiment

Required behavior:

- include the latest customer follow-up
- include recent thread context
- keep subject and sentiment

#### Live chat query changes required

Live chat already includes recent thread context, but the source should be:

- filtered customer/agent-only history
- newest customer message

## 9. Realtime Trigger Logic

### Ticket realtime behavior

Current behavior:

- refreshes data on `ticket_reply`
- does not distinguish customer reply vs agent reply for AI regeneration

Required behavior:

- if `ticket_reply.senderType === "customer"` or equivalent mapped form, regenerate
- if `ticket_reply.senderType === "agent"`, only refresh UI

### Chat realtime behavior

Current behavior:

- refreshes on all `receive_message`

Required behavior:

- regenerate only when the newest message came from the customer

## 10. Manual Verification Checklist

### Ticket flow

1. Open a ticket with an existing conversation.
2. Confirm the app sends `conversation_history` to Member 3.
3. Confirm `latest_customer_message` equals the most recent customer reply.
4. Confirm `system` messages are not sent.
5. Confirm the request includes `ticket_status`.
6. Trigger a customer follow-up through the backend.
7. Confirm the UI receives the new reply.
8. Confirm a new Member 3 draft is generated automatically.
9. Confirm the new draft no longer asks for information already provided by the customer.

### Live chat flow

1. Open a live chat session.
2. Confirm the app sends canonical `conversation_history`.
3. Confirm `latest_message` is the newest customer-authored message.
4. Confirm `system` messages are excluded.
5. Trigger a new customer chat reply.
6. Confirm the UI refreshes.
7. Confirm a new Member 3 suggestion is generated automatically.

## 11. Recommended Implementation Order

1. Fix the `ticket_status` contract decision.
2. Update `src/lib/api/copilot.functions.ts` request types and payload builders.
3. Update `src/routes/tickets.$id.tsx` to send full ticket thread context.
4. Update `src/routes/chat.$id.tsx` to normalize history and pick the correct latest customer message.
5. Add customer-follow-up-triggered regeneration for tickets.
6. Add customer-follow-up-triggered regeneration for live chat.
7. Verify raw backend status availability in `src/lib/support.server.ts`.
8. Run manual end-to-end checks.

## Bottom Line

To align with the updated Member 3 API, your system mainly needs:

- full thread-aware ticket requests
- canonical conversation history payloads
- raw backend status alignment
- customer-follow-up-triggered draft regeneration

Live chat is already partially aligned. Tickets are not.
