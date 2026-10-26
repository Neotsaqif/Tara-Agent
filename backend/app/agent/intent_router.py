import re
from .schemas import WorkflowRoute


class IntentRouter:
    def route(self, message: str, requested: WorkflowRoute) -> WorkflowRoute:
        if requested != WorkflowRoute.AUTO:
            return requested
        text = message.lower()
        if re.search(r"\b(mengapa|kenapa|penyebab|turun|naik|masalah|diagnos)", text):
            return WorkflowRoute.DIAGNOSTIC
        if re.search(r"\b(target|strategi|rencana|tingkatkan|optimalkan|ingin|tujuan)", text):
            return WorkflowRoute.GOAL_DIRECTED
        return WorkflowRoute.INFORMATIONAL
