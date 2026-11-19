# cache.py — small in-process TTL cache for read-heavy, shared endpoints.
#
# Why in-process and not Redis (yet): the API runs as ONE uvicorn process
# (services/Dockerfile: `uvicorn main:app`, no --workers), so a dictionary in memory is the cheapest
# correct option: no extra service, no network hop, no serialization. If the
# API is ever scaled to several workers/containers, each one would keep its
# own copy and an invalidation in one would not reach the others — that is
# the moment to move this same interface to Redis (see CACHING_REPORT.md).
#
# Rules this module enforces:
#   * Every entry has a TTL. Nothing lives forever.
#   * Keys are namespaced ("inventory:products", "incidents:summary") so a
#     write can invalidate a whole namespace at once.
#   * Only data that is the SAME for every caller may be stored under a shared
#     key. Per-user data must put the user id in the key (never done today).
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Hashable


@dataclass
class _Entry:
    value: Any
    expires_at: float


class TTLCache:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._data: dict[tuple, _Entry] = {}
        # Bumped on every invalidate(). Protects against this race: request A
        # misses and starts a slow query, request B writes and invalidates,
        # A finishes and would store the OLD result for a full TTL. A only
        # stores if the generation didn't change while it was computing.
        self._generation: dict[str, int] = {}
        # FastAPI runs sync endpoints in a thread pool, so two requests can
        # touch the dict at the same time: a lock keeps reads/writes atomic.
        self._lock = threading.Lock()
        self._clock = clock
        self.hits = 0
        self.misses = 0

    def get(self, namespace: str, *key: Hashable) -> tuple[bool, Any]:
        """Return (found, value). An expired entry counts as a miss and is dropped."""
        with self._lock:
            entry = self._data.get((namespace, *key))
            if entry is not None and entry.expires_at > self._clock():
                self.hits += 1
                return True, entry.value
            if entry is not None:
                del self._data[(namespace, *key)]
            self.misses += 1
            return False, None

    def set(self, namespace: str, *key: Hashable, value: Any, ttl: float) -> None:
        if ttl <= 0:
            raise ValueError("Every cached value needs a positive TTL.")
        with self._lock:
            self._data[(namespace, *key)] = _Entry(value, self._clock() + ttl)

    def get_or_set(self, namespace: str, *key: Hashable, ttl: float, compute: Callable[[], Any]) -> tuple[Any, bool]:
        """Return (value, hit). On a miss, compute() runs OUTSIDE the lock so a
        slow query never blocks requests for other keys."""
        found, value = self.get(namespace, *key)
        if found:
            return value, True
        with self._lock:
            generation = self._generation.get(namespace, 0)
        value = compute()
        if ttl <= 0:
            raise ValueError("Every cached value needs a positive TTL.")
        with self._lock:
            if self._generation.get(namespace, 0) == generation:
                self._data[(namespace, *key)] = _Entry(value, self._clock() + ttl)
        return value, False

    def invalidate(self, namespace: str) -> int:
        """Drop every entry of a namespace. Called by the write endpoints."""
        with self._lock:
            self._generation[namespace] = self._generation.get(namespace, 0) + 1
            doomed = [k for k in self._data if k[0] == namespace]
            for k in doomed:
                del self._data[k]
            return len(doomed)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()
            self._generation.clear()
            self.hits = self.misses = 0


# One shared instance for the whole API process.
cache = TTLCache()

# Namespaces and TTLs live here so the report and the code can't drift apart.
INCIDENT_SUMMARY = "incidents:summary"
INCIDENT_SUMMARY_TTL = 60  # seconds

INVENTORY_PRODUCTS = "inventory:products"
INVENTORY_PRODUCTS_TTL = 30  # seconds
