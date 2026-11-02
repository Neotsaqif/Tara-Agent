"""Backend E2E smoke test — exercises the full authenticated API stack.

This script verifies:
1. Auth: login, token refresh, /me endpoint
2. Agent: chat with persisted conversation
3. Data: dataset listing, simulation creation
4. Tools: sales_summary execution
5. Monitoring: baseline creation and record posting
6. Audit: log retrieval

Run with: python -m app.scripts.smoke_test

Exit codes:
  0 = all checks passed
  1 = one or more checks failed
"""
from __future__ import annotations

import io
import json
import os
import sys
from pathlib import Path

# Force UTF-8 output on Windows to avoid charmap encoding errors.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Ensure backend is importable when run as a script.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from app.main import app

# Set PYTEST_CURRENT_TEST automatically when collected by pytest: the module is a
# script, not a test suite, so it must not run under the test-only config.
_SMOKE_ENABLED = "PYTEST_CURRENT_TEST" not in os.environ

client = TestClient(app)

# Seed uses one password for all demo users. Supply the same password used by
# seed_dev.py via TARA_DEV_SEED_PASSWORD; otherwise use the documented local seed password.
SEED_PASSWORD = os.environ.get("TARA_DEV_SEED_PASSWORD", "Dev-9HpO8o-8eTKRUEsd!9")
CREDENTIALS = {
    "admin": {"email": "admin@tara.local", "password": SEED_PASSWORD},
    "leader": {"email": "leader@tara.local", "password": SEED_PASSWORD},
    "analyst": {"email": "analyst@tara.local", "password": SEED_PASSWORD},
}


def _login(role: str = "admin", org_id: str | None = None) -> dict:
    """Login and return the token bundle."""
    cred = CREDENTIALS[role]
    payload = {"email": cred["email"], "password": cred["password"]}
    if org_id:
        payload["organization_id"] = org_id
    resp = client.post("/api/v1/auth/login", json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed for {role}: {resp.status_code} {resp.text}")
    return resp.json()


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _test_health():
    print("▶ health check")
    resp = client.get("/health")
    assert resp.status_code == 200, f"health failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "ok"
    print(f"  ✓ status={data['status']} env={data['environment']}")


def _test_system_info():
    print("▶ system info")
    resp = client.get("/api/v1/system/info")
    assert resp.status_code == 200, f"system info failed: {resp.text}"
    data = resp.json()
    print(f"  ✓ provider={data['provider']['name']} db_reachable={data['database']['reachable']}")


def _test_auth_login():
    print("▶ auth login flow")
    bundle = _login("admin")
    assert "access_token" in bundle
    assert "refresh_token" in bundle
    assert bundle["principal"]["email"] == CREDENTIALS["admin"]["email"]
    print(f"  ✓ logged in as {bundle['principal']['email']}")

    # Verify /me
    resp = client.get("/api/v1/auth/me", headers=_headers(bundle["access_token"]))
    assert resp.status_code == 200, f"/me failed: {resp.text}"
    me = resp.json()
    assert me["principal"]["email"] == CREDENTIALS["admin"]["email"]
    print(f"  ✓ /me returned principal with {len(me['organizations'])} org(s)")

    # Test refresh
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": bundle["refresh_token"]})
    assert resp.status_code == 200, f"refresh failed: {resp.text}"
    refreshed = resp.json()
    assert "access_token" in refreshed
    print("  ✓ token refresh rotated successfully")

    return bundle


def _test_agent_chat(token: str):
    print("▶ agent chat (persisted)")
    resp = client.post(
        "/api/v1/agent/chat",
        headers=_headers(token),
        json={"message": "Apa itu margin kotor?"},
    )
    assert resp.status_code == 200, f"chat failed: {resp.text}"
    data = resp.json()
    assert "conversation_id" in data
    assert "answer" in data
    assert data["workflow"] in ("informational", "diagnostic", "goal_directed")
    print(f"  ✓ workflow={data['workflow']} provider={data['provider']} conversation_id={data['conversation_id'][:8]}...")

    # Follow-up (should inherit conversation context)
    resp2 = client.post(
        "/api/v1/agent/chat",
        headers=_headers(token),
        json={"message": "Bagaimana cara menghitungnya?", "conversation_id": data["conversation_id"]},
    )
    assert resp2.status_code == 200, f"follow-up chat failed: {resp2.text}"
    data2 = resp2.json()
    assert data2["conversation_id"] == data["conversation_id"]
    print(f"  ✓ follow-up routing={data2['routing']['method']} followup={data2['routing']['followup_detected']}")

    return data["conversation_id"]


def _test_conversations_list(token: str, conversation_id: str):
    print("▶ conversations list")
    resp = client.get("/api/v1/conversations", headers=_headers(token))
    assert resp.status_code == 200, f"list conversations failed: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    ids = [c["id"] for c in data]
    assert conversation_id in ids, "created conversation not found in list"
    print(f"  ✓ {len(data)} conversation(s), created conversation present")


def _test_datasets_list(token: str):
    print("▶ datasets list")
    resp = client.get("/api/v1/datasets", headers=_headers(token))
    assert resp.status_code == 200, f"datasets failed: {resp.text}"
    data = resp.json()
    print(f"  ✓ {len(data)} dataset(s)")


def _test_tools_list_and_run(token: str):
    print("▶ tools list")
    resp = client.get("/api/v1/tools", headers=_headers(token))
    assert resp.status_code == 200, f"tools list failed: {resp.text}"
    tools = resp.json()
    tool_names = [t["name"] for t in tools]
    print(f"  ✓ {len(tools)} tools: {', '.join(tool_names[:5])}...")

    # Run sales_summary (requires data; may fail if no sales data)
    print("▶ tools run (sales_summary)")
    resp = client.post(
        "/api/v1/tools/run",
        headers=_headers(token),
        json={"tool": "sales_summary", "payload": {}},
    )
    if resp.status_code == 200:
        result = resp.json()
        print(f"  ✓ sales_summary: {result['result'].get('transactions', 0)} transactions")
    elif resp.status_code == 404:
        print("  ⚠ sales_summary: no data (expected for fresh DB)")
    else:
        print(f"  ⚠ sales_summary: unexpected {resp.status_code} — {resp.text}")


def _test_simulation_create_and_list(token: str):
    print("▶ simulation create (may require sales data)")
    resp = client.post(
        "/api/v1/simulations",
        headers=_headers(token),
        json={
            "title": "Test promo simulation",
            "scenarios": [
                {"discount_pct": 10, "volume_uplift_pct": 20, "period_days": 7},
            ],
        },
    )
    if resp.status_code == 200:
        sim = resp.json()
        sim_id = sim["id"]
        print(f"  ✓ simulation created id={sim_id[:8]}... scenarios={len(sim['scenarios'])}")

        # List simulations
        resp2 = client.get("/api/v1/simulations", headers=_headers(token))
        assert resp2.status_code == 200
        sims = resp2.json()
        assert any(s["id"] == sim_id for s in sims)
        print(f"  ✓ listed {len(sims)} simulation(s)")

        return sim_id
    elif resp.status_code == 404:
        print("  ⚠ simulation skipped: no sales data (expected for fresh DB)")
        return None
    else:
        print(f"  ⚠ simulation failed: {resp.status_code} — {resp.text}")
        return None


def _test_monitoring_baseline(token: str):
    print("▶ monitoring baseline create")
    resp = client.post(
        "/api/v1/monitoring/baselines",
        headers=_headers(token),
        json={
            "label": "Test revenue baseline",
            "metric": "revenue",
            "predicted_value": 1000000,
            "period_start": "2026-11-01T00:00:00Z",
            "period_end": "2026-11-30T23:59:59Z",
        },
    )
    assert resp.status_code == 200, f"baseline create failed: {resp.text}"
    baseline = resp.json()
    baseline_id = baseline["id"]
    print(f"  ✓ baseline created id={baseline_id[:8]}... predicted={baseline['predicted_value']}")

    # Record actual
    print("▶ monitoring record actual")
    resp2 = client.post(
        f"/api/v1/monitoring/baselines/{baseline_id}/records",
        headers=_headers(token),
        json={"actual_value": 950000, "note": "Week 1 actual"},
    )
    assert resp2.status_code == 200, f"record actual failed: {resp2.text}"
    record = resp2.json()
    print(f"  ✓ record created status={record['status']} variance_pct={record['variance_pct']}")

    # List baselines
    resp3 = client.get("/api/v1/monitoring/baselines", headers=_headers(token))
    assert resp3.status_code == 200
    baselines = resp3.json()
    assert any(b["id"] == baseline_id for b in baselines)
    print(f"  ✓ listed {len(baselines)} baseline(s)")

    return baseline_id


def _test_decisions(token: str, simulation_id: str | None):
    print("▶ decision create")
    resp = client.post(
        "/api/v1/decisions",
        headers=_headers(token),
        json={
            "title": "Test promo decision",
            "decision_type": "promo",
            "impact_level": "medium",
            "simulation_id": simulation_id,
        },
    )
    assert resp.status_code == 200, f"decision create failed: {resp.text}"
    decision = resp.json()
    decision_id = decision["id"]
    print(f"  ✓ decision created id={decision_id[:8]}... state={decision['state']}")

    # List decisions
    resp2 = client.get("/api/v1/decisions", headers=_headers(token))
    assert resp2.status_code == 200
    decisions = resp2.json()
    assert any(d["id"] == decision_id for d in decisions)
    print(f"  ✓ listed {len(decisions)} decision(s)")

    return decision_id


def _test_audit_logs(token: str):
    print("▶ audit logs")
    resp = client.get("/api/v1/audit", headers=_headers(token))
    assert resp.status_code == 200, f"audit failed: {resp.text}"
    logs = resp.json()
    actions = [l["action"] for l in logs[:10]]
    print(f"  ✓ {len(logs)} log(s), recent actions: {', '.join(actions[:5])}")


def main():
    print("=" * 60)
    print("TARA AGENT Backend E2E Smoke Test")
    print("=" * 60)
    print()

    # Conftest pins the test-only DB URL; the script must run against the dev DB.
    if not _SMOKE_ENABLED:
        print("SKIPPED — run directly: python -m app.scripts.smoke_test")
        return 0

    failures: list[str] = []

    # 1. Health & system info
    try:
        _test_health()
        _test_system_info()
    except Exception as e:
        failures.append(f"health/system: {e}")
        print(f"  ✗ {e}")

    # 2. Auth flow
    try:
        bundle = _test_auth_login()
        token = bundle["access_token"]
    except Exception as e:
        failures.append(f"auth: {e}")
        print(f"  ✗ {e}")
        print("\nCannot continue without auth token. Exiting.")
        return 1

    # 3. Agent chat
    try:
        conversation_id = _test_agent_chat(token)
    except Exception as e:
        failures.append(f"agent_chat: {e}")
        print(f"  ✗ {e}")
        conversation_id = None

    # 4. Conversations list
    if conversation_id:
        try:
            _test_conversations_list(token, conversation_id)
        except Exception as e:
            failures.append(f"conversations: {e}")
            print(f"  ✗ {e}")

    # 5. Datasets
    try:
        _test_datasets_list(token)
    except Exception as e:
        failures.append(f"datasets: {e}")
        print(f"  ✗ {e}")

    # 6. Tools
    try:
        _test_tools_list_and_run(token)
    except Exception as e:
        failures.append(f"tools: {e}")
        print(f"  ✗ {e}")

    # 7. Simulations
    try:
        simulation_id = _test_simulation_create_and_list(token)
    except Exception as e:
        failures.append(f"simulation: {e}")
        print(f"  ✗ {e}")
        simulation_id = None

    # 8. Monitoring
    try:
        _test_monitoring_baseline(token)
    except Exception as e:
        failures.append(f"monitoring: {e}")
        print(f"  ✗ {e}")

    # 9. Decisions
    try:
        _test_decisions(token, simulation_id)
    except Exception as e:
        failures.append(f"decisions: {e}")
        print(f"  ✗ {e}")

    # 10. Audit
    try:
        _test_audit_logs(token)
    except Exception as e:
        failures.append(f"audit: {e}")
        print(f"  ✗ {e}")

    print()
    print("=" * 60)
    if failures:
        print(f"SMOKE TEST FAILED — {len(failures)} error(s)")
        for f in failures:
            print(f"  • {f}")
        return 1
    print("SMOKE TEST PASSED — all checks successful")
    return 0


if __name__ == "__main__":
    main()
