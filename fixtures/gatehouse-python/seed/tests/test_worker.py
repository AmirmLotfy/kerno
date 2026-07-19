import unittest

from gatehouse.models import Message, ProcessingResult
from gatehouse.queue import InMemoryQueue
from gatehouse.retry import RetryPolicy
from gatehouse.worker import Worker


class WorkerTests(unittest.TestCase):
    def test_success_acknowledges_once(self) -> None:
        queue = InMemoryQueue()
        worker = Worker(queue, lambda _message: ProcessingResult.ACK, RetryPolicy(2, 30))
        worker.process(Message("message-1", "transient"))
        self.assertEqual([(event.action, event.retry_after_seconds) for event in queue.events], [("ack", None)])

    def test_message_kind_selects_retry_policy_without_acknowledging(self) -> None:
        queue = InMemoryQueue()
        policies = {
            "transient": RetryPolicy(1, 8),
            "throttled": RetryPolicy(10, 60),
        }
        worker = Worker(queue, lambda _message: ProcessingResult.RETRY, policies=policies)
        worker.process(Message("fast-1", "transient", attempts=2))
        worker.process(Message("durable-1", "throttled", attempts=2))
        self.assertEqual(
            [(event.message_id, event.action, event.retry_after_seconds) for event in queue.events],
            [("fast-1", "retry", 4), ("durable-1", "retry", 40)],
        )


if __name__ == "__main__":
    unittest.main()
