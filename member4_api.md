# Member 4 API Reference

## Overview

This document describes the backend API for the Member 4 Evaluation, Feedback, Analytics, and AI Quality Monitoring service.

Default local base URL:

```text
http://127.0.0.1:8001
```

Docker service:

```text
member4-api
```

Health check:

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "service": "member4"
}
```

## Current Notes

- The service is a separate FastAPI app from the main support API.
- Storage is designed for Supabase/PostgreSQL, with an in-memory repository for tests and local development.
- There is currently no authentication layer on these routes.
- Before using the service against Supabase, apply [supabase_schema.sql](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/sql/supabase_schema.sql:1>).
- The implementation now follows the updated `member_4_tasks.md` scope: offline benchmark evaluation, dynamic live monitoring, feedback analytics, error analysis, dataset generation, and export.
- Older analytics routes are still available for compatibility:
  `GET /api/member4/analytics/overview`
  `GET /api/member4/analytics/evaluation`
  `GET /api/member4/analytics/live-chat`
  `GET /api/member4/analytics/comparisons`

## Route Groups

- Offline evaluation runs and metrics
- Live interaction logging
- Agent feedback analytics
- Error analysis
- Fine-tuning example review and export
- Member 1, 2, and 3 import endpoints
- Benchmark and live-monitoring summaries
- A/B assignment storage

---

## Data Model Summary

Main tables:

- `evaluation_runs`
- `evaluation_metrics`
- `ai_interactions`
- `agent_feedback`
- `error_analysis`
- `fine_tuning_examples`
- `ab_test_assignments`

Primary IDs returned by the API:

- Evaluation run: `run_id`
- Evaluation metric: `metric_id`
- Interaction: `interaction_id`
- Feedback: `feedback_id`
- Error: `error_id`
- Fine-tuning example: `example_id`
- A/B assignment: `assignment_id`

For compatibility, responses also include `id` with the same value as the primary ID field.

---

## Offline Evaluation APIs

### POST /api/member4/evaluation-runs

Create one offline benchmark run and optionally attach metrics and error cases.

Example request:

```json
{
  "member_name": "Member 3",
  "run_name": "local_llm_ft_v1_eval",
  "module": "generation",
  "model_name": "local_llm_finetuned",
  "model_version": "local_llm_ft_v1",
  "prompt_version": "support_prompt_v3",
  "dataset_name": "reply_eval_dataset_v1",
  "dataset_version": "v1",
  "dataset_size": 50,
  "mlflow_run_id": "run_123",
  "metrics": [
    {
      "metric_name": "faithfulness_rate",
      "metric_value": 0.86,
      "metric_unit": "ratio"
    },
    {
      "metric_name": "json_validity_rate",
      "metric_value": 0.96,
      "metric_unit": "ratio"
    }
  ],
  "error_cases": [
    {
      "source_type": "offline_eval",
      "module": "generation",
      "error_type": "hallucination",
      "severity": "high",
      "description": "Unsupported refund promise detected."
    }
  ],
  "notes": "Offline benchmark for the current fine-tuned model."
}
```

Example response:

```json
{
  "run": {
    "run_id": "generated-run-id",
    "id": "generated-run-id",
    "member_name": "Member 3",
    "module": "generation",
    "run_name": "local_llm_ft_v1_eval"
  },
  "metrics": [
    {
      "metric_id": "generated-metric-id",
      "id": "generated-metric-id",
      "run_id": "generated-run-id",
      "metric_name": "faithfulness_rate",
      "metric_value": 0.86,
      "metric_unit": "ratio"
    }
  ],
  "errors": [
    {
      "error_id": "generated-error-id",
      "id": "generated-error-id",
      "source_type": "offline_eval",
      "module": "generation",
      "error_type": "hallucination",
      "severity": "high"
    }
  ]
}
```

### GET /api/member4/evaluation-runs

List evaluation runs.

Query parameters:

- `module`: optional filter such as `classifier`, `retrieval`, `generation`, `live_chat`, or `full_pipeline`

### GET /api/member4/evaluation-runs/{run_id}

Return one evaluation run with attached metrics.

### POST /api/member4/evaluation-runs/{run_id}/metrics

Append additional metrics to an existing run.

Example request:

```json
[
  {
    "metric_name": "reply_quality_avg",
    "metric_value": 4.2,
    "metric_unit": "score"
  }
]
```

### GET /api/member4/benchmark-summary

Return the latest benchmark cards and latest run by module.

This is the API-facing version of the offline benchmark summary required by the updated task spec.

---

## Live Monitoring APIs

### POST /api/member4/interactions

Store one AI interaction from a real ticket or live chat.

Example request:

```json
{
  "ticket_id": "00000000-0000-0000-0000-000000000001",
  "mode": "ticket",
  "module": "full_pipeline",
  "category": "Billing",
  "intent": "refund_request",
  "priority": "High",
  "sentiment": "Frustrated",
  "customer_message": "I was charged twice and I want a refund.",
  "ai_output": "I am sorry for the trouble. Could you please share your transaction ID?",
  "confidence": 0.84,
  "model_name": "local_llm_finetuned",
  "model_version": "local_llm_ft_v1",
  "prompt_version": "support_prompt_v3",
  "retrieval_version": "hybrid_search_v1",
  "latency_ms": 2100,
  "escalation_required": false
}
```

### GET /api/member4/interactions

List AI interactions.

Query parameters:

- `mode`
- `module`
- `category`
- `intent`
- `priority`
- `model_version`
- `prompt_version`
- `retrieval_version`
- `ticket_id`
- `conversation_id`
- `date_from` in `YYYY-MM-DD`
- `date_to` in `YYYY-MM-DD`

### GET /api/member4/live-summary

Return dynamic live-monitoring metrics computed from stored interactions, feedback, and error rows.

Query parameters:

- All major interaction filters from `/interactions`
- `low_confidence_threshold`: defaults to `0.6`

Example fields in the response:

```json
{
  "total_ai_interactions": 540,
  "acceptance_rate": 0.72,
  "edit_rate": 0.18,
  "rejection_rate": 0.1,
  "ignore_rate": 0.05,
  "regeneration_rate": 0.03,
  "escalation_rate": 0.09,
  "average_confidence": 0.81,
  "average_rating": 4.1,
  "average_latency": 1934.2,
  "low_confidence_count": 28,
  "critical_unresolved_errors": 2,
  "live_chat_metrics": {
    "live_chat_suggestion_acceptance_rate": 0.69,
    "live_chat_ignore_rate": 0.11,
    "live_chat_average_latency": 1422.5,
    "live_chat_escalation_rate": 0.08,
    "live_chat_repeated_question_count": 4
  }
}
```

### GET /api/member4/performance-by-category

Return dynamic performance grouped by `category`.

### GET /api/member4/performance-by-intent

Return dynamic performance grouped by `intent`.

### GET /api/member4/confidence-distribution

Return bucketed confidence counts and average confidence.

### GET /api/member4/low-confidence-interactions

Return the lowest-confidence interactions.

Query parameters:

- `threshold`: defaults to `0.6`
- `limit`: defaults to `50`

---

## Feedback APIs

### POST /api/member4/feedback

Store one agent feedback row.

If `interaction_id` is supplied, it must reference an existing interaction.

Example request:

```json
{
  "interaction_id": "generated-interaction-id",
  "ticket_id": "00000000-0000-0000-0000-000000000001",
  "action": "edited",
  "rating": 4,
  "original_reply": "Please send transaction ID.",
  "edited_reply": "I am sorry for the trouble. Could you please share your transaction ID so we can verify the duplicate charge?",
  "failure_reason": "poor_tone",
  "feedback_notes": "The reply was correct but too abrupt."
}
```

Compatibility note:

- Older clients may still send `draft_id` and `suggestion_id`. Those fields are still accepted and stored.

### GET /api/member4/feedback

List feedback rows.

Query parameters:

- `action`
- `interaction_id`
- `ticket_id`
- `conversation_id`
- `date_from`
- `date_to`

### GET /api/member4/feedback-summary

Return aggregate feedback counts and rates.

### GET /api/member4/feedback-trend

Return feedback grouped by day with action counts and average rating.

### GET /api/member4/failure-reasons

Return aggregated `failure_reason` counts and rates.

---

## Error Analysis APIs

### POST /api/member4/errors

Store one error-analysis row.

If `run_id` is supplied, it must reference an existing evaluation run.
If `interaction_id` is supplied, it must reference an existing interaction.

Example request:

```json
{
  "source_type": "live_feedback",
  "interaction_id": "generated-interaction-id",
  "ticket_id": "00000000-0000-0000-0000-000000000001",
  "module": "full_pipeline",
  "error_type": "missed_escalation",
  "severity": "critical",
  "description": "Security case should have been escalated to the security team.",
  "expected_behavior": "Escalate immediately.",
  "actual_behavior": "The AI suggested basic troubleshooting instead."
}
```

### GET /api/member4/errors

List error cases.

Query parameters:

- `module`
- `source_type`
- `severity`
- `resolved`
- `date_from`
- `date_to`

### GET /api/member4/error-summary

Return counts by error type, severity, source type, and resolved status.

### PATCH /api/member4/errors/{error_id}/resolved

Mark an error case as resolved.

Example request:

```json
{
  "resolution_notes": "Escalation rule updated for account security cases."
}
```

---

## Dataset Management APIs

### POST /api/member4/fine-tuning-examples

Create one candidate or approved fine-tuning example.

If `source_feedback_id` is supplied, it must reference an existing feedback row.
If `source_interaction_id` is supplied, it must reference an existing interaction.

Example request:

```json
{
  "source_feedback_id": "generated-feedback-id",
  "source_interaction_id": "generated-interaction-id",
  "task_type": "reply_generation",
  "input_json": {
    "customer_message": "I was charged twice.",
    "category": "Billing",
    "intent": "refund_request",
    "missing_info": ["transaction_id"]
  },
  "target_json": {
    "reply": "I am sorry for the trouble. Could you please share your transaction ID so we can verify the duplicate charge?"
  },
  "quality_score": 5,
  "approved": false,
  "approval_status": "pending"
}
```

### GET /api/member4/fine-tuning-examples

List fine-tuning examples.

Query parameters:

- `approved`
- `approval_status`
- `task_type`

### PATCH /api/member4/fine-tuning-examples/{example_id}/approve

Approve one example.

Body is optional. If provided, the endpoint still forces:

- `approved = true`
- `approval_status = approved`

### PATCH /api/member4/fine-tuning-examples/{example_id}/reject

Reject one example.

Body is optional. If provided, the endpoint still forces:

- `approved = false`
- `approval_status = rejected`

### GET /api/member4/fine-tuning-examples/export

Export examples.

Query parameters:

- `approved`: defaults to `true`
- `format`: `jsonl` or `csv`, defaults to `jsonl`

Example JSONL row:

```json
{"task_type":"reply_generation","input":{"customer_message":"I was charged twice."},"target":{"reply":"Please share your transaction ID."}}
```

---

## Member Import APIs

These endpoints normalize evaluation inputs from Members 1, 2, and 3 into:

- `evaluation_runs`
- `evaluation_metrics`
- `error_analysis`

### POST /api/member4/import/member1

Example request:

```json
{
  "run_name": "distilbert_ticket_v1_eval",
  "member_name": "Member 1",
  "module": "classifier",
  "model_name": "DistilBERT",
  "model_version": "distilbert_ticket_v1",
  "dataset_name": "ticket_test_dataset_v1",
  "dataset_size": 100,
  "mlflow_run_id": "abc123",
  "metrics": {
    "intent_accuracy": 0.88,
    "category_accuracy": 0.85,
    "priority_f1": 0.81,
    "urgent_recall": 0.76,
    "sentiment_accuracy": 0.79
  },
  "failed_prediction_examples": [
    {
      "error_type": "wrong_priority",
      "severity": "high",
      "description": "Security issue predicted as Medium priority."
    }
  ]
}
```

### POST /api/member4/import/member2

Example request:

```json
{
  "run_name": "hybrid_search_v1_eval",
  "member_name": "Member 2",
  "module": "retrieval",
  "retrieval_version": "hybrid_search_v1",
  "model_name": "bge-small-en",
  "embedding_model": "bge-small-en",
  "chunking_strategy": "markdown_sections_v1",
  "dataset_name": "rag_test_dataset_v1",
  "dataset_size": 50,
  "metrics": {
    "retrieval_hit_rate": 0.84,
    "citation_coverage": 0.79,
    "context_precision": 0.77,
    "mrr": 0.72
  },
  "failed_retrieval_examples": []
}
```

### POST /api/member4/import/member3

Example request:

```json
{
  "run_name": "local_llm_ft_v1_eval",
  "member_name": "Member 3",
  "module": "generation",
  "model_name": "local_llm_finetuned",
  "model_version": "local_llm_ft_v1",
  "prompt_version": "support_prompt_v3",
  "dataset_name": "reply_eval_dataset_v1",
  "dataset_size": 50,
  "metrics": {
    "faithfulness_rate": 0.86,
    "hallucination_rate": 0.07,
    "reply_quality_avg": 4.2,
    "escalation_accuracy": 0.88,
    "json_validity_rate": 0.96
  },
  "failed_generation_examples": []
}
```

---

## Analytics Compatibility APIs

These routes remain available because the existing project already referenced them.

### GET /api/member4/analytics/overview

Returns:

- Offline benchmark summary
- Dynamic live monitoring summary
- Feedback summary
- Error summary
- Fine-tuning example counts

### GET /api/member4/analytics/evaluation

Return summarized metric aggregates.

Query parameters:

- `module`

### GET /api/member4/analytics/live-chat

Return live-chat-focused evaluation and monitoring summary.

### GET /api/member4/analytics/comparisons

Return run-level comparison rows with attached metrics.

Query parameters:

- `module`
- `metric_names` repeated query parameter

Example:

```http
GET /api/member4/analytics/comparisons?module=generation&metric_names=faithfulness_rate&metric_names=json_validity_rate
```

---

## A/B Assignment APIs

### POST /api/member4/ab-test-assignments

Store one A/B assignment row.

Current canonical payload:

```json
{
  "entity_type": "conversation",
  "entity_id": "00000000-0000-0000-0000-000000000003",
  "experiment_name": "prompt-v1-vs-v2",
  "variant_name": "candidate_a"
}
```

Compatibility note:

- Older clients may still send `module`, `subject_id`, and `variant`. Those keys are still accepted.

### GET /api/member4/ab-test-assignments

List A/B assignments.

Query parameters:

- `experiment_name`

Responses include both the canonical fields and compatibility aliases:

- `entity_type` and `module`
- `entity_id` and `subject_id`
- `variant_name` and `variant`

---

## Environment Variables

Member 4 depends on these runtime variables:

```text
MEMBER4_STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
MEMBER4_BASE_URL=http://127.0.0.1:8001
```

For local in-memory testing:

```text
MEMBER4_STORAGE_BACKEND=memory
```

---

## Related Files

- [member4_api/main.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/main.py:1>)
- [member4_api/routers.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/routers.py:1>)
- [member4_api/schemas.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/schemas.py:1>)
- [member4_api/repository.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/repository.py:1>)
- [member4_api/sql/supabase_schema.sql](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/sql/supabase_schema.sql:1>)
- [live_chat/tests/test_member4_api.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/tests/test_member4_api.py:1>)
- [docker-compose.yml](</c:/Users/Msi GF66/Desktop/Customer Support AI/docker-compose.yml:1>)
- [member_4_tasks.md](</c:/Users/Msi GF66/Desktop/Customer Support AI/member_4_tasks.md:1>)
