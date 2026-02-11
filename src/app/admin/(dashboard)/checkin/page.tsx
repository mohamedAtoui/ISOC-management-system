"use client";

import { useState, useEffect, useCallback } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineSync } from "@/hooks/use-offline-sync";

interface Guest {
  bookingId: number;
  memberId: number;
  name: string;
  studentId: string;
  gender: string;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
}

interface EventOption {
  id: number;
  name: string;
  date: string;
}

const GUESTS_CACHE_KEY = "checkin-guests";
const EVENT_CACHE_KEY = "checkin-event-id";

export default function CheckInPage() {
  const isOnline = useOnlineStatus();
  const { queueCheckIn, syncQueue } = useOfflineSync();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderTab, setGenderTab] = useState<"all" | "male" | "female">("all");

  // Load events on mount
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        setEvents(data);

        // Restore cached event selection
        const cachedEventId = localStorage.getItem(EVENT_CACHE_KEY);
        if (cachedEventId) {
          setSelectedEventId(Number(cachedEventId));
        }
      } catch {
        // Offline - try to load from cache
        const cached = localStorage.getItem(GUESTS_CACHE_KEY);
        if (cached) {
          setGuests(JSON.parse(cached));
        }
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  // Load guests when event changes
  const loadGuests = useCallback(async (eventId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data: Guest[] = await res.json();
      const confirmed = data.filter((g) => g.status === "confirmed");
      setGuests(confirmed);
      localStorage.setItem(GUESTS_CACHE_KEY, JSON.stringify(confirmed));
      localStorage.setItem(EVENT_CACHE_KEY, String(eventId));
    } catch {
      // Load from cache if offline
      const cached = localStorage.getItem(GUESTS_CACHE_KEY);
      if (cached) {
        setGuests(JSON.parse(cached));
      }
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadGuests(selectedEventId);
    }
  }, [selectedEventId, loadGuests]);

  async function handleCheckIn(guest: Guest) {
    // Optimistic UI update
    setGuests((prev) =>
      prev.map((g) =>
        g.bookingId === guest.bookingId
          ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() }
          : g
      )
    );

    // Update localStorage cache
    const updated = guests.map((g) =>
      g.bookingId === guest.bookingId
        ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() }
        : g
    );
    localStorage.setItem(GUESTS_CACHE_KEY, JSON.stringify(updated));

    if (isOnline) {
      try {
        await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: guest.bookingId }),
        });
      } catch {
        queueCheckIn(guest.bookingId);
      }
    } else {
      queueCheckIn(guest.bookingId);
    }
  }

  async function handleUndo(guest: Guest) {
    // Optimistic UI update
    setGuests((prev) =>
      prev.map((g) =>
        g.bookingId === guest.bookingId
          ? { ...g, checkedIn: false, checkedInAt: null }
          : g
      )
    );

    // Update localStorage cache
    const updated = guests.map((g) =>
      g.bookingId === guest.bookingId
        ? { ...g, checkedIn: false, checkedInAt: null }
        : g
    );
    localStorage.setItem(GUESTS_CACHE_KEY, JSON.stringify(updated));

    if (isOnline) {
      try {
        await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: guest.bookingId, action: "undo" }),
        });
      } catch {
        // If undo fails, revert the optimistic update
        setGuests((prev) =>
          prev.map((g) =>
            g.bookingId === guest.bookingId
              ? { ...g, checkedIn: true, checkedInAt: new Date().toISOString() }
              : g
          )
        );
      }
    }
  }

  // Filter by gender first
  const genderFilteredGuests = guests.filter((g) => {
    if (genderTab === "all") return true;
    if (genderTab === "male") return g.gender === "M";
    if (genderTab === "female") return g.gender === "F";
    return true;
  });

  // Then filter by search
  const filteredGuests = genderFilteredGuests.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.studentId.toLowerCase().includes(search.toLowerCase())
  );

  // Stats by gender
  const maleGuests = guests.filter((g) => g.gender === "M");
  const femaleGuests = guests.filter((g) => g.gender === "F");
  const maleCheckedIn = maleGuests.filter((g) => g.checkedIn).length;
  const femaleCheckedIn = femaleGuests.filter((g) => g.checkedIn).length;
  const checkedInCount = guests.filter((g) => g.checkedIn).length;

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-900">Check-In</h1>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              isOnline ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-stone-600">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Event selector */}
      <div className="mb-4">
        <select
          value={selectedEventId ?? ""}
          onChange={(e) => setSelectedEventId(Number(e.target.value) || null)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500"
        >
          <option value="">Select an event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({event.date})
            </option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <>
          {/* Gender tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setGenderTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                genderTab === "all"
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              All ({guests.length})
            </button>
            <button
              onClick={() => setGenderTab("male")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                genderTab === "male"
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              Males ({maleGuests.length})
            </button>
            <button
              onClick={() => setGenderTab("female")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                genderTab === "female"
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              Females ({femaleGuests.length})
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-white border border-stone-200 rounded-lg">
            <span className="text-sm text-stone-700">
              Total: <strong>{checkedInCount}/{guests.length}</strong>
            </span>
            <span className="text-sm text-blue-600">
              Males: <strong>{maleCheckedIn}/{maleGuests.length}</strong>
            </span>
            <span className="text-sm text-pink-600">
              Females: <strong>{femaleCheckedIn}/{femaleGuests.length}</strong>
            </span>
            {!isOnline && (
              <button
                onClick={syncQueue}
                className="ml-auto text-sm text-stone-600 hover:underline"
              >
                Sync when online
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or student ID..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg mb-4 focus:ring-2 focus:ring-stone-500"
          />

          {/* Guest list */}
          <div className="space-y-2">
            {filteredGuests.map((guest) => (
              <div
                key={guest.bookingId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  guest.checkedIn
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-stone-200"
                }`}
              >
                <div>
                  <p className="font-medium text-stone-900">{guest.name}</p>
                  <p className="text-sm text-stone-500 font-mono">
                    {guest.studentId}
                  </p>
                </div>
                {guest.checkedIn ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium text-sm">
                      Checked In
                    </span>
                    <button
                      onClick={() => handleUndo(guest)}
                      className="px-3 py-1.5 text-red-600 bg-red-50 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckIn(guest)}
                    className="px-4 py-2 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 transition-colors active:scale-95"
                  >
                    Check In
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
