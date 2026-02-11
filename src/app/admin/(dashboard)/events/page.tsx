"use client";

import { useState, useEffect } from "react";

interface Event {
  id: number;
  name: string;
  date: string;
  capacity: number;
  bookedCount: number;
  isOpen: boolean;
  foodOptions: string | null;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", date: "", capacity: "", foodOptions: "" });
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", date: "", capacity: "", foodOptions: "" });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Parse food options from comma-separated string
    const foodOptions = formData.foodOptions
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        date: formData.date,
        capacity: formData.capacity,
        foodOptions: foodOptions.length > 0 ? foodOptions : null,
      }),
    });
    if (res.ok) {
      setFormData({ name: "", date: "", capacity: "", foodOptions: "" });
      setShowForm(false);
      fetchEvents();
    }
    setSaving(false);
  }

  async function toggleOpen(event: Event) {
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !event.isOpen }),
    });
    fetchEvents();
  }

  function startEditing(event: Event) {
    setEditingEventId(event.id);
    setShowForm(false);
    const foodArr = event.foodOptions ? JSON.parse(event.foodOptions) : [];
    setEditFormData({
      name: event.name,
      date: event.date,
      capacity: String(event.capacity),
      foodOptions: foodArr.join(", "),
    });
  }

  function cancelEditing() {
    setEditingEventId(null);
    setEditFormData({ name: "", date: "", capacity: "", foodOptions: "" });
  }

  async function handleEdit(e: React.FormEvent, event: Event) {
    e.preventDefault();
    setEditSaving(true);

    const newCapacity = Number(editFormData.capacity);
    if (newCapacity < event.bookedCount) {
      if (!confirm(`New capacity (${newCapacity}) is less than current bookings (${event.bookedCount}). Continue?`)) {
        setEditSaving(false);
        return;
      }
    }

    const foodOptions = editFormData.foodOptions
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editFormData.name,
        date: editFormData.date,
        capacity: editFormData.capacity,
        foodOptions: foodOptions.length > 0 ? foodOptions : null,
      }),
    });
    if (res.ok) {
      cancelEditing();
      fetchEvents();
    }
    setEditSaving(false);
  }

  async function deleteEvent(id: number) {
    if (!confirm("Delete this event? This will also delete all bookings.")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    fetchEvents();
  }

  if (loading) {
    return <div className="p-6">Loading events...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Events</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-stone-800 text-white px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors"
        >
          {showForm ? "Cancel" : "Create Event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-stone-200 p-4 rounded-lg mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Event Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Iftar Night 1"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Capacity</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="e.g. 100"
              min="1"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Food Options (optional)</label>
            <input
              type="text"
              value={formData.foodOptions}
              onChange={(e) => setFormData({ ...formData, foodOptions: e.target.value })}
              placeholder="e.g. Biryani, Pasta, Salad"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            />
            <p className="text-xs text-stone-500 mt-1">Comma-separated list of food choices</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-stone-800 text-white px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Event"}
          </button>
        </form>
      )}

      {events.length === 0 ? (
        <p className="text-stone-500">No events yet. Create one to get started.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
              {editingEventId === event.id ? (
                <form onSubmit={(e) => handleEdit(e, event)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Event Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      value={editFormData.capacity}
                      onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                      min="1"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-stone-500 mt-1">Currently {event.bookedCount} booked</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Food Options (optional)</label>
                    <input
                      type="text"
                      value={editFormData.foodOptions}
                      onChange={(e) => setEditFormData({ ...editFormData, foodOptions: e.target.value })}
                      placeholder="e.g. Biryani, Pasta, Salad"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                    />
                    <p className="text-xs text-stone-500 mt-1">Comma-separated list of food choices</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="bg-stone-800 text-white px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                      {editSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900">{event.name}</h3>
                      <p className="text-stone-600">{event.date}</p>
                      <p className="text-sm text-stone-500 mt-1">
                        {event.bookedCount} / {event.capacity} booked
                      </p>
                      {event.foodOptions && (
                        <p className="text-sm text-stone-600 mt-1">
                          <span className="font-medium">Food:</span> {JSON.parse(event.foodOptions).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.isOpen
                            ? "bg-green-50 text-green-700"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {event.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => toggleOpen(event)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        event.isOpen
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {event.isOpen ? "Close Bookings" : "Open Bookings"}
                    </button>
                    <button
                      onClick={() => startEditing(event)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <a
                      href={`/admin/events/${event.id}`}
                      className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors"
                    >
                      Guest List
                    </a>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
