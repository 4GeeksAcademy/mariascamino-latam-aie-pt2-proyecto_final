# bench_latency.py — repeatable latency measurement for CACHING_REPORT.md.
#
# Calls every read endpoint N times (same URL, same params, like a busy
# dashboard would) and reports the server-side time measured by the timing
# middleware (X-Response-Time-ms header). It runs in-process with TestClient,
# so network noise is excluded and runs are comparable before/after a change.
#
#   uv run python bench_latency.py            # 30 calls per endpoint
#   uv run python bench_latency.py -n 100
#
# It uses (or creates) the user bench@healthcore.example in the configured DB.
import argparse
import statistics

from fastapi.testclient import TestClient

import main
from database import find_user_by_email

BENCH_EMAIL = "bench@healthcore.example"
BENCH_PASSWORD = "BenchPass123!"

ENDPOINTS = [
    ("GET", "/api/incidents/summary"),
    ("GET", "/api/incidents"),
    ("GET", "/api/incidents?status=open"),
    ("GET", "/suppliers"),
    ("GET", "/suppliers?country=UK"),
    ("GET", "/inventory/products"),
    ("GET", "/inventory/orders"),
    ("GET", "/auth/me"),
]


def _token(client: TestClient) -> str:
    if find_user_by_email(BENCH_EMAIL) is None:
        client.post("/users", json={"email": BENCH_EMAIL, "password": BENCH_PASSWORD, "name": "Bench"})
    res = client.post("/auth/login", data={"username": BENCH_EMAIL, "password": BENCH_PASSWORD})
    res.raise_for_status()
    return res.json()["access_token"]


def main_() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("-n", type=int, default=30, help="calls per endpoint")
    args = parser.parse_args()

    with TestClient(main.app) as client:
        headers = {"Authorization": f"Bearer {_token(client)}"}
        print(f"{'endpoint':38} {'rows':>6} {'1st ms':>8} {'p50 ms':>8} {'p95 ms':>8} {'KB':>7}  cache")
        for method, url in ENDPOINTS:
            times, cache = [], []
            for _ in range(args.n):
                res = client.request(method, url, headers=headers)
                res.raise_for_status()
                times.append(float(res.headers["X-Response-Time-ms"]))
                cache.append(res.headers.get("X-Cache", "-"))
            body = res.json()
            rows = len(body) if isinstance(body, list) else 1
            p95 = sorted(times)[int(len(times) * 0.95) - 1]
            hits = cache.count("HIT")
            print(
                f"{method + ' ' + url:38} {rows:>6} {times[0]:>8.1f} {statistics.median(times):>8.1f} "
                f"{p95:>8.1f} {len(res.content) / 1024:>7.1f}  {hits}/{args.n} HIT"
            )


if __name__ == "__main__":
    main_()
