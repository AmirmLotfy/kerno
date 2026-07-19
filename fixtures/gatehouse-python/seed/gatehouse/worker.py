from .retry import policy_for

class Worker:
    def handle(self, queue_name: str, message: dict) -> str:
        policy = policy_for(queue_name)
        return f"ack:{policy.attempts}:{message['id']}"
