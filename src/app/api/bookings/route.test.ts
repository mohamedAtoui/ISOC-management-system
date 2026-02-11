import { describe, it, expect, vi, beforeEach } from "vitest";
import { dbChain } from "@/test-utils/db-mock";

// ---- Hoisted mocks (accessible inside vi.mock factories) ----
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

const mockMember = {
  id: 1,
  studentId: "S001",
  email: "alice@example.com",
  name: "Alice",
  gender: "F" as const,
  joiningDate: "2024-01-01",
  membershipExpires: "2026-12-31",
  strikes: 0,
  isBlacklisted: false,
  isAdmin: false,
  clerkUserId: "clerk_1",
  penaltyUntilEventCount: 0,
  createdAt: "2024-01-01T00:00:00Z",
};

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
  gte: vi.fn((...args: unknown[]) => args),
  asc: vi.fn((col: unknown) => col),
  isNull: vi.fn((col: unknown) => col),
}));

vi.mock("@/db/schema", () => ({
  events: { id: "events.id", date: "events.date", name: "events.name" },
  bookings: {
    id: "bookings.id",
    memberId: "bookings.memberId",
    eventId: "bookings.eventId",
    status: "bookings.status",
  },
  waitlist: {
    id: "waitlist.id",
    memberId: "waitlist.memberId",
    eventId: "waitlist.eventId",
    claimed: "waitlist.claimed",
    claimSentAt: "waitlist.claimSentAt",
    createdAt: "waitlist.createdAt",
  },
  members: { id: "members.id" },
  isMemberEligible: vi.fn(),
}));

import { requireSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { isMemberEligible } from "@/db/schema";
import { POST, DELETE } from "./route";

const mockRequireSession = vi.mocked(requireSession);
const mockSendEmail = vi.mocked(sendEmail);
const mockIsMemberEligible = vi.mocked(isMemberEligible);

function makeRequest(body: Record<string, unknown>, method = "POST") {
  return new Request("http://localhost:3000/api/bookings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

// ---- Tests ----
describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ member: { ...mockMember } });
    mockIsMemberEligible.mockReturnValue(true);
    mockDb.select.mockReturnValue(dbChain([]));
    mockDb.insert.mockReturnValue(dbChain([{ id: 99 }]));
    mockDb.run.mockResolvedValue({ rowsAffected: 1 });
  });

  it("returns 400 if eventId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("eventId");
  });

  it("returns 403 if member is blacklisted", async () => {
    mockRequireSession.mockResolvedValue({
      member: { ...mockMember, isBlacklisted: true },
    });
    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("blacklisted");
  });

  it("returns 403 if membership is expired", async () => {
    mockIsMemberEligible.mockReturnValue(false);
    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("expired");
  });

  it("returns 409 if member already has a confirmed booking", async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return dbChain([{ id: 10, status: "confirmed" }]);
      return dbChain([]);
    });
    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(409);
  });

  it("returns 409 if member is already on the waitlist", async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) return dbChain([]); // no booking
      if (selectCallCount === 2) return dbChain([{ id: 5 }]); // existing waitlist
      return dbChain([]);
    });
    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(409);
  });

  it("returns 200 with status=confirmed when capacity available", async () => {
    mockDb.select.mockReturnValue(dbChain([]));
    mockDb.run.mockResolvedValue({ rowsAffected: 1 });
    mockDb.insert.mockReturnValue(dbChain([{ id: 99 }]));

    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("confirmed");
  });

  it("returns 200 with status=waitlisted when event is full", async () => {
    mockDb.run.mockResolvedValue({ rowsAffected: 0 });
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount <= 2) return dbChain([]);
      return dbChain([{ id: 1, name: "Iftar", date: "2026-03-15", capacity: 50, bookedCount: 50, isOpen: true }]);
    });

    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("waitlisted");
  });

  it("sends waitlist email when event is full and member has email", async () => {
    mockDb.run.mockResolvedValue({ rowsAffected: 0 });
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount <= 2) return dbChain([]);
      return dbChain([{ id: 1, name: "Iftar Night", date: "2026-03-15", capacity: 50, bookedCount: 50, isOpen: true }]);
    });

    await POST(makeRequest({ eventId: 1 }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: expect.stringContaining("Waitlisted"),
      })
    );
  });

  it("does NOT send email when member has no email", async () => {
    mockRequireSession.mockResolvedValue({
      member: { ...mockMember, email: null },
    });
    mockDb.run.mockResolvedValue({ rowsAffected: 0 });
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount <= 2) return dbChain([]);
      return dbChain([{ id: 1, name: "Iftar", date: "2026-03-15", capacity: 50, bookedCount: 50, isOpen: true }]);
    });

    await POST(makeRequest({ eventId: 1 }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 404 if event not found", async () => {
    mockDb.run.mockResolvedValue({ rowsAffected: 0 });
    mockDb.select.mockReturnValue(dbChain([]));

    const res = await POST(makeRequest({ eventId: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 400 if event is not open", async () => {
    mockDb.run.mockResolvedValue({ rowsAffected: 0 });
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount <= 2) return dbChain([]);
      return dbChain([{ id: 1, name: "Closed Event", isOpen: false, capacity: 50, bookedCount: 0 }]);
    });

    const res = await POST(makeRequest({ eventId: 1 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("not open");
  });
});

describe("DELETE /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ member: { ...mockMember } });
    mockDb.select.mockReturnValue(dbChain([]));
    mockDb.run.mockResolvedValue({ rowsAffected: 1 });
    mockDb.update.mockReturnValue(dbChain([]));
  });

  it("returns 400 if bookingId is missing", async () => {
    const res = await DELETE(makeRequest({}, "DELETE"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("bookingId");
  });

  it("returns 404 if booking not found", async () => {
    mockDb.select.mockReturnValue(dbChain([]));
    const res = await DELETE(makeRequest({ bookingId: 999 }, "DELETE"));
    expect(res.status).toBe(404);
  });

  it("returns success on valid cancellation", async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return dbChain([{ id: 10, memberId: 1, eventId: 1, status: "confirmed" }]);
      }
      if (selectCallCount === 2) {
        return dbChain([{ id: 1, date: "2099-12-31" }]);
      }
      return dbChain([]);
    });

    const res = await DELETE(makeRequest({ bookingId: 10 }, "DELETE"));
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
