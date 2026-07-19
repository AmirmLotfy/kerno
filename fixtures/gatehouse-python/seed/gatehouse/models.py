"""Public message and handler result contracts."""

from dataclasses import dataclass
from enum import Enum


@dataclass(frozen=True)
class Message:
    id: str
    kind: str
    attempts: int = 0


class ProcessingResult(Enum):
    ACK = "ack"
    RETRY = "retry"
    DROP = "drop"
