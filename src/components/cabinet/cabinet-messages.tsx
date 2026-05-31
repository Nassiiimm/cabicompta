"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, MessageSquare, Building2, CheckCheck } from "lucide-react";

type Thread = {
  companyId: string;
  companyName: string | null;
  lastMessage: string;
  lastFromRole: string;
  lastAt: string;
  lastUserName: string | null;
  unread: number;
};

type Message = {
  id: string;
  message: string;
  fromRole: string;
  createdAt: string;
  userId: string;
  userName: string | null;
};

export function CabinetMessages({ currentUserId }: { currentUserId: string }) {
  const searchParams = useSearchParams();
  const preselectedCompany = searchParams.get("company");
  const preselectedName = searchParams.get("name");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(preselectedCompany);
  const [phantomName, setPhantomName] = useState<string | null>(preselectedName);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (res.ok) {
      const data = await res.json();
      setThreads(data.threads ?? []);
    }
    setLoadingThreads(false);
  }, []);

  const markRead = useCallback(async (companyId: string) => {
    await fetch(`/api/messages/${companyId}/read`, { method: "POST" });
    // Rafraîchir la liste pour mettre à jour les points bleus
    loadThreads();
  }, [loadThreads]);

  const loadMessages = useCallback(async (companyId: string, markAsRead = false) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/messages/${companyId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
    setLoadingMessages(false);
    if (markAsRead) markRead(companyId);
  }, [markRead]);

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 30000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    if (!selected) return;
    // Auto-marquer comme lu à l'ouverture
    loadMessages(selected, true);
    const interval = setInterval(() => loadMessages(selected), 15000);
    return () => clearInterval(interval);
  }, [selected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (res.ok) {
        setInput("");
        await Promise.all([loadMessages(selected), loadThreads()]);
      }
    } finally {
      setSending(false);
    }
  }

  const selectedThread = threads.find((t) => t.companyId === selected);
  const displayName = selectedThread?.companyName ?? phantomName ?? "Entreprise";

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-xl overflow-hidden">
      {/* Left — thread list */}
      <div className="w-72 shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold">Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="size-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune conversation</p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.companyId}
                onClick={() => setSelected(t.companyId)}
                className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 ${
                  selected === t.companyId ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm font-medium truncate">{t.companyName ?? "Entreprise"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.unread > 0 && (
                      <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(t.lastAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5 pl-5">
                  {t.lastFromRole === "CLIENT" ? "" : "Vous : "}
                  {t.lastMessage}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right — thread detail */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <MessageSquare className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Sélectionnez une conversation</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3 border-b flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="size-4 text-muted-foreground shrink-0" />
              <p className="font-semibold text-sm truncate">{displayName}</p>
            </div>
            <button
              onClick={() => selected && markRead(selected)}
              title="Marquer comme lu"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <CheckCheck className="size-4" />
              <span className="hidden sm:inline">Lu</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="size-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun message</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === currentUserId || msg.fromRole !== "CLIENT";
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-foreground text-background rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {!isMe && (
                        <p className="text-[10px] font-medium opacity-60 mb-1">{msg.userName ?? "Client"}</p>
                      )}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-background/50 text-right" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {new Date(msg.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 px-5 py-3 border-t">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Répondre au client…"
              maxLength={2000}
              className="flex-1 h-10 rounded-full border border-input bg-transparent px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="size-10 flex items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-30"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
