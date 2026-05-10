"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeadlineAction({
  deadlineId,
  status,
}: {
  deadlineId: string;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (status !== "UPCOMING" && status !== "IN_PROGRESS") {
    return null;
  }

  async function handleMarkFiled() {
    setLoading(true);
    try {
      const res = await fetch(`/api/fiscal/${deadlineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FILED" }),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleMarkFiled}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <>
          <CheckCircle className="size-3.5 mr-1" />
          Marquer produit
        </>
      )}
    </Button>
  );
}
