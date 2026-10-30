"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSeedInvoices, readStoredInvoices, subscribeInvoices } from "@/lib/invoice-store";
import {
  answerFloorQuestion,
  buildFloorFacts,
  quickReplies,
  type FloorAction,
  type FloorReply,
  type FloorStock,
} from "@/lib/floor-assistant";
import type { Role } from "@/lib/types";

type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: FloorAction[];
};

export function FloorAssistantPanel({ role, stock }: { role: Role; stock: FloorStock[] }) {
  const invoices = useSyncExternalStore(subscribeInvoices, readStoredInvoices, getSeedInvoices);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const facts = useMemo(() => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    return buildFloorFacts(invoices, stock, today, role);
  }, [invoices, role, stock]);

  const shortcuts = quickReplies(facts);

  useEffect(() => {
    if (!open) return;
    field.current?.focus();
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, pending]);

  function pushReply(label: string, reply: FloorReply) {
    setTurns((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: label },
      { id: crypto.randomUUID(), role: "assistant", text: reply.answer, actions: reply.actions },
    ]);
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setQuestion("");
    const local = answerFloorQuestion(trimmed, facts);
    if (local) {
      pushReply(trimmed, local);
      return;
    }
    const userId = crypto.randomUUID();
    setTurns((current) => [...current, { id: userId, role: "user", text: trimmed }]);
    setPending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, facts }),
      });
      const payload = (await response.json()) as FloorReply & { error?: string };
      const reply: FloorReply = response.ok
        ? { answer: payload.answer, actions: payload.actions ?? [] }
        : {
            answer: "I can open a new invoice, read today's sales, or list what is for re-stock.",
            actions: [
              { label: "Create invoice", href: "/invoices", openDraft: true },
              { label: "Open dashboard", href: "/dashboard" },
              { label: "Open inventory", href: "/inventory" },
            ],
          };
      setTurns((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: reply.answer, actions: reply.actions },
      ]);
    } catch {
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I can open a new invoice, read today's sales, or list what is for re-stock.",
          actions: [
            { label: "Create invoice", href: "/invoices", openDraft: true },
            { label: "Open dashboard", href: "/dashboard" },
            { label: "Open inventory", href: "/inventory" },
          ],
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function go(action: FloorAction) {
    setOpen(false);
    if (action.invoiceStatus) {
      sessionStorage.setItem("gp-invoice-tab", action.invoiceStatus);
      if (pathname === "/invoices") window.dispatchEvent(new Event("gp-invoice-tab"));
    }
    if (action.openDraft) {
      sessionStorage.setItem("gp-open-new-draft", "1");
      if (pathname === "/invoices") {
        window.dispatchEvent(new Event("gp-open-new-draft"));
        return;
      }
    }
    router.push(action.href);
  }

  return (
    <div className="fixed right-4 bottom-4 z-20 flex flex-col items-end gap-3">
      {open ? (
        <section
          role="dialog"
          aria-label="Floor assistant"
          className="desk-card flex max-h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl shadow-[0_18px_50px_rgba(16,17,20,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium">Floor assistant</p>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
              Close
            </button>
          </div>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm leading-6 text-muted">
              Sales, low stock, or a new invoice.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip label="Create invoice" onClick={() => pushReply("Create invoice", shortcuts.invoice)} />
              <Chip label="Sales" onClick={() => pushReply("Sales", shortcuts.sales)} />
              <Chip label="Low stock" onClick={() => pushReply("Low stock", shortcuts.stock)} />
            </div>
            <div className="mt-4 grid gap-3">
              {turns.map((turn) => (
                <div key={turn.id} className={turn.role === "user" ? "justify-self-end" : ""}>
                  <p
                    className={`max-w-[18rem] rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-line ${
                      turn.role === "user" ? "bg-ink text-white" : "bg-paper text-ink"
                    }`}
                  >
                    {turn.text}
                  </p>
                  {turn.actions && turn.actions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {turn.actions.map((action) => (
                        <button
                          key={`${action.href}-${action.label}`}
                          type="button"
                          onClick={() => go(action)}
                          className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink hover:border-copper"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {pending ? <p className="text-sm text-muted">Reading the floor…</p> : null}
            </div>
          </div>
          <form
            className="flex gap-2 border-t border-line px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
          >
            <input
              ref={field}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about this floor"
              aria-label="Ask about this floor"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-white px-3 text-sm outline-none focus:border-copper focus:ring-4 focus:ring-copper/15"
            />
            <button
              type="submit"
              disabled={pending || !question.trim()}
              className="h-11 rounded-2xl bg-ink px-3 text-sm text-white disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-12 items-center rounded-full bg-ink px-4 text-sm text-white shadow-[0_10px_30px_rgba(16,17,20,0.25)]"
      >
        {open ? "Hide" : "Ask"}
      </button>
    </div>
  );
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink hover:border-copper"
    >
      {label}
    </button>
  );
}
