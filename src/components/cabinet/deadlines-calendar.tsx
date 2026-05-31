"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import Link from "next/link";

type Deadline = {
  id: string;
  label: string;
  dueDate: string;
  status: string;
  companyName: string;
  companyId: string;
};

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  OVERDUE: "bg-red-500",
  FILED: "bg-green-500",
};

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  OVERDUE: "En retard",
  FILED: "Produit",
};

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export function DeadlinesCalendar({ deadlines }: { deadlines: Deadline[] }) {
  const today = new Date();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Group deadlines by date string "YYYY-MM-DD"
  const byDate = deadlines.reduce<Record<string, Deadline[]>>((acc, d) => {
    const key = d.dueDate.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedDeadlines = selectedDay ? (byDate[selectedDay] ?? []) : [];

  // List view: sort by date
  const listDeadlines = [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-muted transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-semibold w-36 text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-muted transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => setView("calendar")}
            className={`p-1.5 px-2.5 transition-colors ${view === "calendar" ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            <CalendarDays className="size-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 px-2.5 transition-colors ${view === "list" ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
          {/* Calendar grid */}
          <div className="rounded-xl border overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map((d) => (
                <div key={d} className="text-center py-2 text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Weeks */}
            {Array.from({ length: cells.length / 7 }, (_, w) => (
              <div key={w} className="grid grid-cols-7 border-b last:border-0">
                {cells.slice(w * 7, w * 7 + 7).map((day, i) => {
                  if (!day) return <div key={i} className="h-16 bg-muted/20" />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayDeadlines = byDate[dateStr] ?? [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDay;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                      className={`h-16 p-1 border-r last:border-0 text-left flex flex-col hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-muted" : ""
                      }`}
                    >
                      <span className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? "bg-foreground text-background" : ""
                      }`}>
                        {day}
                      </span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayDeadlines.slice(0, 3).map((d) => (
                          <span key={d.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[d.status] ?? "bg-gray-400"}`} />
                        ))}
                        {dayDeadlines.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{dayDeadlines.length - 3}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Side panel */}
          <div className="rounded-xl border p-4">
            {selectedDay ? (
              <>
                <p className="text-sm font-semibold mb-3">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {selectedDeadlines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune échéance</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDeadlines.map((d) => (
                      <Link key={d.id} href={`/clients/${d.companyId}?tab=echeances`} className="block p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR[d.status] ?? "bg-gray-400"}`} />
                          <p className="text-sm font-medium truncate">{d.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 pl-4">{d.companyName}</p>
                        <p className="text-[10px] text-muted-foreground pl-4">{STATUS_LABEL[d.status] ?? d.status}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <CalendarDays className="size-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Cliquez sur un jour pour voir les échéances</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // List view
        <div className="rounded-xl border divide-y">
          {listDeadlines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Aucune échéance</p>
            </div>
          ) : (
            listDeadlines.map((d) => {
              const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
              const urgent = daysLeft <= 7 && d.status !== "FILED";
              return (
                <Link key={d.id} href={`/clients/${d.companyId}?tab=echeances`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR[d.status] ?? "bg-gray-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium ${urgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {d.status === "FILED" ? "Produit" : daysLeft <= 0 ? "Aujourd'hui" : `${daysLeft}j`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.dueDate).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
