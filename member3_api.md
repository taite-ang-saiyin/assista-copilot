# Customer Support AI API Reference

## Overview

This service exposes two FastAPI endpoints:

- `POST /tickets/{ticket_id}/draft`
- `POST /chat/conversations/{conversation_id}/suggest`

Default local base URL:

```text
http://127.0.0.1:8000
```

If the app is running in Docker and you are calling it from another device on the same LAN, use the host machine's current IP address instead of `127.0.0.1`.

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## LLM Behavior

- Primary provider: Gemini
- Fallback provider: local `llama.cpp` server
- Gemini is attempted first
- If Gemini errors or times out, the request falls back to the local model
- Response output is validated and may be overridden with a safe fallback response

## Common Notes

- Request bodies are validated with Pydantic models
- There is no authentication layer in the current implementation
- Response status is normally `200 OK` when the app completes processing
- If the model output is malformed or unsupported, the API still returns a structured fallback payload instead of crashing
- Malformed request bodies return `422 Unprocessable Entity`
- The HTTP API accepts one canonical `conversation_history` schema only; aliases such as `from`, `role`, `text`, or `body` are not accepted on the public routes

## Endpoint 1: Create Ticket Draft

**Route**

```http
POST /tickets/{ticket_id}/draft
```

**Path Parameter**

- `ticket_id` `string`: ticket identifier used by the current support app for this route
- In the current app, this should be the backend ticket identifier that the drafting request is scoped to, for example a tracking code such as `TCK-001`
- The route name stays `ticket_id` for compatibility, but it represents the app's real ticket identifier, not a separate Member 3 artifact ID

**Request Body**

Example:

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
      "message": "Please share your transaction ID so I can verify the duplicate charge.",
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
  "customer_plan": "premium",
  "created_at": "2026-06-19T09:00:00Z",
  "ticket_status": "WAITING_CUSTOMER",
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

**Important Request Fields**

- `conversation_history` `array[object]`: full chronological ticket thread used for drafting context
- `latest_customer_message` `string`: newest customer-authored message and primary drafting target
- `subject` `string`: ticket subject when available
- `category` `string`: case category such as `Billing`
- `priority` `string`: case priority such as `High`
- `sentiment` `string`: detected sentiment
- `classification_confidence` `number`: score from upstream classifier
- `entities` `object`: extracted structured details
- `ticket_status` `string`: current backend ticket workflow status
- `retrieved_context` `array[object]`: grounding evidence used by the response generator

**Conversation History Entry Schema**

Each `conversation_history` item must use this shape:

```json
{
  "sender": "customer",
  "message": "The transaction ID is TXN-839201.",
  "timestamp": "2026-06-19T09:08:00Z",
  "message_id": "msg_123"
}
```

Allowed fields:

- `sender` `string`: required, must be `customer` or `agent`
- `message` `string`: required, non-empty message text
- `timestamp` `string`: optional ISO-8601 timestamp
- `message_id` `string`: optional app/backend message identifier

**Ticket Request Semantics**

- `conversation_history` should be chronological
- the latest customer-authored item in `conversation_history` should match `latest_customer_message`
- the generator targets `latest_customer_message` first, but still uses the earlier thread to avoid repeated questions and contradictions
- if the customer already supplied a requested detail such as a transaction ID in the thread, the next draft should stop asking for it
- canonical history entries must use `sender` and `message`; alternate keys are rejected by the HTTP API

**Response Body**

```json
{
  "reply_draft": "Thanks for sharing the transaction ID. I have enough information to verify the duplicate charge and check the refund status.",
  "agent_notes": "Customer provided the missing transaction ID. Proceed with refund verification.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.76,
  "missing_info": [],
  "suggested_status": "IN_PROGRESS",
  "resolution_likely": false,
  "escalation_required": false,
  "escalation_reason": null
}
```

**Response Fields**

- `reply_draft` `string`: editable customer-facing reply draft
- `agent_notes` `string`: internal rationale for the support agent
- `citations` `array[string]`: supported citations derived from retrieved context
- `confidence` `number`: normalized score between `0.0` and `1.0`
- `missing_info` `array[string]`: details the agent still needs
- `suggested_status` `string`: Member 3 workflow recommendation
- `resolution_likely` `boolean`: whether the issue appears resolved based on the current grounded response
- `escalation_required` `boolean`: whether human escalation is required
- `escalation_reason` `string | null`: reason for escalation when applicable

**Ticket Status Separation**

- `ticket_status` in the request is the current backend workflow state already stored by the support system
- `suggested_status` in the response is Member 3's recommendation for the next workflow state
- Member 3 does not directly change backend state; the app decides whether to apply the recommendation

**Backend `ticket_status` Enum**

- `OPEN`
- `IN_PROGRESS`
- `WAITING_CUSTOMER`
- `WAITING_AGENT`
- `ESCALATED`
- `RESOLVED`
- `CLOSED`

**Member 3 Ticket `suggested_status` Enum**

- `WAITING_CUSTOMER`: the agent still needs customer information
- `IN_PROGRESS`: the customer has replied and work is continuing
- `RESOLVED`: the grounded response likely settles the case
- `ESCALATED`: human handoff is required

## Endpoint 2: Create Live Chat Suggestion

**Route**

```http
POST /chat/conversations/{conversation_id}/suggest
```

**Path Parameter**

- `conversation_id` `string`: conversation identifier, for example `CHAT-101`
- This should match the conversation identifier used by the current app/backend for the live chat thread

**Request Body**

Example:

```json
{
  "conversation_history": [
    {
      "sender": "customer",
      "message": "My account was charged twice."
    },
    {
      "sender": "agent",
      "message": "I am sorry to hear that."
    },
    {
      "sender": "customer",
      "message": "I need this fixed now."
    }
  ],
  "latest_message": "I need this fixed now.",
  "category": "Billing",
  "priority": "High",
  "sentiment": "Frustrated",
  "classification_confidence": 0.84,
  "known_details": {},
  "missing_details": [],
  "customer_plan": "premium",
  "retrieved_context": [
    {
      "source": "Refund Policy",
      "section": "Duplicate Charges",
      "text": "Duplicate charges are eligible for refund after payment verification.",
      "score": 0.88
    }
  ]
}
```

**Important Request Fields**

- `conversation_history` `array[object]`: prior messages in the chat
- `latest_message` `string`: most recent customer message
- `category` `string`: case category
- `priority` `string`: case priority
- `sentiment` `string`: detected sentiment
- `classification_confidence` `number`: classifier confidence
- `known_details` `object`: structured details already known
- `missing_details` `array[string]`: optional upstream missing fields
- `retrieved_context` `array[object]`: grounding evidence used by the response generator

**Conversation History Entry Schema**

Live chat uses the same canonical history item schema as tickets:

```json
{
  "sender": "customer",
  "message": "My account was charged twice.",
  "timestamp": "2026-06-19T09:00:00Z",
  "message_id": "msg_456"
}
```

**Live Chat Request Semantics**

- `conversation_history` should represent the current chat thread in order
- `latest_message` should be the newest customer-authored message
- the generator uses `latest_message` as the primary response target while still checking earlier turns for commitments and already provided details
- canonical history entries must use `sender` and `message`; alternate keys are rejected by the HTTP API

**Response Body**

```json
{
  "suggested_reply": "I am sorry for the trouble. Please share the transaction ID or payment receipt so we can verify the duplicate charge.",
  "agent_notes": "Asks for missing verification details before discussing refund steps.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.76,
  "missing_info": [
    "transaction_id",
    "payment_receipt"
  ],
  "suggested_status": "WAITING_CUSTOMER",
  "resolution_likely": false,
  "escalation_required": false,
  "escalation_reason": null
}
```

**Response Fields**

- `suggested_reply` `string`: editable live chat reply suggestion
- `agent_notes` `string`: internal rationale for the support agent
- `citations` `array[string]`: supported citations derived from retrieved context
- `confidence` `number`: normalized score between `0.0` and `1.0`
- `missing_info` `array[string]`: details the agent still needs
- `suggested_status` `string`: workflow status recommendation such as `WAITING_CUSTOMER`, `ACTIVE`, `TRANSFERRED`, or `RESOLVED`
- `resolution_likely` `boolean`: whether the issue appears resolved based on the current grounded response
- `escalation_required` `boolean`: whether human escalation is required
- `escalation_reason` `string | null`: reason for escalation when applicable

**Live Chat Status Guidance**

- `WAITING_CUSTOMER`: the agent still needs customer information
- `ACTIVE`: the customer has replied and the chat is actively being handled
- `TRANSFERRED`: human handoff is required
- `RESOLVED`: the grounded response likely settles the case

## Validation and Safety Rules

The API validates both request payloads and generated model output.

Request validation includes:

- canonical `conversation_history` entries only
- `sender` must be `customer` or `agent`
- `message` must be present and non-empty
- `latest_customer_message` for tickets must match the latest customer-authored history entry
- `latest_message` for live chat must match the latest customer-authored history entry
- malformed request payloads return `422 Unprocessable Entity`

Generated output safeguards include:

- empty response text is rejected
- unsupported or missing citations are corrected or flagged
- unsupported refund promises are flagged
- restricted legal, privacy, and security claims are flagged
- missing information is heuristically added for common billing and login cases

When validation fails, the response is forced into a safer structure:

- `escalation_required` becomes `true`
- `confidence` is reduced
- `escalation_reason` is populated
- fallback response text is returned if needed

## Fallback Response Examples

Ticket fallback:

```json
{
  "reply_draft": "Thanks for reaching out. I need a support agent to review the available evidence before sending a final response.",
  "agent_notes": "LLM returned malformed output that could not be validated.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.0,
  "missing_info": [
    "transaction_id",
    "payment_receipt"
  ],
  "suggested_status": "ESCALATED",
  "resolution_likely": false,
  "escalation_required": true,
  "escalation_reason": "LLM returned malformed output that could not be validated."
}
```

Live chat fallback:

```json
{
  "suggested_reply": "I need to review the available evidence before sending a final reply. Please let the customer know we are checking the details.",
  "agent_notes": "LLM returned malformed output that could not be validated.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.0,
  "missing_info": [
    "transaction_id",
    "payment_receipt"
  ],
  "suggested_status": "TRANSFERRED",
  "resolution_likely": false,
  "escalation_required": true,
  "escalation_reason": "LLM returned malformed output that could not be validated."
}
```

## cURL Examples

Ticket draft:

```bash
curl -X POST "http://127.0.0.1:8000/tickets/TCK-001/draft" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {
        "sender": "customer",
        "message": "I was charged twice yesterday.",
        "timestamp": "2026-06-19T09:00:00Z"
      },
      {
        "sender": "agent",
        "message": "Please share your transaction ID so I can verify the duplicate charge.",
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
    "ticket_status": "WAITING_CUSTOMER",
    "retrieved_context": [
      {
        "source": "Refund Policy",
        "section": "Duplicate Charges",
        "text": "Duplicate charges are eligible for refund after payment verification.",
        "score": 0.91
      }
    ]
  }'
```

Live chat suggestion:

```bash
curl -X POST "http://127.0.0.1:8000/chat/conversations/CHAT-101/suggest" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {
        "sender": "customer",
        "message": "My account was charged twice."
      },
      {
        "sender": "agent",
        "message": "I am sorry to hear that."
      },
      {
        "sender": "customer",
        "message": "I need this fixed now."
      }
    ],
    "latest_message": "I need this fixed now.",
    "category": "Billing",
    "priority": "High",
    "sentiment": "Frustrated",
    "classification_confidence": 0.84,
    "retrieved_context": [
      {
        "source": "Refund Policy",
        "section": "Duplicate Charges",
        "text": "Duplicate charges are eligible for refund after payment verification.",
        "score": 0.88
      }
    ]
  }'
```

## Source Files

- [app.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/app.py:1>)
- [ticket_draft_api.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/api/ticket_draft_api.py:1>)
- [livechat_suggestion_api.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/api/livechat_suggestion_api.py:1>)
- [request_models.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/api/request_models.py:1>)
- [ticket_generator.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/generation/ticket_generator.py:1>)
- [livechat_generator.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/generation/livechat_generator.py:1>)
- [draft_evaluation.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/evaluation/draft_evaluation.py:1>)
- [schemas.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/llm/schemas.py:1>)
