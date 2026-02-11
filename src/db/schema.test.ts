import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isMemberEligible } from "./schema";

describe("isMemberEligible", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when membership expires in the future", () => {
    expect(isMemberEligible("2026-12-31")).toBe(true);
  });

  it("returns true on the exact expiry day (boundary)", () => {
    expect(isMemberEligible("2026-02-11")).toBe(true);
  });

  it("returns false when membership expired yesterday", () => {
    expect(isMemberEligible("2026-02-10")).toBe(false);
  });

  it("returns false when membership expired long ago", () => {
    expect(isMemberEligible("2024-01-01")).toBe(false);
  });
});
