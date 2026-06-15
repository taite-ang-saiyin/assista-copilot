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

- Request bodies are currently accepted as raw JSON objects
- There is no authentication layer in the current implementation
- Response status is normally `200 OK` when the app completes processing
- If the model output is malformed or unsupported, the API still returns a structured fallback payload instead of crashing

## Endpoint 1: Create Ticket Draft

**Route**

```http
POST /tickets/{ticket_id}/draft
```

**Path Parameter**

- `ticket_id` `string`: ticket identifier, for example `TCK-001`

**Request Body**

Example:

```json
{
  "customer_message": "I was charged twice yesterday and I still have not received my refund.",
  "intent": "refund_request",
  "category": "Billing",
  "priority": "High",
  "sentiment": "Frustrated",
  "classification_confidence": 0.86,
  "entities": {
    "issue": "duplicate charge",
    "time": "yesterday"
  },
  "channel": "email",
  "customer_plan": "premium",
  "created_at": "2026-06-08T10:00:00Z",
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

- `customer_message` `string`: customer issue text
- `intent` `string`: upstream classification result
- `category` `string`: case category such as `Billing`
- `priority` `string`: case priority such as `High`
- `sentiment` `string`: detected sentiment
- `classification_confidence` `number`: score from upstream classifier
- `entities` `object`: extracted structured details
- `retrieved_context` `array[object]`: grounding evidence used by the response generator

**Response Body**

```json
{
  "reply_draft": "I am sorry for the trouble. Please share your transaction ID or payment receipt so we can verify the duplicate charge and help with the next steps.",
  "agent_notes": "Grounded in refund policy and still needs payment verification.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.76,
  "missing_info": [
    "transaction_id",
    "payment_receipt"
  ],
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
- `escalation_required` `boolean`: whether human escalation is required
- `escalation_reason` `string | null`: reason for escalation when applicable

## Endpoint 2: Create Live Chat Suggestion

**Route**

```http
POST /chat/conversations/{conversation_id}/suggest
```

**Path Parameter**

- `conversation_id` `string`: conversation identifier, for example `CHAT-101`

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
  "intent": "refund_request",
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
- `intent` `string`: upstream classification result
- `category` `string`: case category
- `priority` `string`: case priority
- `sentiment` `string`: detected sentiment
- `classification_confidence` `number`: classifier confidence
- `known_details` `object`: structured details already known
- `missing_details` `array[string]`: optional upstream missing fields
- `retrieved_context` `array[object]`: grounding evidence used by the response generator

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
- `escalation_required` `boolean`: whether human escalation is required
- `escalation_reason` `string | null`: reason for escalation when applicable

## Validation and Safety Rules

The API validates generated model output before returning it. Current safeguards include:

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
  "agent_notes": "Gemini returned malformed output that could not be validated.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.0,
  "missing_info": [
    "transaction_id",
    "payment_receipt"
  ],
  "escalation_required": true,
  "escalation_reason": "Gemini returned malformed output that could not be validated."
}
```

Live chat fallback:

```json
{
  "suggested_reply": "I need to review the available evidence before sending a final reply. Please let the customer know we are checking the details.",
  "agent_notes": "Gemini returned malformed output that could not be validated.",
  "citations": [
    "Refund Policy - Duplicate Charges"
  ],
  "confidence": 0.0,
  "missing_info": [
    "transaction_id",
    "payment_receipt"
  ],
  "escalation_required": true,
  "escalation_reason": "Gemini returned malformed output that could not be validated."
}
```

## cURL Examples

Ticket draft:

```bash
curl -X POST "http://127.0.0.1:8000/tickets/TCK-001/draft" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_message": "I was charged twice yesterday and I still have not received my refund.",
    "intent": "refund_request",
    "category": "Billing",
    "priority": "High",
    "sentiment": "Frustrated",
    "classification_confidence": 0.86,
    "entities": {
      "issue": "duplicate charge",
      "time": "yesterday"
    },
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
    "intent": "refund_request",
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
- [ticket_generator.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/generation/ticket_generator.py:1>)
- [livechat_generator.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/generation/livechat_generator.py:1>)
- [draft_evaluation.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/evaluation/draft_evaluation.py:1>)
- [schemas.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/llm/schemas.py:1>)
