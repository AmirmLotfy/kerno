from dataclasses import dataclass

@dataclass(frozen=True)
class RetryPolicy:
    attempts: int
    delay_seconds: int

def policy_for(queue_name: str) -> RetryPolicy:
    if queue_name.startswith("critical"):
        return RetryPolicy(5, 1)
    return RetryPolicy(3, 5)
