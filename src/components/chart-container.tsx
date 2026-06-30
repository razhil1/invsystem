"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ChartContainer — ensures the container has non-zero dimensions before
 * rendering children (prevents Recharts width(0)/height(0) warnings).
 * Also provides a stable height to ResponsiveContainer.
 */
export function ChartContainer({
  height = 260,
  className,
  children,
}: {
  height?: number;
  className?: string;
  children: (dims: { width: number; height: number }) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDims({ width: rect.width, height: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ height, width: "100%" }}>
      {dims.width > 0 ? children(dims) : null}
    </div>
  );
}
