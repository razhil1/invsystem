"use client";

import { useSyncExternalStore } from "react";

/**
 * usePendingCount — shared pending-approvals count with a module-level cache.
 * Both AppSidebar and AppHeader use this; only ONE network request is made
 * and both components read from the same cached value. Refreshes every 20s.
 *
 * Uses useSyncExternalStore (React 18) for correct subscription semantics —
 * no setState-in-effect warnings, no render-during-render conflicts.
 */

interface CacheState {
  count: number;
  timestamp: number;
  loading: boolean;
}

let cache: CacheState = { count: 0, timestamp: 0, loading: false };
const subscribers = new Set<() => void>();

let pollTimer: ReturnType<typeof setInterval> | null = null;

function emit() {
  subscribers.forEach((fn) => fn());
}

async function fetchPendingCount() {
  if (cache.loading) return;
  cache = { ...cache, loading: true };
  emit();
  try {
    const res = await fetch("/api/transactions?status=PENDING&limit=500");
    if (!res.ok) return;
    const json = await res.json();
    const count = json.txns?.length ?? 0;
    cache = { count, timestamp: Date.now(), loading: false };
    emit();
  } catch {
    cache = { ...cache, loading: false };
    emit();
  }
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);

  // Start polling if this is the first subscriber
  if (subscribers.size === 1) {
    // If cache is stale (>5s old), refresh immediately
    if (Date.now() - cache.timestamp > 5000) {
      fetchPendingCount();
    }
    pollTimer = setInterval(fetchPendingCount, 20000);
  }

  return () => {
    subscribers.delete(callback);
    // Stop polling when no subscribers remain
    if (subscribers.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

function getSnapshot(): number {
  return cache.count;
}

// Server snapshot — return 0 (no pending on server)
function getServerSnapshot(): number {
  return 0;
}

export function usePendingCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Force a refresh of the pending count (e.g. after an approval action) */
export function refreshPendingCount() {
  fetchPendingCount();
}
