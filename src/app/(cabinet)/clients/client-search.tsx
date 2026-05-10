"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ClientSearch({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/clients?q=${encodeURIComponent(value.trim())}`);
    } else {
      router.push("/clients");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, NEQ ou courriel..."
          className="pl-9 h-9"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </form>
  );
}
