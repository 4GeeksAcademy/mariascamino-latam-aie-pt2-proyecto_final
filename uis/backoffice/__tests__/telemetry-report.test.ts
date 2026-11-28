import { formatCell, reportPath } from "../lib/telemetry-report";

describe("telemetry report helpers", () => {
  it("leaves the dates out so the API uses its 7-day default", () => {
    expect(reportPath()).toBe("/telemetry/report");
  });

  it("sends both dates as ISO 8601", () => {
    const path = reportPath("2026-11-10T00:00:00Z", "2026-11-12T00:00:00Z");
    expect(path).toBe(
      "/telemetry/report?start_date=2026-11-10T00%3A00%3A00.000Z&end_date=2026-11-12T00%3A00%3A00.000Z",
    );
  });

  it("formats rates as percentages and floats with 2 decimals", () => {
    expect(formatCell("error_rate", 0.25)).toBe("25.0 %");
    expect(formatCell("mean", 1234.5678)).toBe("1234.57");
    expect(formatCell("events", 3)).toBe("3");
    expect(formatCell("section", null)).toBe("—");
  });
});
