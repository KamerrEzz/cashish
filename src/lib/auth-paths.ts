/** Paths allowed after auth redirects (login, register, magic callback). */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  // Block protocol-relative and external-looking paths
  if (raw.includes("://") || raw.includes("\\")) return "/app";
  return raw;
}

/** Build PKCE email redirect. Use the current page origin so cookies match the host. */
export function authCallbackUrl(origin: string, nextPath: string): string {
  const base = origin.replace(/\/$/, "");
  const next = encodeURIComponent(safeNextPath(nextPath));
  return `${base}/auth/callback?next=${next}`;
}

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirma tu correo antes de entrar (revisa tu bandeja).";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Ese correo ya tiene cuenta. Entra o usa recuperar contraseña.";
  }
  if (m.includes("signup is disabled")) {
    return "El registro está desactivado por ahora.";
  }
  if (
    m.includes("rate limit") ||
    m.includes("email rate") ||
    m.includes("over_email_send_rate_limit")
  ) {
    return "Demasiados correos enviados. Espera un minuto e intenta de nuevo.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email")) {
    return "Ese correo no parece válido.";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("least"))) {
    return "La contraseña es demasiado corta o débil (mín. 6 caracteres).";
  }
  if (m.includes("otp") || m.includes("magic") || m.includes("error sending")) {
    return "No se pudo enviar el enlace. Revisa el correo o intenta con contraseña.";
  }
  return message;
}
