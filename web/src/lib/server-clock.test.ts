import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DEVICE = new Date("2026-10-11T12:00:00Z").getTime();

// The module keeps one clock per page load: load it fresh for every test.
async function load() {
  vi.resetModules();
  return import("./server-clock");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(DEVICE);
});
afterEach(() => vi.useRealTimers());

describe("server clock in the browser", () => {
  it("is the device clock until the server has answered", async () => {
    const clock = await load();
    expect(clock.serverNowMs()).toBe(DEVICE);
  });

  it("takes the server's time to be the middle of the request", async () => {
    const clock = await load();
    // Sent at 0 ms, answered at 200 ms, the server said 5,100 ms: it is 5 s ahead.
    expect(clock.clockOffsetMs(5_100, 0, 200)).toBe(5_000);
  });

  it("follows the server once it has answered, even when the device clock is wrong", async () => {
    const clock = await load();
    const serverNow = new Date(DEVICE + 90_000).toISOString();
    clock.syncServerClock(serverNow, DEVICE, DEVICE);
    expect(clock.serverNowMs()).toBe(DEVICE + 90_000);
    vi.advanceTimersByTime(1_000);
    expect(clock.serverNowMs()).toBe(DEVICE + 91_000);
  });

  it("uses a fresh page's time as a first guess, and a real answer after that", async () => {
    const clock = await load();
    clock.hintServerClock(new Date(DEVICE - 30_000).toISOString());
    expect(clock.serverNowMs()).toBe(DEVICE - 30_000);
    clock.syncServerClock(new Date(DEVICE + 2_000).toISOString(), DEVICE, DEVICE);
    expect(clock.serverNowMs()).toBe(DEVICE + 2_000);
    // A later hint never overrides a real answer.
    clock.hintServerClock(new Date(DEVICE - 30_000).toISOString());
    expect(clock.serverNowMs()).toBe(DEVICE + 2_000);
  });

  it("ignores a time it can't read", async () => {
    const clock = await load();
    clock.syncServerClock("not a time", DEVICE, DEVICE);
    clock.hintServerClock("also not a time");
    expect(clock.serverNowMs()).toBe(DEVICE);
  });
});
