"use client";

import { useState, useEffect } from "react";

export function useUnreadMessages() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/messages/unread");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {}
    }

    fetch_();
    const interval = setInterval(fetch_, 60000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
