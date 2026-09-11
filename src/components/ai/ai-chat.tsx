"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { btnPrimary, inputClass } from "@/components/ui";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolHint?: string | null;
};

export function AiChat({
  conversationId,
  initialMessages,
}: {
  conversationId: string | null;
  initialMessages: { id: string; role: string; content: string }[];
}) {
  const [messages, setMessages] = useState<Msg[]>(
    initialMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState(conversationId);
  const [toolHint, setToolHint] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, toolHint]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    setToolHint(null);

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeId,
        message: question,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      const fallback =
        body.code === "missing_ai_key"
          ? body.error
          : body.error || "No se pudo responder. Revisa tu clave en Agentes.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: String(fallback),
        },
      ]);
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistant = "";
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.replace(/^data: /, "").trim();
        if (!line) continue;
        try {
          const json = JSON.parse(line) as {
            token?: string;
            conversationId?: string;
            done?: boolean;
            error?: string;
            tool?: { name: string; status: string };
          };
          if (json.conversationId && json.conversationId !== activeId) {
            setActiveId(json.conversationId);
            window.history.replaceState(
              null,
              "",
              `/app/ai/${json.conversationId}`,
            );
          }
          if (json.tool) {
            setToolHint(
              json.tool.status === "start"
                ? `Usando ${json.tool.name}…`
                : null,
            );
          }
          if (json.error) {
            assistant = json.error;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistant } : m,
              ),
            );
          }
          if (json.token) {
            assistant += json.token;
            const snapshot = assistant;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: snapshot } : m,
              ),
            );
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }
    setToolHint(null);
    setBusy(false);
  }

  return (
    <div className="flex min-h-[28rem] flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Pregunta por tus finanzas
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              El asistente consulta tus cuentas, TDC, movimientos y suscripciones
              con tools — no inventa saldos.
            </p>
            <ul className="mt-4 space-y-1 text-left text-sm text-[var(--muted)]">
              <li>· ¿Cuánto debo en tarjetas?</li>
              <li>· ¿Qué suscripciones cobran este mes?</li>
              <li>· Resume mis gastos de la semana</li>
            </ul>
          </div>
        ) : null}
        {messages.map((m) => (
          <article
            key={m.id}
            className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                : "bg-[var(--wash)] text-[var(--ink)]"
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </article>
        ))}
        {toolHint ? (
          <p className="text-xs text-[var(--muted)]">{toolHint}</p>
        ) : null}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={send}
        className="flex flex-col gap-2 border-t border-[var(--line)] p-3 sm:flex-row sm:items-end sm:p-4"
      >
        <textarea
          className={`${inputClass} min-h-[44px] flex-1 resize-none`}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={busy}
        />
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Pensando…" : "Enviar"}
        </button>
      </form>
      {!conversationId && activeId ? (
        <p className="px-4 pb-3 text-xs text-[var(--muted)]">
          Conversación guardada ·{" "}
          <Link href={`/app/ai/${activeId}`} className="text-[var(--accent)]">
            enlace permanente
          </Link>
        </p>
      ) : null}
    </div>
  );
}
