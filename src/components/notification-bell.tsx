"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, FileText, Receipt, CalendarClock, AlertTriangle } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

const ICONS: Record<string, typeof Bell> = {
  DOCUMENT: FileText,
  INVOICE: Receipt,
  DEADLINE: CalendarClock,
  SYSTEM: AlertTriangle,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications);
        setUnread(data.unreadCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((p) => Math.max(0, p - 1));
  };

  const markAll = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 size-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-lg border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-semibold">Notifications</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAll} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    Tout lire
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Aucune notification</p>
              ) : (
                items.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                      className={`flex gap-2.5 px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                    >
                      <Icon className={`size-3.5 mt-0.5 shrink-0 ${!n.read ? "text-foreground" : "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug ${!n.read ? "font-medium" : ""}`}>{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                      </div>
                      {!n.read && <div className="size-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
