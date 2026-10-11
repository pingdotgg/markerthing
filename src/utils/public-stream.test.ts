import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestPublicTheoStream } from "./twitch-server";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      getUserList: async () => ({ data: [{ id: "creator" }] }),
      getUserOauthAccessToken: async () => ({
        data: [{ token: "private-token" }],
      }),
    },
  }),
}));

const vod = {
  id: "123",
  user_id: "42",
  user_login: "theo",
  type: "archive",
  title: "Stream",
  created_at: "2026-10-07T22:25:04Z",
  duration: "5h34m44s",
  private_field: "omit",
};
const marker = (id: string) => ({
  id,
  created_at: vod.created_at,
  description: id === "1" ? "OFFSET 00:53:30" : "Topic",
  position_seconds: 3211,
  URL: "omit",
});
const page = (ids: string[], cursor?: string) => ({
  data: [
    { user_id: "42", videos: [{ video_id: "123", markers: ids.map(marker) }] },
  ],
  pagination: cursor ? { cursor } : {},
});
const stub = (...responses: unknown[]) => {
  const fetcher = vi.fn();
  for (const response of responses)
    fetcher.mockResolvedValueOnce(
      response instanceof Response ? response : Response.json(response)
    );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
};
const user = { data: [{ id: "42" }] };
const offline = { data: [] };
afterEach(() => vi.unstubAllGlobals());

describe("public latest stream", () => {
  it("selects the latest archive, walks every marker page, and returns only public fields", async () => {
    const fetcher = stub(
      user,
      offline,
      { data: [vod] },
      page(["1"], "next"),
      page(["2"]),
      offline
    );
    const result = await getLatestPublicTheoStream();
    expect(result).toMatchObject({
      schema_version: 1,
      id: "123",
      channel: "theo",
      offline: true,
      markers_complete: true,
      markers: [marker("1"), marker("2")].map(({ URL: _url, ...m }) => m),
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private-token|private_field|URL/
    );
    expect(fetcher.mock.calls[2][0]).toContain(
      "type=archive&sort=time&first=1"
    );
    expect(fetcher.mock.calls[4][0]).toContain("after=next");
    for (const [, options] of fetcher.mock.calls.slice(1))
      expect(options.cache).toBe("no-store");
  });
  it("refuses a live channel before fetching videos", async () => {
    const fetcher = stub(user, { data: [{ id: "live" }] });
    await expect(getLatestPublicTheoStream()).rejects.toMatchObject({
      status: 409,
      code: "channel_live",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("refuses a stream that goes live during pagination", async () => {
    stub(user, offline, { data: [vod] }, page(["1"]), {
      data: [{ id: "live" }],
    });
    await expect(getLatestPublicTheoStream()).rejects.toMatchObject({
      status: 409,
    });
  });
  it("reports no archive separately from an upstream failure", async () => {
    stub(user, offline, { data: [] });
    await expect(getLatestPublicTheoStream()).rejects.toMatchObject({
      status: 404,
    });
  });
  it.each([Response.json({}, { status: 401 }), {}, { data: null }])(
    "does not mistake a failed live check for offline",
    async (response) => {
      stub(user, response);
      await expect(getLatestPublicTheoStream()).rejects.toThrow();
    }
  );
  it("never returns a partial marker response after a later page fails", async () => {
    stub(
      user,
      offline,
      { data: [vod] },
      page(["1"], "next"),
      Response.json({}, { status: 429 })
    );
    await expect(getLatestPublicTheoStream()).rejects.toThrow();
  });
  it("rejects repeated pagination cursors", async () => {
    stub(
      user,
      offline,
      { data: [vod] },
      page(["1"], "loop"),
      page(["2"], "loop")
    );
    await expect(getLatestPublicTheoStream()).rejects.toThrow("pagination");
  });
  it("rejects duplicate markers and other creators' archives", async () => {
    stub(user, offline, { data: [vod] }, page(["1", "1"]));
    await expect(getLatestPublicTheoStream()).rejects.toThrow("repeated");
    stub(user, offline, { data: [{ ...vod, user_login: "someoneelse" }] });
    await expect(getLatestPublicTheoStream()).rejects.toThrow("archive");
  });
  it("fails closed at the pagination cap", async () => {
    stub(
      user,
      offline,
      { data: [vod] },
      ...Array.from({ length: 10 }, (_, i) => page([String(i)], `page${i}`))
    );
    await expect(getLatestPublicTheoStream()).rejects.toThrow("pagination");
  });
});
