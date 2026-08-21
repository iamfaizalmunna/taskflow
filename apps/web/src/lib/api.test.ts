import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi, groupsApi, tasksApi } from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs in and returns the user from the nested payload", async () => {
    const user = { id: "u1", name: "Alex", email: "alex@demo.test" };
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ user }));

    await expect(authApi.login("alex@demo.test", "Demo@12345")).resolves.toEqual(user);

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "alex@demo.test", password: "Demo@12345" }),
      }),
    );
  });

  it("throws an ApiError with the server message", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Invalid credentials" }, 401));

    await expect(authApi.login("bad@demo.test", "nope")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid credentials",
    });
  });

  it("joins validation error arrays into one message", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: ["title is required", "priority is invalid"] }, 400));

    await expect(
      tasksApi.create({ title: "", priority: "medium" }),
    ).rejects.toThrow("title is required, priority is invalid");
  });

  it("converts due dates to ISO and empty group ids to null", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: "t1", title: "Ship" }));

    await tasksApi.update("t1", {
      title: "Ship",
      priority: "high",
      groupId: "",
      dueDate: "2026-08-21",
    });

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      groupId: string | null;
      dueDate: string;
    };
    expect(body.groupId).toBeNull();
    expect(body.dueDate).toBe(new Date("2026-08-21").toISOString());
    expect(fetch).toHaveBeenCalledWith("/api/tasks/t1", expect.objectContaining({ method: "PATCH" }));
  });

  it("creates a group with the given name", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: "g1", name: "Work" }));

    await expect(groupsApi.create("Work")).resolves.toEqual({ id: "g1", name: "Work" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/groups",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Work" }),
      }),
    );
  });
});
