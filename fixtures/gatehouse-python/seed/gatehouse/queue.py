"""Observable queue boundary used by acceptance tests."""

from __future__ import annotations

from dataclasses import dataclass

from .models import Message


@dataclass(frozen=True)
class QueueEvent:
    message_id: str
    action: str
    retry_after_seconds: int | None = None


class InMemoryQueue:
    def __init__(self) -> None:
        self.events: list[QueueEvent] = []
        self._terminal: set[str] = set()

    def ack(self, message: Message) -> None:
        if message.id in self._terminal:
            raise RuntimeError(f"message {message.id} already completed")
        self._terminal.add(message.id)
        self.events.append(QueueEvent(message.id, "ack"))

    def drop(self, message: Message) -> None:
        if message.id in self._terminal:
            raise RuntimeError(f"message {message.id} already completed")
        self._terminal.add(message.id)
        self.events.append(QueueEvent(message.id, "drop"))

    def retry(self, message: Message, after_seconds: int) -> None:
        if message.id in self._terminal:
            raise RuntimeError(f"message {message.id} already completed")
        self.events.append(QueueEvent(message.id, "retry", after_seconds))
