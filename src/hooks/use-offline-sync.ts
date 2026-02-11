"use client";

import { useEffect, useCallback } from "react";
import { useOnlineStatus } from "./use-online-status";

const QUEUE_KEY = "checkin-queue";

interface QueuedCheckIn {
  bookingId: number;
  timestamp: string;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();

  const queueCheckIn = useCallback((bookingId: number) => {
    const queue = getQueue();
    // Avoid duplicates
    if (!queue.some((item) => item.bookingId === bookingId)) {
      queue.push({ bookingId, timestamp: new Date().toISOString() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  }, []);

  const syncQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queue),
      });

      if (res.ok) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
      }
    } catch (e) {
      console.error("Failed to sync check-in queue:", e);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  return { queueCheckIn, syncQueue, pendingCount: getQueue().length };
}

function getQueue(): QueuedCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
