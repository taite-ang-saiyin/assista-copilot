# Member 4 API Reference

## Overview

This document describes the backend API for the Member 4 Evaluation, Feedback, and Analytics service.

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
- Storage is designed for Supabase/PostgreSQL.
- There is currently no authentication layer on these routes.
- Before using the service against Supabase, apply [supabase_schema.sql](</c:/Users/Msi GF66/Desktop/Customer Support AI/member4_api/sql/supabase_schema.sql:1>).

## Core Route Groups

- Evaluation runs and metrics
- Feedback logging
- Error analysis
- Fine-tuning examples and JSONL export
- Import endpoints for Members 1, 2, and 3
- Analytics summaries
- A/B assignment storage

---

## POST /api/member4/evaluation-runs

Create one evaluation run and optionally attach metrics and error cases.

### Example Request

```json
{
  "run_name": "member3_generation_eval_v1",
  "module": "generation",
  "model_name": "member3_qwen_3b_q4_k_m",
  "prompt_version": "support_prompt_v3",
  "dataset_name": "member3_qwen_test_clean",
  "dataset_version": "v1",
  "mlflow_run_id": "run_123",
  "metrics": [
    {
      "metric_name": "json_validity_rate",
      "metric_value": 0.96,
      "metric_unit": "ratio"
    }
  ],
  "error_cases": [
    {
      "module": "generation",
      "error_type": "hallucination",
      "severity": "high",
      "description": "Unsupported refund promise detected."
    }
  ],
  "notes": "Offline evaluation summary.",
  "metadata": {
    "scenario": "local-finetuned"
  }
}
```

### Response

```json
{
  "run": {
    "id": "generated-id",
    "run_name": "member3_generation_eval_v1",
    "module": "generation"
  },
  "metrics": [
    {
      "id": "generated-id",
      "run_id": "generated-id",
      "metric_name": "json_validity_rate",
      "metric_value": 0.96,
      "metric_unit": "ratio"
    }
  ],
  "errors": [
    {
      "id": "generated-id",
      "module": "generation",
      "error_type": "hallucination",
      "severity": "high"
    }
  ]
}
```

## GET /api/member4/evaluation-runs

List evaluation runs.

### Query Parameters

- `module`: optional filter such as `classifier`, `retrieval`, `generation`, or `live_chat`

## GET /api/member4/evaluation-runs/{run_id}

Return one evaluation run with attached metrics.

## POST /api/member4/evaluation-runs/{run_id}/metrics

Append additional metrics to an existing run.

### Example Request

```json
[
  {
    "metric_name": "faithfulness_rate",
    "metric_value": 0.88,
    "metric_unit": "ratio"
  }
]
```

---

## POST /api/member4/feedback

Store agent feedback for a draft or live-chat suggestion.

### Example Request

```json
{
  "ticket_id": "T001",
  "draft_id": "D001",
  "agent_id": "A001",
  "action": "edited",
  "rating": 4,
  "original_reply": "Please send transaction ID.",
  "edited_reply": "I am sorry for the trouble. Could you please share your transaction ID so we can verify the duplicate charge?",
  "failure_reason": "Poor tone",
  "feedback_notes": "Needed a more empathetic opening."
}
```

## GET /api/member4/feedback

List feedback rows.

## GET /api/member4/feedback-summary

Return aggregate feedback statistics.

### Example Response

```json
{
  "total_feedback": 12,
  "action_counts": {
    "accepted": 7,
    "edited": 3,
    "rejected": 2
  },
  "action_rates": {
    "accepted": 0.5833,
    "edited": 0.25,
    "rejected": 0.1667
  },
  "average_rating": 4.25
}
```

---

## POST /api/member4/errors

Store one error-analysis record.

### Example Request

```json
{
  "module": "retrieval",
  "run_id": "RUN-001",
  "error_type": "bad_retrieval",
  "severity": "medium",
  "description": "Irrelevant chunk returned for refund request.",
  "expected_behavior": "Refund policy should have ranked first.",
  "actual_behavior": "A generic billing FAQ ranked first."
}
```

## GET /api/member4/errors

List error cases.

### Query Parameters

- `module`: optional module filter

## PATCH /api/member4/errors/{error_id}/resolved

Mark an error case as resolved.

### Example Request

```json
{
  "resolution_notes": "Reranking weights updated."
}
```

## GET /api/member4/error-summary

Return aggregate error counts by type and severity.

---

## POST /api/member4/fine-tuning-examples

Create a fine-tuning example record.

### Example Request

```json
{
  "task_type": "reply_generation",
  "input_json": {
    "customer_message": "I was charged twice yesterday.",
    "retrieved_context": "Duplicate charges are eligible for refund after payment verification."
  },
  "target_json": {
    "reply": "I am sorry for the trouble. Could you please share your transaction ID so we can verify the duplicate charge?"
  },
  "quality_score": 5,
  "approved": false,
  "approval_status": "pending",
  "source_member": "member3"
}
```

## GET /api/member4/fine-tuning-examples

List fine-tuning examples.

### Query Parameters

- `approved`: optional boolean filter

## PATCH /api/member4/fine-tuning-examples/{example_id}/approve

Approve or reject a fine-tuning example.

### Example Request

```json
{
  "approved": true,
  "approval_status": "approved"
}
```

## GET /api/member4/fine-tuning-examples/export

Export examples as JSONL.

### Query Parameters

- `approved`: defaults to `true`

### Example Response

```json
{"task_type":"reply_generation","input":{"customer_message":"I was charged twice yesterday."},"target":{"reply":"Please share your transaction ID."}}
```

---

## POST /api/member4/import/member1

Import normalized evaluation output from Member 1.

### Example Request

```json
{
  "run_name": "distilbert_ticket_intelligence_v1",
  "module": "classifier",
  "model_name": "distilbert-base-uncased",
  "mlflow_run_id": "abc123",
  "dataset_name": "ticket_eval_set_v1",
  "metrics": {
    "intent_accuracy": 0.87,
    "category_accuracy": 0.84,
    "priority_accuracy": 0.81,
    "sentiment_accuracy": 0.78,
    "urgent_recall": 0.91
  },
  "failed_prediction_examples": []
}
```

## POST /api/member4/import/member2

Import normalized evaluation output from Member 2.

### Example Request

```json
{
  "run_name": "hybrid_retrieval_v1",
  "module": "retrieval",
  "retrieval_version": "hybrid_search_v1",
  "vector_database": "pgvector",
  "embedding_model": "bge-small-en",
  "dataset_name": "rag_eval_set_v1",
  "metrics": {
    "retrieval_hit_rate": 0.84,
    "context_precision": 0.79,
    "context_recall": 0.76,
    "mrr": 0.81,
    "citation_coverage": 0.88
  },
  "failed_retrieval_examples": []
}
```

## POST /api/member4/import/member3

Import normalized evaluation output from Member 3.

### Example Request

```json
{
  "run_name": "member3_local_finetuned_ticket_eval",
  "module": "generation",
  "model_name": "member3_qwen_3b_q4_k_m",
  "prompt_version": "current",
  "dataset_name": "member3_qwen_test_clean",
  "metrics": {
    "json_validity_rate": 0.96,
    "faithfulness_rate": 0.88,
    "status_accuracy": 0.84,
    "resolution_accuracy": 0.81
  },
  "failed_generation_examples": []
}
```

Each import endpoint normalizes the input into:

- `evaluation_runs`
- `evaluation_metrics`
- `error_analysis`

---

## GET /api/member4/analytics/overview

Return high-level aggregate counts across runs, metrics, feedback, errors, and fine-tuning examples.

## GET /api/member4/analytics/evaluation

Return summarized metric aggregates.

### Query Parameters

- `module`: optional module filter

### Example Response

```json
{
  "module": "generation",
  "run_count": 2,
  "metric_summary": {
    "json_validity_rate": {
      "count": 2,
      "avg": 0.955,
      "min": 0.95,
      "max": 0.96
    }
  }
}
```

## GET /api/member4/analytics/live-chat

Return live-chat-focused evaluation and feedback summary.

## GET /api/member4/analytics/comparisons

Return run-level comparison rows with attached metrics.

### Query Parameters

- `module`: optional module filter
- `metric_names`: optional repeated query parameter

Example:

```http
GET /api/member4/analytics/comparisons?module=generation&metric_names=json_validity_rate&metric_names=faithfulness_rate
```

---

## POST /api/member4/ab-test-assignments

Store one A/B assignment record.

### Example Request

```json
{
  "module": "live_chat",
  "subject_id": "CHAT-101",
  "experiment_name": "prompt-v1-vs-v2",
  "variant": "candidate_a"
}
```

## GET /api/member4/ab-test-assignments

List A/B assignments.

### Query Parameters

- `experiment_name`: optional filter

---

## Environment Variables

Member 4 depends on these runtime variables:

```text
MEMBER4_STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
MEMBER4_BASE_URL=http://127.0.0.1:8001
```

For local in-memory testing, the service layer can use:

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
- [docker-compose.yml](</c:/Users/Msi GF66/Desktop/Customer Support AI/docker-compose.yml:1>)
- [live_chat/evaluation/member3_offline_report.py](</c:/Users/Msi GF66/Desktop/Customer Support AI/live_chat/evaluation/member3_offline_report.py:1>)
