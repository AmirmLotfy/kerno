"""Worker orchestration with per-message retry-policy selection."""

from __future__ import annotations

from collections.abc import Callable

from .models import Message, ProcessingResult
from .queue import InMemoryQueue
from .retry import RetryPolicy, select_policy

Handler = Callable[[Message], ProcessingResult]


class Worker:
    def __init__(
        self,
        queue: InMemoryQueue,
        handler: Handler,
        retry_policy: RetryPolicy | None = None,
        *,
        policies: dict[str, RetryPolicy] | None = None,
    ) -> None:
        if retry_policy is None and not policies:
            raise ValueError("a default retry policy or policy map is required")
        self._queue = queue
        self._handler = handler
        self._retry_policy = retry_policy
        self._policies = dict(policies or {})

    def process(self, message: Message) -> None:
        result = self._handler(message)
        if result is ProcessingResult.ACK:
            self._queue.ack(message)
        elif result is ProcessingResult.DROP:
            self._queue.drop(message)
        else:
            policy = select_policy(message.kind, self._policies) if self._policies else self._retry_policy
            assert policy is not None
            self._queue.retry(message, policy.delay_for(message.attempts))
