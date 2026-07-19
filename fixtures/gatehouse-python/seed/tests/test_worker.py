from gatehouse.worker import Worker

def test_ack_contract_is_preserved():
    assert Worker().handle("critical-payments", {"id": "m1"}) == "ack:5:m1"
