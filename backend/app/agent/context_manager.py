from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock


@dataclass(frozen=True)
class Message:
    role: str
    content: str


class InMemoryContextManager:
    """Session-isolated context; contents disappear when the process restarts."""

    def __init__(self, max_messages: int = 12) -> None:
        self._messages: defaultdict[str, deque[Message]] = defaultdict(lambda: deque(maxlen=max_messages))
        self._lock = Lock()

    def get(self, session_id: str) -> list[Message]:
        with self._lock:
            return list(self._messages[session_id])

    def append(self, session_id: str, role: str, content: str) -> None:
        with self._lock:
            self._messages[session_id].append(Message(role=role, content=content))
