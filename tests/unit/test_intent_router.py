"""Intent router regression: explicit, contextual, deterministic, fallback."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2] / "backend"))

from app.agent.intent_router import IntentRouter, PreviousTurn  # noqa: E402
from app.agent.schemas import WorkflowRoute  # noqa: E402


def test_explicit_workflow_always_wins():
    router = IntentRouter()
    decision = router.route_decision("apa itu margin", WorkflowRoute.GOAL_DIRECTED)
    assert decision.workflow == WorkflowRoute.GOAL_DIRECTED
    assert decision.meta.method == "explicit"


def test_diagnostic_signal_routing():
    router = IntentRouter()
    decision = router.route_decision("Mengapa omzet outlet Purwokerto turun?", WorkflowRoute.AUTO)
    assert decision.workflow == WorkflowRoute.DIAGNOSTIC
    assert decision.meta.method == "deterministic"
    assert decision.meta.matched_signals


def test_goal_directed_signal_routing():
    router = IntentRouter()
    decision = router.route_decision("Bagaimana cara menaikkan omzet 15%?", WorkflowRoute.AUTO)
    assert decision.workflow == WorkflowRoute.GOAL_DIRECTED


def test_informational_signal_routing():
    router = IntentRouter()
    decision = router.route_decision("Apa itu gross margin?", WorkflowRoute.AUTO)
    assert decision.workflow == WorkflowRoute.INFORMATIONAL


def test_fallback_to_informational():
    router = IntentRouter()
    decision = router.route_decision("halo", WorkflowRoute.AUTO)
    assert decision.workflow == WorkflowRoute.INFORMATIONAL
    assert decision.meta.method == "deterministic"


def test_contextual_followup_inherits_previous_workflow():
    router = IntentRouter()
    previous = PreviousTurn(last_user_message="analisis outlet A", last_workflow=WorkflowRoute.DIAGNOSTIC, message_count=2)
    decision = router.route_decision("Bagaimana kalau dibandingkan bulan lalu?", WorkflowRoute.AUTO, previous=previous)
    assert decision.workflow == WorkflowRoute.DIAGNOSTIC
    assert decision.meta.method == "contextual"
    assert decision.meta.followup_detected is True
    assert decision.meta.previous_workflow == "diagnostic"


def test_contextual_followup_can_upgrade_with_strong_signal():
    router = IntentRouter()
    previous = PreviousTurn(last_user_message="apa itu margin", last_workflow=WorkflowRoute.INFORMATIONAL, message_count=2)
    decision = router.route_decision("bagaimana kalau mengapa omzet turun dan bagaimana cara mendiagnosa?", WorkflowRoute.AUTO, previous=previous)
    assert decision.meta.method == "contextual"
    assert decision.workflow == WorkflowRoute.DIAGNOSTIC


def test_short_anaphora_is_followup():
    router = IntentRouter()
    previous = PreviousTurn(last_user_message="analisis produk A", last_workflow=WorkflowRoute.DIAGNOSTIC, message_count=4)
    decision = router.route_decision("yang itu saja", WorkflowRoute.AUTO, previous=previous)
    assert decision.meta.followup_detected is True


def test_routing_meta_records_reason_for_audit():
    router = IntentRouter()
    decision = router.route_decision("kenapa turun", WorkflowRoute.AUTO)
    assert decision.meta.reason


def test_compatibility_route_returns_workflow_only():
    router = IntentRouter()
    workflow = router.route("kenapa turun", WorkflowRoute.AUTO)
    assert workflow == WorkflowRoute.DIAGNOSTIC
