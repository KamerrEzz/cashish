/** Normalize merchant strings for matching / subscription suggestions. */
export function merchantKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 64);
  return key || null;
}

export function fingerprintImportRow(input: {
  occurredOn: string;
  amountCents: number;
  type: string;
  merchant?: string | null;
  description?: string | null;
}): string {
  const parts = [
    input.occurredOn,
    String(input.amountCents),
    input.type,
    merchantKey(input.merchant) ?? "",
    (input.description ?? "").trim().toLowerCase().slice(0, 80),
  ];
  return parts.join("|");
}
