"use client";

import { useState, useEffect } from "react";

type StaffMember = { id: string; name: string; email: string; role: string };

export function AssignStaff({
  companyId,
  currentAssignedTo,
}: {
  companyId: string;
  currentAssignedTo: string | null;
}) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selected, setSelected] = useState(currentAssignedTo ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStaff)
      .catch(() => {});
  }, []);

  async function handleChange(value: string) {
    setSelected(value);
    setSaving(true);
    try {
      await fetch(`/api/clients/${companyId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: value || null }),
      });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground shrink-0">Assigné à :</label>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="text-sm border rounded-md px-2 py-1 bg-background"
      >
        <option value="">Non assigné</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.role === "ADMIN" ? "Admin" : "Comptable"})
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-muted-foreground">...</span>}
    </div>
  );
}
