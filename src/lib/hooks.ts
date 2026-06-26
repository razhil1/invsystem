"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * useFetch — lightweight data fetching with manual refresh.
 * Re-fetches whenever the URL or any dep changes.
 */
export function useFetch<T>(url: string | null, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  const run = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      if (seq === seqRef.current) setData(json);
    } catch (e) {
      if (seq === seqRef.current) setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
     
  }, [url]);

  useEffect(() => {
    run();
     
  }, [url, ...deps]);

  return { data, loading, error, refresh: run };
}

export function formatMoney(n: number, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat("en-SG", { maximumFractionDigits: digits }).format(n);
}

export function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
