import { describe, it, expect, vi, beforeEach } from "vitest";
import { dbChain } from "@/test-utils/db-mock";

// ---- Hoisted mocks ----
const { mockDb } = vi.hoisted(() => {
  const fn = vi.fn;
  return {
    mockDb: {
      select: fn().mockReturnValue(undefined),
      insert: fn().mockReturnValue(undefined),
      update: fn().mockReturnValue(undefined),
      delete: fn().mockReturnValue(undefined),
      run: fn().mockResolvedValue({ rowsAffected: 0 }),
      $count: fn().mockResolvedValue(0),
    },
  };
});

vi.mock("@/lib/auth", () => ({
  requireAdminApi: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

vi.mock("@/db/schema", () => ({
  events: { id: "events.id" },
  bookings: {
    id: "bookings.id",
    memberId: "bookings.memberId",
    eventId: "bookings.eventId",
    status: "bookings.status",
    checkedIn: "bookings.checkedIn",
    checkedInAt: "bookings.checkedInAt",
    foodChoice: "bookings.foodChoice",
  },
  waitlist: {
    id: "waitlist.id",
    memberId: "waitlist.memberId",
    eventId: "waitlist.eventId",
    claimed: "waitlist.claimed",
    createdAt: "waitlist.createdAt",
  },
  members: {
    id: "members.id",
    name: "members.name",
    studentId: "members.studentId",
    gender: "members.gender",
  },
}));

import { requireAdminApi } from "@/lib/auth";
import { GET } from "./route";

const mockRequireAdminApi = vi.mocked(requireAdminApi);

function makeRequest() {
  return new Request("http://localhost:3000/api/events/5/guests") as unknown as import("next/server").NextRequest;
}

function makeParams() {
  return { params: Promise.resolve({ eventId: "5" }) };
}

describe("GET /api/events/[eventId]/guests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue(dbChain([]));
  });

  it("returns 401 when unauthorized (no session)", async () => {
    mockRequireAdminApi.mockResolvedValue({ error: "Unauthorized", status: 401 });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdminApi.mockResolvedValue({ error: "Forbidden", status: 403 });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns { guests, waitlist } with data", async () => {
    mockRequireAdminApi.mockResolvedValue({
      session: {
        member: { id: 1, isAdmin: true, name: "Admin", studentId: "A1", email: null, gender: null, joiningDate: "2024-01-01", membershipExpires: "2026-12-31", strikes: 0, isBlacklisted: false, clerkUserId: "c1", penaltyUntilEventCount: 0, createdAt: "2024-01-01T00:00:00Z" },
      },
    });

    const guestData = [
      { bookingId: 1, memberId: 2, name: "Alice", studentId: "S1", gender: "F", status: "confirmed", checkedIn: false, checkedInAt: null, foodChoice: null },
    ];
    const waitlistData = [
      { waitlistId: 10, memberId: 3, name: "Bob", studentId: "S2", gender: "M", createdAt: "2026-02-10T10:00:00Z" },
    ];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return dbChain(guestData);
      return dbChain(waitlistData);
    });

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.guests).toHaveLength(1);
    expect(data.guests[0].name).toBe("Alice");
    expect(data.waitlist).toHaveLength(1);
    expect(data.waitlist[0].name).toBe("Bob");
  });

  it("returns empty arrays when no guests or waitlist", async () => {
    mockRequireAdminApi.mockResolvedValue({
      session: {
        member: { id: 1, isAdmin: true, name: "Admin", studentId: "A1", email: null, gender: null, joiningDate: "2024-01-01", membershipExpires: "2026-12-31", strikes: 0, isBlacklisted: false, clerkUserId: "c1", penaltyUntilEventCount: 0, createdAt: "2024-01-01T00:00:00Z" },
      },
    });

    mockDb.select.mockReturnValue(dbChain([]));

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.guests).toEqual([]);
    expect(data.waitlist).toEqual([]);
  });
});
