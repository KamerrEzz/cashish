"use client";

import { useState } from "react";
import { savePushSubscription } from "@/app/actions/push";
import { btnPrimary } from "@/components/ui";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushEnableButton() {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!vapid) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Configura{" "}
        <code className="text-[var(--ink)]">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>{" "}
        para activar avisos push.
      </p>
    );
  }

  async function onEnable() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMessage("Este navegador no soporta notificaciones.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage("Push no disponible en este navegador.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permiso denegado.");
        setBusy(false);
        return;
      }

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.register("/sw.js");
        } catch {
          setMessage(
            "Registra un service worker en /sw.js para completar el alta push.",
          );
          setBusy(false);
          return;
        }
      }
      const ready = await navigator.serviceWorker.ready;
      const sub = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });

      const json = sub.toJSON();
      const formData = new FormData();
      formData.set("endpoint", json.endpoint ?? "");
      formData.set("p256dh", json.keys?.p256dh ?? "");
      formData.set("auth", json.keys?.auth ?? "");

      const result = await savePushSubscription(formData);
      setMessage(result.ok ? "Avisos push activados." : result.error);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al activar push");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={btnPrimary}
        disabled={busy}
        onClick={onEnable}
      >
        Activar avisos push
      </button>
      {message ? (
        <p className="text-sm text-[var(--muted)]">{message}</p>
      ) : null}
    </div>
  );
}
