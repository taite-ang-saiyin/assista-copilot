# Ticket Intelligence API Report

## 1. Overview

This project exposes a FastAPI service that analyzes support-ticket text and returns:

- predicted support `category`
- predicted `priority`
- inferred `sentiment`
- extracted structured `entities`
- an overall confidence score with a confidence breakdown

The API entrypoint is [`api.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/api.py). The service combines three components:

- a local DeBERTa-based multi-task classifier for `category` and `priority`
- a sentiment analyzer with keyword rules and an optional Hugging Face pipeline fallback
- a regex-based entity extractor

## 2. Tech Stack

- Python 3.11 in Docker
- FastAPI 0.104.1
- Pydantic 2.5.0
- Uvicorn 0.24.0
- PyTorch 2.1.0
- Transformers 4.52.4

Primary dependency definitions are in [`requirements.txt`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/requirements.txt) and the container build is in [`Dockerfile`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/Dockerfile).

## 3. Runtime Architecture

### Request flow

1. Client sends a request to `POST /tickets/analyze`.
2. FastAPI validates the request body with `TicketRequest`.
3. `get_predictor()` lazily loads a singleton multi-task model from `models/ticket_multitask_model`.
4. `get_sentiment_analyzer()` lazily loads a singleton sentiment analyzer.
5. `get_entity_extractor()` lazily loads a singleton regex extractor.
6. The API combines the three outputs into a single response payload.

### Core modules

- [`api.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/api.py): FastAPI routes, schemas, confidence aggregation
- [`multi_task_inference.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/multi_task_inference.py): category and priority model loading/inference
- [`sentiment_model.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/sentiment_model.py): sentiment logic
- [`entity_extractor.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/entity_extractor.py): regex entity extraction

## 4. Model and Inference Details

### 4.1 Category and priority model

The classifier is a custom multi-head model built on `DebertaV2Model`.

- base model recorded in config: `microsoft/deberta-v3-base`
- max input length: `128`
- category classes: `11`
- priority classes: `4`

The model artifacts live under [`models/ticket_multitask_model`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/models/ticket_multitask_model).

### 4.2 Supported categories

From [`label_mappings.json`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/models/ticket_multitask_model/label_mappings.json):

- `Account`
- `Billing`
- `General`
- `Hardware`
- `Network`
- `Outage`
- `Product`
- `Refund`
- `Security`
- `Subscription`
- `Technical`

### 4.3 Supported priorities

- `High`
- `Low`
- `Medium`
- `Urgent`

### 4.4 Sentiment logic

The sentiment layer works in this order:

1. keyword-based support-domain rules
2. urgent-marker heuristic
3. Hugging Face `sentiment-analysis` pipeline using `distilbert-base-uncased-finetuned-sst-2-english`
4. fallback to `Neutral` with `0.6` confidence

Returned sentiments:

- `Angry`
- `Frustrated`
- `Confused`
- `Neutral`
- `Positive`

### 4.5 Entity extraction

The entity extractor uses regex patterns to find:

- `order_id`
- `transaction_id`
- `amount`
- `product`
- `error_code`
- `account_email`
- `customer_id`
- `time`
- `requested_action`
- `plan`

It also returns derived flags such as:

- `has_order_info`
- `has_error_info`
- `has_amount_info`
- `has_customer_info`
- `priority_entities_found`

## 5. Confidence Calculation

### Entity confidence

Entity confidence is not model-based. It is heuristically derived:

- if `entity_count == 0`, confidence is `0.5`
- otherwise, base confidence is `0.65 + 0.07 * min(entity_count, 5)`
- if `priority_entities_found` is true, add `0.1`
- final value is capped at `1.0`

### Overall confidence

Overall confidence is a weighted average:

- `category`: 40%
- `priority`: 30%
- `sentiment`: 20%
- `entity`: 10%

Formula:

```text
overall_confidence =
  category_confidence * 0.4 +
  priority_confidence * 0.3 +
  sentiment_confidence * 0.2 +
  entity_confidence * 0.1
```

## 6. API Endpoints

### 6.1 `GET /`

Returns service metadata and a small endpoint index.

Example response:

```json
{
  "service": "Ticket Intelligence API",
  "version": "1.0.0",
  "description": "Support ticket category, priority, sentiment, and entity extraction system",
  "status": "operational",
  "endpoints": {
    "POST /tickets/analyze": "Analyze a support ticket",
    "GET /health": "Health check",
    "GET /taxonomy": "Get model label taxonomy",
    "GET /docs": "Interactive API documentation"
  }
}
```

### 6.2 `GET /health`

Purpose:

- verifies that the predictor can be loaded
- reports how many categories are available

Response fields:

- `status`: `healthy` or `unhealthy`
- `model_loaded`: boolean
- `categories_count`: integer
- `timestamp`: ISO datetime string

Notes:

- this endpoint checks only the multi-task predictor load path
- it does not verify the sentiment pipeline or entity extractor

### 6.3 `GET /taxonomy`

Returns the model and API label space.

Response fields:

- `categories`
- `priorities`
- `sentiments`
- `entities`

This endpoint is useful for frontends that need to present valid labels without hardcoding them.

### 6.4 `POST /tickets/analyze`

Primary business endpoint.

#### Request schema

```json
{
  "message": "I can't access my account after resetting my password.",
  "ticket_id": "001"
}
```

Field rules:

- `message`: required string, min length `1`, max length `5000`
- `ticket_id`: optional string, max length `50`

#### Success response shape

```json
{
  "status": "success",
  "message": "I can't access my account after resetting my password.",
  "predictions": {
    "category": "Account",
    "priority": "High",
    "sentiment": "Frustrated",
    "confidence": 0.873,
    "confidence_breakdown": {
      "category": 0.92,
      "priority": 0.88,
      "sentiment": 0.95,
      "entity": 0.5
    }
  },
  "entities": {
    "extracted_entities": {},
    "entity_count": 0,
    "has_order_info": false,
    "has_error_info": false,
    "has_amount_info": false,
    "has_customer_info": false,
    "priority_entities_found": false
  },
  "ticket_id": "001",
  "timestamp": "2026-06-14T22:59:00.000000"
}
```

#### Error behavior

- `400`: empty or whitespace-only `message`
- `422`: schema validation failure, for example missing `message` or overlong fields
- `500`: unhandled prediction error in route logic

## 7. Validation and Schema Notes

### Request models

- `TicketRequest`

### Response models

- `ConfidenceBreakdownResponse`
- `PredictionsResponse`
- `EntitiesResponse`
- `AnalyzeResponse`
- `HealthResponse`
- `TaxonomyResponse`

The API uses Pydantic response models, so documented shapes in code align closely with serialized responses.

## 8. Operational Behavior

### Lazy singletons

The predictor, entity extractor, and sentiment analyzer are each cached in module-level globals. That reduces per-request setup cost after first use.

### Startup characteristics

The first request to `/tickets/analyze` or `/health` can be noticeably slower because model loading is deferred until first access.

### Hardware usage

The classifier chooses `cuda` if available, otherwise CPU. This logic is inside [`multi_task_inference.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/multi_task_inference.py).

### Offline model loading

The DeBERTa config is reconstructed locally from checkpoint weights so inference can work without downloading the original base model config.

## 9. Security and Access Notes

The API enables CORS with:

- `allow_origins=["*"]`
- `allow_methods=["*"]`
- `allow_headers=["*"]`
- `allow_credentials=True`

This is permissive and suitable for development, but it is too open for a production deployment unless front-end origins are intentionally unrestricted.

There is no authentication, authorization, rate limiting, or request logging in the current implementation.

## 10. Testing and Evaluation Assets

### Test client

[`test_api.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/test_api.py) performs simple integration checks against a running local server:

- `GET /health`
- `GET /taxonomy`
- `POST /tickets/analyze`

It validates that:

- categories are in the expected label set
- priorities are in the expected label set
- sentiments are in the expected label set
- overall confidence is between `0` and `1`
- confidence breakdown has the expected keys
- no `intent` field is present

### Evaluation script

[`evaluation_report.py`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/evaluation_report.py) runs a small fixed dataset through the live API and writes metrics to `evaluation_report.json`.

Current state of [`evaluation_report.json`](/c:/Users/Msi%20GF66/Desktop/ticket/customer-support-copilot/evaluation_report.json):

- metric fields are `null`
- the file is a placeholder until the evaluation script is executed while the API is running

## 11. Deployment

### Local run

Typical command:

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

### Docker

The Docker image:

1. starts from `python:3.11-slim`
2. installs build tooling
3. installs Python dependencies
4. copies the trained model directory
5. copies the application code
6. launches `uvicorn`

Exposed port:

- `8000`

## 12. Known Implementation Risks and Gaps

### 12.1 Health endpoint is partial

`GET /health` only confirms that the predictor can be loaded. It does not verify:

- sentiment pipeline availability
- entity extractor readiness
- end-to-end inference behavior

### 12.2 Silent fallback on classifier failure

If the multi-task predictor throws during inference, the predictor returns:

- category: `General`
- priority: `Medium`
- confidences: `0.5`

That means some model failures are masked instead of surfaced as errors, which can make degraded predictions appear valid.

### 12.3 No timezone in timestamps

Responses use `datetime.now().isoformat()`, which produces naive local timestamps without timezone offset.

### 12.4 No authentication

Any client that can reach the service can call all endpoints.

### 12.5 Wide-open CORS policy

The current policy is acceptable for early development but should be restricted for production use.

### 12.6 Response echoes original message

The `message` field in the success response simply repeats the input message. That may be acceptable, but it is redundant if the client already has the source text and may increase payload size or exposure of sensitive ticket content.

## 13. Recommended Next Improvements

- add authentication for non-internal deployments
- tighten CORS to known frontend origins
- make `/health` perform a deeper readiness check
- surface classifier failures explicitly instead of silently defaulting
- add structured logging and request correlation IDs
- add unit tests for confidence calculations and entity extraction rules
- add OpenAPI examples for each endpoint
- include timezone-aware timestamps
- define production resource expectations for CPU, memory, and model load time

## 14. Bottom Line

This API is a compact support-ticket intelligence service with one main inference endpoint and two utility endpoints. Its implementation is straightforward and readable, with a clear separation between classification, sentiment analysis, and entity extraction. The main production gaps are operational hardening rather than missing core features: authentication, observability, stricter health checks, and clearer failure handling.
