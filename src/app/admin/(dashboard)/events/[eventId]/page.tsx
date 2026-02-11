"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";

interface Guest {
  bookingId: number;
  memberId: number;
  name: string;
  studentId: string;
  gender: string;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  foodChoice: string | null;
}

interface Event {
  id: number;
  name: string;
  date: string;
  capacity: number;
  bookedCount: number;
  isOpen: boolean;
  foodOptions: string | null;
}

interface SearchResult {
  id: number;
  name: string;
  studentId: string;
}

export default function EventGuestListPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // VIP Add Guest state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addLoading, setAddLoading] = useState<number | null>(null);
  const [addMessage, setAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const [eventRes, guestsRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      fetch(`/api/events/${eventId}/guests`),
    ]);
    setEvent(await eventRes.json());
    setGuests(await guestsRes.json());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search for members
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/members?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out members who are already guests
          const guestMemberIds = new Set(guests.filter(g => g.status === "confirmed").map(g => g.memberId));
          const filtered = (data.members || [])
            .filter((m: SearchResult) => !guestMemberIds.has(m.id))
            .slice(0, 5);
          setSearchResults(filtered);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, guests]);

  async function handleAddGuest(memberId: number) {
    setAddLoading(memberId);
    setAddMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddMessage({ type: "error", text: data.error });
      } else {
        setAddMessage({ type: "success", text: `Added ${data.member.name} to the guest list` });
        setSearchQuery("");
        setSearchResults([]);
        loadData();
      }
    } finally {
      setAddLoading(null);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!event) return <div className="p-6">Event not found</div>;

  const confirmedGuests = guests.filter((g) => g.status === "confirmed");
  const checkedInCount = confirmedGuests.filter((g) => g.checkedIn).length;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/events" className="text-stone-600 hover:underline text-sm">
          &larr; Back to Events
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-stone-900">{event.name}</h1>
        <p className="text-stone-600">{event.date}</p>
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-stone-600">
            {event.bookedCount}/{event.capacity} booked
          </span>
          <span className="text-green-600">
            {checkedInCount} checked in
          </span>
        </div>
        {event.foodOptions && (
          <div className="mt-3">
            <span className="text-sm text-stone-500">Food options: </span>
            <span className="text-sm text-stone-700">
              {JSON.parse(event.foodOptions).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* VIP Add Guest Section */}
      <div className="mb-6 bg-white rounded-lg border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">Add Guest (VIP Override)</h2>
        <p className="text-xs text-stone-500 mb-3">
          Search for a member to add them to this event, bypassing capacity limits.
        </p>

        {addMessage && (
          <div
            className={`mb-3 p-3 rounded-lg text-sm ${
              addMessage.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {addMessage.text}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />

          {/* Search Results Dropdown */}
          {(searchResults.length > 0 || searchLoading) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-stone-200 shadow-lg z-10">
              {searchLoading ? (
                <div className="p-3 text-sm text-stone-500">Searching...</div>
              ) : (
                searchResults.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-stone-50 border-b border-stone-100 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-900">{member.name}</p>
                      <p className="text-xs text-stone-500 font-mono">{member.studentId}</p>
                    </div>
                    <button
                      onClick={() => handleAddGuest(member.id)}
                      disabled={addLoading === member.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-800 text-white hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                      {addLoading === member.id ? "Adding..." : "Add Guest"}
                    </button>
                  </div>
                ))
              )}
              {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                <div className="p-3 text-sm text-stone-500">No members found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmedGuests.length === 0 ? (
        <p className="text-stone-500">No confirmed guests yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-stone-200">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="py-3 px-4 text-sm font-medium text-stone-500">Name</th>
                <th className="py-3 px-4 text-sm font-medium text-stone-500">Student ID</th>
                <th className="py-3 px-4 text-sm font-medium text-stone-500">Gender</th>
                <th className="py-3 px-4 text-sm font-medium text-stone-500">Food Choice</th>
                <th className="py-3 px-4 text-sm font-medium text-stone-500">Status</th>
                <th className="py-3 px-4 text-sm font-medium text-stone-500">Checked In</th>
              </tr>
            </thead>
            <tbody>
              {confirmedGuests.map((guest) => (
                <tr key={guest.bookingId} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-medium text-stone-900">{guest.name}</td>
                  <td className="py-3 px-4 font-mono text-sm text-stone-600">{guest.studentId}</td>
                  <td className="py-3 px-4 capitalize text-stone-600">{guest.gender}</td>
                  <td className="py-3 px-4 text-stone-600">{guest.foodChoice || "-"}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      {guest.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {guest.checkedIn ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-stone-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
