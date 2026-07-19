"""Retry-delay policies and task-conditioned selection."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RetryPolicy:
    base_seconds: int
    maximum_seconds: int

    def delay_for(self, attempts: int) -> int:
        return min(self.maximum_seconds, self.base_seconds * (2 ** max(0, attempts)))


def select_policy(kind: str, policies: dict[str, RetryPolicy]) -> RetryPolicy:
    try:
        return policies[kind]
    except KeyError as error:
        raise ValueError(f"no retry policy for message kind {kind}") from error
