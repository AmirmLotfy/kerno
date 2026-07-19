"""Worker orchestration before the benchmark refactor."""

from collections.abc import Callable

from .models import Message, ProcessingResult
from .queue import InMemoryQueue
from .retry import RetryPolicy

Handler = Callable[[Message], ProcessingResult]


class Worker:
    def __init__(self, queue: InMemoryQueue, handler: Handler, retry_policy: RetryPolicy) -> None:
        self._queue = queue
        self._handler = handler
        self._retry_policy = retry_policy

    def process(self, message: Message) -> None:
        result = self._handler(message)
        if result is ProcessingResult.ACK:
            self._queue.ack(message)
        elif result is ProcessingResult.DROP:
            self._queue.drop(message)
        else:
            self._queue.retry(message, self._retry_policy.delay_for(message.attempts))
