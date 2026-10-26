# TARA AGENT Core v1

## API

`POST /api/v1/agent/chat`

```json
{"session_id":"session-demo-001","message":"Mengapa omzet outlet A turun?","workflow":"auto"}
```

`workflow` accepts `auto`, `informational`, `diagnostic`, and `goal_directed`. The response contains `session_id`, selected `workflow`, `status`, `answer`, `evidence`, `assumptions`, `limitations`, `needs_approval`, `available_actions`, and safe `provider` metadata. Empty or overlong messages return `422`; provider failures return `503`.

`GET /api/v1/agent/status` exposes only provider and model metadata; no key is returned.

## Architecture

`AgentCore` routes the request, reads isolated in-memory session context, builds a workflow prompt, calls the provider, validates `ModelAnswer` with Pydantic, and returns the stable API schema. `MockProvider` is deterministic and requires no key. `GeminiProvider` uses the official `google-genai` SDK (`from google import genai`) with JSON/Pydantic output validation.

```text
HTTP request -> Pydantic schema -> IntentRouter -> ContextManager -> Provider -> ModelAnswer validation -> API response
```

The context manager is process-local and bounded to 12 messages per session. It is lost on restart and is not suitable for multi-worker production until backed by a repository.

## Configuration

```powershell
$env:LLM_PROVIDER="mock"
$env:LLM_MODEL="gemini-3.5-flash-lite"
$env:LLM_TIMEOUT_SECONDS="30"
$env:LLM_MAX_RETRIES="2"
# Only for local server-side Gemini use:
$env:LLM_API_KEY="..."
```

`LLM_PROVIDER=mock` is the test/default-safe mode. Gemini model availability, cost, limits, and quality must be verified against the account. API keys are never sent to the frontend or returned by the API. Core v1 does not enable search, Maps, code execution, arbitrary SQL, filesystem access, POS, GEOAI, or external actions.

Without connected business data, the agent returns limitations and does not invent revenue, margin, trends, evidence, or actuals. Goal-directed responses remain conceptual until a simulation/data engine exists.
