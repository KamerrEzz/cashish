"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin top bar while an in-app soft navigation is in flight.
 * Prefer this over a global loading.js so the shell stays put and cached
 * pages can paint instantly without a full skeleton swap.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!url.pathname.startsWith("/app")) return;

      const nextKey = `${url.pathname}?${url.searchParams.toString()}`;
      const currentKey = `${window.location.pathname}?${window.location.search.slice(1)}`;
      if (nextKey === currentKey) return;

      setActive(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Safety: never leave the bar stuck if navigation is aborted.
      timerRef.current = setTimeout(() => setActive(false), 8000);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Cargando"
    >
      <div className="nav-progress-bar h-full w-1/3 bg-[var(--accent)]" />
    </div>
  );
}
