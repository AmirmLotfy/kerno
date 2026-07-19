"""Retry-delay policy."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RetryPolicy:
    base_seconds: int
    maximum_seconds: int

    def delay_for(self, attempts: int) -> int:
        return min(self.maximum_seconds, self.base_seconds * (2 ** max(0, attempts)))
