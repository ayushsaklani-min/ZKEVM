#!/usr/bin/env python3
import sys
import json
import hashlib
import time

# Deterministic AI proxy
# Input (stdin JSON): { "eventId": str, "description": str, "timestamp": int, "chainId": int }
# Output: { probability:int(10..89), explanation:str, aiHash:str }


def keccak256(data: bytes) -> str:
    try:
        import sha3  # type: ignore
        k = sha3.keccak_256()
    except Exception:
        # Python 3.11+ includes _pysha3 as sha3
        k = hashlib.sha3_256()
    k.update(data)
    return '0x' + k.hexdigest()


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "Provide JSON on stdin"}))
        return
    payload = json.loads(sys.stdin.read())
    event_id = str(payload.get("eventId", ""))
    description = str(payload.get("description", ""))
    ts = int(payload.get("timestamp", int(time.time())))
    chain_id = int(payload.get("chainId", 0))

    # Seed per spec
    seed_input = (event_id + str(chain_id) + str(ts)).encode()
    seed_hex = hashlib.sha256(seed_input).hexdigest()
    # probability = (int(seed[:8]) % 80) + 10 => 10..89
    prob = (int(seed_hex[:8], 16) % 80) + 10

    # explanation: 3 signals deterministic
    word_count = len(description.split())
    keywords = ["ETH", "Bitcoin", "inflation", "Fed", "ETF", "AI", "sports"]
    keyword_weight = sum(1 for k in keywords if k.lower() in (event_id + ' ' + description).lower())
    length_signal = min(100, len(description))
    explanation = (
        f"Signals: words={word_count}, keywordWeight={keyword_weight}, lengthSignal={length_signal}. "
        f"Deterministic seed={seed_hex[:12]}"
    )
    if len(explanation) > 280:
        explanation = explanation[:280]

    # commitment: keccak256(probability || explanation || salt)
    salt = 'oraclex'
    ai_hash = keccak256((str(prob) + explanation + salt).encode())

    print(json.dumps({
        "probability": prob,
        "explanation": explanation,
        "aiHash": ai_hash
    }))


if __name__ == '__main__':
    main()
