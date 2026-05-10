"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

type Comment = {
  id: string;
  message: string;
  userName: string;
  userRole: string;
  createdAt: string;
};

export function DocumentComments({ documentId }: { documentId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/comments`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setComments)
      .catch(() => {});
  }, [documentId]);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const comment = await res.json();
        // Re-fetch to get the joined data
        const refreshed = await fetch(`/api/documents/${documentId}/comments`);
        if (refreshed.ok) setComments(await refreshed.json());
        setMessage("");
      }
    } catch {
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Commentaires ({comments.length})
      </p>

      {comments.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="text-sm p-2 rounded bg-muted/30">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">{c.userName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {c.userRole === "CLIENT" ? "Client" : "Cabinet"}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(c.createdAt).toLocaleDateString("fr-CA", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-xs mt-0.5">{c.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ajouter un commentaire..."
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="h-8 w-8 shrink-0"
        >
          <Send className="size-3" />
        </Button>
      </div>
    </div>
  );
}
