import { describe, expect, it } from "vitest";

describe("auth token storage helper", () => {
  it("stores and clears access + refresh tokens in a map store", () => {
    const store = new Map<string, string>();
    const TOKEN_KEY = "meeting_access_token";
    const REFRESH_KEY = "meeting_refresh_token";

    function setAuthTokens(access: string, refresh?: string | null) {
      store.set(TOKEN_KEY, access);
      if (refresh) store.set(REFRESH_KEY, refresh);
      else if (refresh === null) store.delete(REFRESH_KEY);
    }

    function clearAccessToken() {
      store.delete(TOKEN_KEY);
      store.delete(REFRESH_KEY);
    }

    setAuthTokens("access", "refresh");
    expect(store.get(TOKEN_KEY)).toBe("access");
    expect(store.get(REFRESH_KEY)).toBe("refresh");
    clearAccessToken();
    expect(store.get(TOKEN_KEY)).toBeUndefined();
    expect(store.get(REFRESH_KEY)).toBeUndefined();
  });
});

describe("paginated unwrap", () => {
  function unwrapList<T>(payload: T[] | { items: T[] }): T[] {
    if (Array.isArray(payload)) return payload;
    return payload.items ?? [];
  }

  it("accepts legacy arrays and paginated envelopes", () => {
    expect(unwrapList([1, 2])).toEqual([1, 2]);
    expect(unwrapList({ items: [3] })).toEqual([3]);
  });
});

describe("embed url builder", () => {
  it("builds embed query string", () => {
    const url = new URL("http://localhost:3000/embed/room1");
    url.searchParams.set("name", "Guest");
    url.searchParams.set("token", "abc");
    expect(url.toString()).toContain("name=Guest");
    expect(url.toString()).toContain("token=abc");
  });
});
