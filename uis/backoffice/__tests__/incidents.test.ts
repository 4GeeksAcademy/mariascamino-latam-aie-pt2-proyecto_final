/**
 * lib/incidents.ts — option helpers, lifecycle rules and API error mapping
 * for the incident screens (labels are in English by design).
 */
import { installFakeWindow, removeFakeWindow } from "./support/fakeWindow";
import {
  BRANCHES,
  CATEGORIES,
  IncidentApiError,
  STATUSES,
  STATUS_TRANSITIONS,
  createIncident,
  getIncidentSummary,
  labelOf,
  listIncidents,
  updateIncidentStatus,
} from "../lib/incidents";

function respond(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  installFakeWindow();
});

afterEach(() => {
  removeFakeWindow();
  jest.restoreAllMocks();
});

describe("labelOf", () => {
  test("turns a stored value into its label", () => {
    expect(labelOf(STATUSES, "in_progress")).toBe("In progress");
    expect(labelOf(BRANCHES, "central")).toBe("Central — Austin Main Clinic");
  });

  test("falls back to the raw value for something unknown instead of crashing", () => {
    expect(labelOf(CATEGORIES, "brand_new_category")).toBe("brand_new_category");
  });
});

describe("status lifecycle (must mirror the API)", () => {
  test("open and in-progress incidents can advance", () => {
    expect(STATUS_TRANSITIONS.open).toEqual(["in_progress", "discarded"]);
    expect(STATUS_TRANSITIONS.in_progress).toEqual(["resolved", "discarded"]);
  });

  test("resolved and discarded are final", () => {
    expect(STATUS_TRANSITIONS.resolved).toEqual([]);
    expect(STATUS_TRANSITIONS.discarded).toEqual([]);
  });

  test("every transition target is a real status", () => {
    const valid = STATUSES.map((s) => s.value);
    for (const targets of Object.values(STATUS_TRANSITIONS)) {
      for (const target of targets) expect(valid).toContain(target);
    }
  });
});

describe("API calls", () => {
  test("listIncidents sends only the filters that are set", async () => {
    respond(200, []);

    await listIncidents({ status: "open", origin: "" });

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("status=open");
    expect(url).not.toContain("origin");
  });

  test("getIncidentSummary returns the parsed summary", async () => {
    respond(200, { total: 3, by_status: {}, by_category: {}, by_origin: {}, by_branch: {} });

    await expect(getIncidentSummary()).resolves.toMatchObject({ total: 3 });
  });

  test("a 400 from the API becomes per-field errors the form can show", async () => {
    respond(400, { detail: "x", errors: [{ field: "branch", message: "Branch is required." }] });

    const error = await createIncident({} as never).catch((e) => e);

    expect(error).toBeInstanceOf(IncidentApiError);
    expect(error.fieldErrors).toEqual({ branch: "Branch is required." });
  });

  test("a 404 says the incident could not be found", async () => {
    respond(404, { detail: "Incident not found." });

    await expect(updateIncidentStatus(99, "resolved")).rejects.toMatchObject({
      status: 404,
      message: expect.stringMatching(/could not be found/i),
    });
  });

  test("a 500 shows a generic message and nothing from the server body", async () => {
    respond(500, { detail: "Traceback: KeyError secret" });

    const error = await listIncidents().catch((e) => e);

    expect(error.message).toMatch(/something went wrong/i);
    expect(error.message).not.toMatch(/traceback|secret/i);
  });

  test("an unreachable server shows a connection message", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(listIncidents()).rejects.toThrow(/couldn't reach the server/i);
  });

  test("a success response that is not JSON is reported readably", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 200 }));

    await expect(listIncidents()).rejects.toThrow(/unexpected response/i);
  });
});
