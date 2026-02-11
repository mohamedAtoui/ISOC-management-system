"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Event {
  id: number;
  name: string;
  date: string;
  capacity: number;
  bookedCount: number;
  isOpen: boolean;
  foodOptions: string | null;
}

interface MyBooking {
  id: number;
  eventId: number;
  status: string;
  eventName: string;
  eventDate: string;
}

interface MyWaitlist {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string;
}

interface MemberStatus {
  membershipExpires: string | null;
  isBlacklisted: boolean;
  strikes: number;
  penaltyUntilEventCount: number;
  blockedEventIds: number[];
  isEligible: boolean;
}

interface CancelModalState {
  isOpen: boolean;
  bookingId: number | null;
  eventDate: string | null;
  eventName: string | null;
  isLateCancellation: boolean;
}

function isWithin24Hours(eventDateStr: string): boolean {
  // Event date is in format "YYYY-MM-DD" - assume event is at start of day
  const eventDate = new Date(eventDateStr + "T00:00:00");
  const now = new Date();
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilEvent < 24;
}

export default function BookPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<MyWaitlist[]>([]);
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cancelModal, setCancelModal] = useState<CancelModalState>({
    isOpen: false,
    bookingId: null,
    eventDate: null,
    eventName: null,
    isLateCancellation: false,
  });

  const loadData = useCallback(async () => {
    try {
      const [eventsRes, bookingsRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/bookings"),
      ]);

      if (eventsRes.status === 401 || eventsRes.redirected) {
        router.push("/");
        return;
      }

      const eventsData = await eventsRes.json();
      const today = new Date().toISOString().split("T")[0];
      setEvents(eventsData.filter((e: Event) => e.isOpen && e.date >= today));

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setMyBookings(bookingsData.bookings || []);
        setMyWaitlist(bookingsData.waitlist || []);
        setMemberStatus(bookingsData.memberStatus || null);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleBook(eventId: number) {
    setActionLoading((s) => ({ ...s, [eventId]: "booking" }));
    setMessage(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: data.error });
      setActionLoading((s) => ({ ...s, [eventId]: "" }));
      return;
    }

    if (data.status === "confirmed") {
      setMessage({ type: "success", text: "Booking confirmed!" });
    } else if (data.status === "waitlisted") {
      setMessage({ type: "success", text: "You've been added to the waitlist." });
    }

    setActionLoading((s) => ({ ...s, [eventId]: "" }));
    loadData();
  }

  function openCancelModal(booking: MyBooking) {
    const isLate = isWithin24Hours(booking.eventDate);
    setCancelModal({
      isOpen: true,
      bookingId: booking.id,
      eventDate: booking.eventDate,
      eventName: booking.eventName,
      isLateCancellation: isLate,
    });
  }

  function closeCancelModal() {
    setCancelModal({
      isOpen: false,
      bookingId: null,
      eventDate: null,
      eventName: null,
      isLateCancellation: false,
    });
  }

  async function confirmCancel() {
    if (!cancelModal.bookingId) return;

    const bookingId = cancelModal.bookingId;
    closeCancelModal();

    setActionLoading((s) => ({ ...s, [`cancel-${bookingId}`]: "cancelling" }));
    setMessage(null);

    const res = await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: "Booking cancelled." });
    }

    setActionLoading((s) => ({ ...s, [`cancel-${bookingId}`]: "" }));
    loadData();
  }

  function getBookingForEvent(eventId: number) {
    return myBookings.find((b) => b.eventId === eventId && b.status === "confirmed");
  }

  function getWaitlistForEvent(eventId: number) {
    return myWaitlist.find((w) => w.eventId === eventId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading events...</p>
      </div>
    );
  }

  const confirmedBookings = myBookings.filter((b) => b.status === "confirmed");

  // Check if user can book (eligible, not blacklisted)
  const canBook = memberStatus?.isEligible ?? false;
  const blockedEventIds = memberStatus?.blockedEventIds ?? [];

  return (
    <>
      {/* Membership Status Banners */}
      {memberStatus?.isBlacklisted && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-800 font-medium">Your account is suspended</p>
          <p className="text-red-600 text-sm">Please contact ISOC committee.</p>
        </div>
      )}

      {!memberStatus?.isBlacklisted && memberStatus && !memberStatus.isEligible && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-800 font-medium">
            Your membership expired{memberStatus.membershipExpires ? ` on ${memberStatus.membershipExpires}` : ""}
          </p>
          <p className="text-red-600 text-sm">Please renew to book events.</p>
        </div>
      )}

      {memberStatus && memberStatus.strikes > 0 && !memberStatus.isBlacklisted && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-amber-700">
            You have {memberStatus.strikes} strike{memberStatus.strikes !== 1 ? "s" : ""}. 3 strikes = suspension.
          </p>
        </div>
      )}

      {memberStatus && memberStatus.penaltyUntilEventCount > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-800 font-medium">Late cancellation penalty</p>
          <p className="text-red-600 text-sm">
            You cancelled a booking within 24 hours of the event. You are blocked from booking for the next {memberStatus.penaltyUntilEventCount} event{memberStatus.penaltyUntilEventCount !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* My Bookings Section */}
      {confirmedBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Your Bookings</h2>
          <div className="space-y-3">
            {confirmedBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl shadow-sm border border-green-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-stone-900">{booking.eventName}</p>
                  <p className="text-sm text-stone-600">{booking.eventDate}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    Confirmed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/ticket/${booking.id}`}
                    className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
                  >
                    View Ticket
                  </a>
                  <button
                    onClick={() => openCancelModal(booking)}
                    disabled={!!actionLoading[`cancel-${booking.id}`]}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    {actionLoading[`cancel-${booking.id}`] ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waitlist Section */}
      {myWaitlist.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Waitlisted</h2>
          <div className="space-y-3">
            {myWaitlist.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4"
              >
                <p className="font-semibold text-stone-900">{entry.eventName}</p>
                <p className="text-sm text-stone-600">{entry.eventDate}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                  On Waitlist
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Events */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Available Events</h2>
      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500 text-lg">No events are currently open for booking.</p>
          <p className="text-stone-400 mt-2">Check back later!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const spotsLeft = event.capacity - event.bookedCount;
            const isFull = spotsLeft <= 0;
            const existingBooking = getBookingForEvent(event.id);
            const existingWaitlist = getWaitlistForEvent(event.id);
            const isLoading = actionLoading[event.id] === "booking";
            const isBlockedByPenalty = blockedEventIds.includes(event.id);

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-sm border border-stone-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-stone-900">
                      {event.name}
                    </h3>
                    <p className="text-stone-600 mt-1">{event.date}</p>
                    <p
                      className={`text-sm mt-2 font-medium ${
                        isFull ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isFull
                        ? "Event is full"
                        : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} remaining`}
                    </p>
                    {/* Food info */}
                    {event.foodOptions && (() => {
                      const options = JSON.parse(event.foodOptions) as string[];
                      return (
                        <p className="text-sm text-stone-600 mt-2">
                          <span className="font-medium">Food:</span> {options.join(", ")}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    {existingBooking ? (
                      <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm">
                        Booked
                      </span>
                    ) : existingWaitlist ? (
                      <span className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg font-medium text-sm">
                        Waitlisted
                      </span>
                    ) : !canBook || isBlockedByPenalty ? (
                      <button
                        disabled
                        className="px-6 py-2 rounded-lg font-medium bg-stone-200 text-stone-500 cursor-not-allowed"
                        title={
                          memberStatus?.isBlacklisted
                            ? "Account suspended"
                            : isBlockedByPenalty
                            ? "Late cancellation penalty"
                            : "Membership expired"
                        }
                      >
                        {isFull ? "Join Waitlist" : "Book Now"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBook(event.id)}
                        disabled={isLoading}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          isFull
                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                            : "bg-stone-800 text-white hover:bg-stone-700"
                        }`}
                      >
                        {isLoading
                          ? "Booking..."
                          : isFull
                          ? "Join Waitlist"
                          : "Book Now"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeCancelModal}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              {cancelModal.isLateCancellation ? "⚠️ Late Cancellation Warning" : "Cancel Booking"}
            </h3>

            {cancelModal.isLateCancellation ? (
              <div className="mb-4">
                <p className="text-red-700 font-medium mb-2">
                  You are cancelling less than 24 hours before the event.
                </p>
                <p className="text-stone-600 text-sm">
                  Late cancellations may result in a strike or temporary booking ban.
                  Are you sure you want to cancel your booking for <strong>{cancelModal.eventName}</strong>?
                </p>
              </div>
            ) : (
              <p className="text-stone-600 mb-4">
                Are you sure you want to cancel your booking for <strong>{cancelModal.eventName}</strong>?
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={confirmCancel}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  cancelModal.isLateCancellation
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-stone-800 text-white hover:bg-stone-700"
                }`}
              >
                {cancelModal.isLateCancellation ? "Cancel Anyway" : "Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
