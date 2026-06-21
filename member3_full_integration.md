# Member 3 Full Integration Spec

## Purpose

This document defines the full integration work required for Member 3 so the AI drafting system handles:

- ticket follow-up replies from customers
- live chat follow-up replies from customers
- regeneration of grounded AI output after every meaningful customer update
- consistent workflow recommendations across ticket and live chat

This is the full integration path, not the minimum workaround.

## Why This Change Is Needed

The updated customer backend contract now supports customer follow-up replies on tickets through:

```text
POST /api/tickets/:trackingCode/customer-replies
```

That means the support system is no longer limited to:

- one initial ticket description
- one or more agent replies

It now supports a real ticket thread where the customer can add new information after the agent responds.

Live chat already behaves this way because the system works on a conversation stream.

Member 3 is not fully aligned with that model yet.

## Current Gap

### Current ticket generation input

The current ticket draft flow only sends the original ticket description as `customer_message`.

It does not send:

- prior agent replies
- later customer follow-up replies
- the latest customer message separately
- conversation state

### Current live chat generation input

Live chat already sends:

- `conversation_history`
- `latest_message`

So live chat is closer to the correct model, but the app still does not automatically regenerate a new suggestion whenever a new customer message arrives.

## Target Outcome

Member 3 should support a conversation-aware drafting model for both tickets and live chat.

After any new customer follow-up:

1. the backend persists the new message
2. the support UI receives the realtime event
3. the app rebuilds the full thread context
4. Member 1 re-analyzes the newest customer input
5. Member 2 retrieves fresh context using the updated thread
6. Member 3 generates a new grounded reply draft or suggestion
7. the new draft is stored as the latest AI artifact for agent review

## Scope

This spec covers:

- Member 3 API contract changes
- integration changes in the support app
- artifact persistence expectations
- workflow status mapping
- acceptance criteria

This spec does not redefine the backend `5000` ticket or chat transport APIs. Those remain owned by the customer backend.

## Required Member 3 API Changes

## 1. Ticket Draft Endpoint Must Become Thread-Aware

### Current endpoint

```text
POST /tickets/{ticket_id}/draft
```

### Keep the route

The route can remain the same for compatibility, but the request schema must be expanded so ticket drafting is based on the full conversation, not only the original ticket body.

### Required request shape

```json
{
  "conversation_history": [
    {
      "sender": "customer",
      "message": "I was charged twice yesterday.",
      "timestamp": "2026-06-19T09:00:00Z"
    },
    {
      "sender": "agent",
      "message": "Please share your transaction ID.",
      "timestamp": "2026-06-19T09:05:00Z"
    },
    {
      "sender": "customer",
      "message": "The transaction ID is TXN-839201.",
      "timestamp": "2026-06-19T09:08:00Z"
    }
  ],
  "latest_customer_message": "The transaction ID is TXN-839201.",
  "subject": "Double charge issue",
  "category": "Billing",
  "priority": "High",
  "sentiment": "Frustrated",
  "classification_confidence": 0.86,
  "entities": {
    "transaction_id": "TXN-839201"
  },
  "channel": "email",
  "customer_plan": "standard",
  "created_at": "2026-06-19T09:00:00Z",
  "ticket_status": "in_progress",
  "retrieved_context": [
    {
      "source": "Refund Policy",
      "section": "Duplicate Charges",
      "text": "Duplicate charges are eligible for refund after payment verification.",
      "score": 0.91
    }
  ]
}
```

### Required additions

- `conversation_history`: full ordered ticket thread
- `latest_customer_message`: newest customer reply, separate from history
- `ticket_status`: current backend status
- keep existing structured fields for category, priority, sentiment, entities, and retrieved context

### Required rules

- `conversation_history` must be chronological
- the last customer-authored message must match `latest_customer_message`
- Member 3 must use the latest customer message as the primary drafting target
- Member 3 must still use earlier thread entries to avoid repeated questions and contradictions

## 2. Live Chat Suggestion Endpoint Must Follow The Same Reasoning Model

### Current endpoint

```text
POST /chat/conversations/{conversation_id}/suggest
```

### Keep the route

The route is fine, but the behavior should be standardized with tickets.

### Required request expectations

The endpoint should continue to accept:

- `conversation_history`
- `latest_message`
- `known_details`
- `missing_details`
- `customer_plan`
- `retrieved_context`

### Required behavior updates

- treat the latest customer-authored message as the main generation target
- use recent thread history to avoid duplicate prompts
- consider prior agent commitments before generating the next reply
- support repeated regeneration safely as the conversation evolves

## 3. Member 3 Response Contract Should Stay Structured

Ticket draft and live chat suggestion responses should continue returning:

- reply text
- internal notes
- citations
- confidence
- missing info
- suggested status
- resolution likelihood
- escalation flags

### Ticket response fields

```json
{
  "reply_draft": "Thanks for sharing the transaction ID. I have enough information to verify the duplicate charge and will check the refund record now.",
  "agent_notes": "Customer provided the missing transaction ID. Next step is refund verification.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.84,
  "missing_info": [],
  "suggested_status": "IN_PROGRESS",
  "resolution_likely": false,
  "escalation_required": false,
  "escalation_reason": null
}
```

### Live chat response fields

```json
{
  "suggested_reply": "Thanks for sharing that. I can now verify the duplicate charge and check the refund status for you.",
  "agent_notes": "Customer supplied the missing billing identifier.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.84,
  "missing_info": [],
  "suggested_status": "ACTIVE",
  "resolution_likely": false,
  "escalation_required": false,
  "escalation_reason": null
}
```

## Integration Changes Required In This App

## 4. Ticket Copilot Generation Must Use The Thread

The current ticket copilot request builder must be changed so it no longer uses only the original ticket description.

### Required app-side change

Build the Member 3 ticket payload from the full ticket conversation:

- initial ticket description
- all agent replies
- all customer follow-up replies

### Required source of truth

Use the already loaded `ticketDetail.replies` conversation as the ticket thread input.

### Required payload mapping

- map each `SupportMessage` to Member 3 `conversation_history`
- set `latest_customer_message` to the newest message where `from === "customer"`
- keep the ticket subject and current ticket status

## 5. Ticket Draft Regeneration Must Be Event-Driven

When the app receives a new `ticket_reply` realtime event:

- if the new reply came from the customer, regenerate a fresh Member 3 draft
- if the new reply came from the agent, do not auto-regenerate

### Required behavior

- customer reply should invalidate the old AI draft as the latest working answer
- a new draft should be created from the updated thread
- the agent should see the updated draft without needing to click `Regenerate`

### Recommended guardrails

- debounce repeated refreshes if several events arrive quickly
- avoid regenerating twice for the same latest message ID
- skip regeneration for closed tickets

## 6. Live Chat Suggestion Regeneration Must Be Event-Driven

When the app receives a new `receive_message` event:

- if the new message is from the customer, regenerate the live chat suggestion
- if the new message is from the agent, do not auto-regenerate

### Required behavior

- the newest customer message becomes the new drafting target
- the suggestion should reflect the full conversation state
- outdated suggestions should not remain the visible default after a customer follow-up

## 7. Member 1 And Member 2 Must Be Re-Run On Updated Input

Full Member 3 integration is not only a prompt change.

Every regenerated ticket draft or live chat suggestion must trigger:

1. Member 1 analysis on the newest customer-authored message
2. Member 2 retrieval using a query built from the updated thread
3. Member 3 response generation using the refreshed analysis and retrieval context

### Reason

If only Member 3 is rerun without refreshed analysis and retrieval:

- status recommendations may stay stale
- missing fields may remain incorrect
- retrieved evidence may ignore the newly supplied customer details

## Workflow Semantics Member 3 Must Follow

## 8. Ticket Suggested Status Mapping

Member 3 should treat ticket statuses as workflow recommendations, not database commands.

### Expected recommendations

- `WAITING_CUSTOMER`: agent needs more customer information
- `IN_PROGRESS`: customer has replied and work is continuing
- `RESOLVED`: response likely settles the issue
- `ESCALATED`: handoff is needed

### Important rule

If the customer provides missing information after an earlier `WAITING_CUSTOMER` draft:

- the new suggestion should usually move away from `WAITING_CUSTOMER`
- it should become `IN_PROGRESS` unless escalation or full resolution is more appropriate

## 9. Live Chat Suggested Status Mapping

Expected live chat recommendations:

- `WAITING_CUSTOMER`
- `ACTIVE`
- `TRANSFERRED`
- `RESOLVED`

### Important rule

If the customer answers the last agent question:

- the next suggestion should normally move from `WAITING_CUSTOMER` to `ACTIVE`
- it should not keep asking for the same information unless that information is still actually missing

## Artifact Persistence Requirements

## 10. Every Regenerated Output Must Be Stored As A New Artifact

Do not overwrite old drafts or suggestions in place before review.

### Required behavior

Each new AI generation after a customer follow-up should create a new record with:

- current conversation snapshot
- latest analysis snapshot
- latest retrieval snapshot
- suggested status
- missing info
- confidence

### Reason

This preserves:

- auditability
- offline evaluation
- agent feedback comparison
- draft lineage across a multi-turn case

## 11. Persist The Trigger Context

Each stored draft or suggestion should indicate why it was generated.

### Recommended metadata

- `trigger_type`: `initial`, `customer_followup`, `manual_regenerate`, `agent_accept`
- `trigger_message_id`: newest message that caused regeneration
- `conversation_turn_count`

This can be added in the app persistence layer even if Member 3 does not return it directly.

## Quality Requirements For Member 3

## 12. Member 3 Must Avoid Repeat Questions

When the customer already provided requested data in the thread:

- do not ask for the same field again
- update `missing_info`
- update `agent_notes`
- update `suggested_status`

### Example

If the earlier draft asked for:

- `transaction_id`

and the customer later provides:

- `TXN-839201`

the next output must not continue asking for `transaction_id`.

## 13. Member 3 Must Respect Prior Agent Commitments

If an earlier agent reply promised a next step:

- check refund
- verify account
- escalate to billing

then the next generated response must remain consistent with that commitment unless new evidence changes the case.

## 14. Member 3 Must Handle Reopened Work

If a ticket was previously treated as resolved and the customer replies again:

- the next draft should treat the case as active work
- it should not assume the issue remains resolved
- it should usually recommend `IN_PROGRESS` unless the new message confirms closure

## Required Consumer-Side Changes

## 15. Ticket UI

Required updates:

- detect whether the newest `ticket_reply` is customer-authored
- trigger regeneration automatically
- replace the visible current draft with the newest artifact
- clearly label that the AI draft was refreshed after customer follow-up

## 16. Live Chat UI

Required updates:

- detect customer-authored `receive_message`
- trigger regeneration automatically
- update the suggestion panel without manual refresh
- avoid interrupting an agent currently typing by applying safe state handling

## 17. Feedback And Evaluation

Member 4 analytics should later be able to distinguish:

- drafts generated from initial customer input
- drafts generated after customer follow-up
- drafts accepted after regeneration
- drafts ignored because they became stale

That means the persistence layer should preserve enough metadata for later reporting.

## Acceptance Criteria

## 18. Ticket Acceptance Criteria

The full integration is complete only when all of the following are true:

1. Customer submits a ticket.
2. Agent sends a reply asking for missing information.
3. Customer uses `POST /api/tickets/:trackingCode/customer-replies`.
4. The ticket thread updates in the support UI.
5. Member 1 re-analyzes the newest customer reply.
6. Member 2 reruns retrieval using updated thread context.
7. Member 3 generates a new draft from the full thread.
8. The new draft no longer asks for information the customer already provided.
9. The draft status recommendation updates correctly, usually from `WAITING_CUSTOMER` to `IN_PROGRESS`.
10. The new draft is stored as a new artifact for review.

## 19. Live Chat Acceptance Criteria

The full integration is complete only when all of the following are true:

1. Customer sends a live chat message.
2. Agent replies with an AI-assisted response.
3. Customer sends another message through the chat socket.
4. The conversation refreshes in the support UI.
5. Member 1 re-analyzes the newest customer message.
6. Member 2 reruns retrieval.
7. Member 3 generates a new suggestion automatically.
8. The new suggestion reflects the latest customer message and recent thread context.
9. The agent does not need to click `Regen` to get an updated suggestion.

## Implementation Order

## 20. Recommended Sequence

1. Expand Member 3 ticket draft request schema to accept full thread context.
2. Standardize Member 3 ticket reasoning with the existing live chat reasoning model.
3. Update app-side ticket copilot generation to send `conversation_history` and `latest_customer_message`.
4. Add customer-message-triggered regeneration for ticket realtime events.
5. Add customer-message-triggered regeneration for live chat realtime events.
6. Persist new metadata for regeneration trigger and lineage.
7. Run end-to-end manual tests for ticket follow-up and live chat follow-up.

## Bottom Line

Member 3 does not just need a small prompt tweak.

For the full solution, Member 3 must become conversation-aware for tickets in the same way it already is for live chat, and the app must automatically re-run the Member 1 -> Member 2 -> Member 3 pipeline whenever a customer sends a meaningful follow-up message.
