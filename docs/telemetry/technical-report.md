# Telemetry — Technical Report

`GET /telemetry/report` turns the raw rows of `telemetry_events` into operational metrics.
The metrics live in `services/telemetry/analysis.py`. The endpoint lives in `services/api/routers/telemetry_report.py`, and the dashboard is the backoffice page `/telemetry`.

## Endpoint

```
GET /telemetry/report?start_date=2026-11-16T00:00:00Z&end_date=2026-11-23T00:00:00Z
Authorization: Bearer <token>
```

| Parameter | Format | Default |
|---|---|---|
| `start_date` | ISO 8601, inclusive | `end_date − 7 days` |
| `end_date` | ISO 8601, exclusive | now (UTC) |

- Dates without an offset are read as UTC. Dates with an offset are converted to UTC.
- The window is resolved **once** and the same `[start, end)` is passed to every metric.
- Any of these returns `422`: `start_date ≥ end_date`, a window longer than 90 days, or an invalid date.
- The endpoint requires login, because operational data is not public.
- **Cache:** the whole response is kept in memory for 60 s (`cache.py`, namespace `telemetry:report`). The key is the resolved window. The default window has its own key, so repeated default calls share one result. The `X-Cache` header returns `HIT` or `MISS`.

Response:

```json
{
  "period": {"from": "2026-11-16T00:00:00Z", "to": "2026-11-23T00:00:00Z"},
  "metrics": {
    "events_per_day": [...],
    "error_share_per_day": [...],
    "error_rate_by_type": [...],
    "web_vitals_by_section": [...],
    "auth_failure_rate": [...]
  }
}
```

## Pipeline (same for every metric)

1. **Load (SQL):** `event_type = …` or `event_type IN (…)`, plus `timestamp >= start AND timestamp < end`. Only the needed columns are selected, and the whole table is never loaded.
2. **Refine (Pandas):** the needed fields are pulled out of `tags` (`pd.json_normalize`), and rows with a missing grouping dimension are dropped.
3. **Time:** `pd.to_datetime(..., utc=True)`, then the UTC calendar day.
4. **Group:** `groupby` with `count` / `sum` / `mean` / `max`. There are no loops.
5. **Return:** `.reset_index().to_dict(orient="records")`.

The functions only run `SELECT`. They have no side effects and are independent of each other.

## Metrics

| Metric | Kind | Events (SQL filter) | Question it answers |
|---|---|---|---|
| `events_per_day` | Volume | `IN` technical events | How many technical events does each service send per day, and of which type? |
| `error_share_per_day` | Error rate | `IN` technical events | Out of all technical events of the day, what fraction were `level = error`? |
| `error_rate_by_type` | Error rate | `IN (frontend_error_occurred, api_error_occurred)` | Which errors happen (`error_name` / `error_class`), where (section / route), and how many times (`occurrence_count` summed)? |
| `web_vitals_by_section` | Latency | `= page_load_recorded` | How fast do pages load for real users? LCP/INP/TTFB/CLS per day and section: samples, mean, max, share rated "good". |
| `auth_failure_rate` | Availability (login) | `IN (login_failed, login_succeeded)` | Of all login attempts, what fraction failed? |

The technical events are `page_load_recorded`, `api_latency_recorded`, `slow_query_detected`, `frontend_error_occurred`, `api_error_occurred`, `session_expired`, `permission_denied` and `telemetry_event_rejected`.

> `auth_failure_rate` and the API-side events (`api_error_occurred`, `api_latency_recorded`) depend on emitters that the API does not have yet. Until those emitters exist, these metrics return `[]` for real data.
