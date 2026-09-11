import { parseMxnInput } from "@/lib/money";
import { fingerprintImportRow, merchantKey } from "@/lib/merchant";

export type ParsedImportLine = {
  occurredOn: string;
  amountCents: number;
  type: "expense" | "income";
  merchant: string | null;
  description: string | null;
  category: string | null;
  fingerprint: string;
  raw: Record<string, string>;
};

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const DATE_ALIASES = [
  "fecha",
  "date",
  "fecha_operacion",
  "fecha_de_operacion",
  "posted",
  "transaction_date",
];
const DESC_ALIASES = [
  "descripcion",
  "description",
  "concepto",
  "detalle",
  "memo",
  "narration",
];
const MERCHANT_ALIASES = ["comercio", "merchant", "establecimiento", "payee"];
const AMOUNT_ALIASES = ["monto", "amount", "importe", "cargo", "abono", "valor"];
const DEBIT_ALIASES = ["cargo", "retiro", "debit", "cargos"];
const CREDIT_ALIASES = ["abono", "deposito", "credit", "abonos"];
const CATEGORY_ALIASES = ["categoria", "category", "rubro"];

function pick(row: Record<string, string>, aliases: string[]): string | null {
  for (const a of aliases) {
    if (row[a] != null && String(row[a]).trim() !== "") return String(row[a]).trim();
  }
  return null;
}

function parseDateLoose(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (mdy) {
    let d = Number(mdy[1]);
    let m = Number(mdy[2]);
    let y = Number(mdy[3]);
    // MX often DD/MM/YYYY
    if (d > 12 && m <= 12) {
      /* d=day m=month */
    } else if (m > 12 && d <= 12) {
      const t = d;
      d = m;
      m = t;
    } else {
      // Prefer DD/MM
      /* keep */
    }
    if (y < 100) y += 2000;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

function parseAmountCell(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.\-]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  try {
    // MX: 1.234,56 or 1234.56 or -229.50
    let normalized = cleaned;
    if (cleaned.includes(",") && cleaned.includes(".")) {
      if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
        normalized = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = cleaned.replace(/,/g, "");
      }
    } else if (cleaned.includes(",")) {
      normalized = cleaned.replace(",", ".");
    }
    return parseMxnInput(normalized).amount;
  } catch {
    return null;
  }
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    if ((ch === ";" || ch === "\t") && !inQuotes && out.length === 0 && !line.includes(",")) {
      // fall through — handle below
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const counts = {
    ",": (headerLine.match(/,/g) ?? []).length,
    ";": (headerLine.match(/;/g) ?? []).length,
    "\t": (headerLine.match(/\t/g) ?? []).length,
  };
  if (counts[";"] > counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] > counts[","] && counts["\t"] >= counts[";"]) return "\t";
  return ",";
}

function splitLine(line: string, delim: "," | ";" | "\t"): string[] {
  if (delim === ",") return splitCsvLine(line);
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delim && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseBankCsv(text: string): ParsedImportLine[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delim = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delim).map(normalizeHeader);
  const rows: ParsedImportLine[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitLine(lines[i], delim);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });

    const dateRaw = pick(row, DATE_ALIASES);
    if (!dateRaw) continue;
    const occurredOn = parseDateLoose(dateRaw);
    if (!occurredOn) continue;

    const debit = pick(row, DEBIT_ALIASES);
    const credit = pick(row, CREDIT_ALIASES);
    let amountCents: number | null = null;
    let type: "expense" | "income" = "expense";

    if (debit || credit) {
      const d = debit ? parseAmountCell(debit) : null;
      const c = credit ? parseAmountCell(credit) : null;
      if (d && d !== 0) {
        amountCents = Math.abs(d);
        type = "expense";
      } else if (c && c !== 0) {
        amountCents = Math.abs(c);
        type = "income";
      }
    } else {
      const amountRaw = pick(row, AMOUNT_ALIASES);
      if (!amountRaw) continue;
      const parsed = parseAmountCell(amountRaw);
      if (parsed == null || parsed === 0) continue;
      // Signed bank convention: negative = expense, positive = income.
      // Explicit tipo overrides when present.
      const tipo = (row.tipo ?? row.type ?? "").toLowerCase();
      if (tipo.includes("cargo") || tipo.includes("retiro") || tipo.includes("debit")) {
        amountCents = Math.abs(parsed);
        type = "expense";
      } else if (
        tipo.includes("abono") ||
        tipo.includes("deposito") ||
        tipo.includes("credit")
      ) {
        amountCents = Math.abs(parsed);
        type = "income";
      } else if (parsed < 0) {
        amountCents = Math.abs(parsed);
        type = "expense";
      } else {
        amountCents = Math.abs(parsed);
        type = "income";
      }
    }

    if (amountCents == null || amountCents <= 0) continue;

    const merchant = pick(row, MERCHANT_ALIASES);
    const description = pick(row, DESC_ALIASES);
    const category = pick(row, CATEGORY_ALIASES);
    const fingerprint = fingerprintImportRow({
      occurredOn,
      amountCents,
      type,
      merchant,
      description,
    });

    rows.push({
      occurredOn,
      amountCents,
      type,
      merchant: merchant ?? (description ? description.slice(0, 80) : null),
      description,
      category,
      fingerprint,
      raw: row,
    });
  }

  return rows;
}

/** Minimal OFX / QFX bank transaction extract. */
export function parseOfx(text: string): ParsedImportLine[] {
  const rows: ParsedImportLine[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const block of blocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return m?.[1]?.trim() ?? null;
    };
    const trnamt = get("TRNAMT");
    const dtposted = get("DTPOSTED");
    const name = get("NAME") ?? get("PAYEE");
    const memo = get("MEMO");
    if (!trnamt || !dtposted) continue;
    const amount = Number(trnamt.replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0) continue;
    const y = dtposted.slice(0, 4);
    const m = dtposted.slice(4, 6);
    const d = dtposted.slice(6, 8);
    if (y.length !== 4) continue;
    const occurredOn = `${y}-${m}-${d}`;
    const amountCents = Math.round(Math.abs(amount) * 100);
    const type: "expense" | "income" = amount < 0 ? "expense" : "income";
    const fingerprint = fingerprintImportRow({
      occurredOn,
      amountCents,
      type,
      merchant: name,
      description: memo,
    });
    rows.push({
      occurredOn,
      amountCents,
      type,
      merchant: name,
      description: memo,
      category: null,
      fingerprint,
      raw: { trnamt, dtposted, name: name ?? "", memo: memo ?? "" },
    });
  }
  return rows;
}

export function parseBankFile(filename: string, text: string): {
  format: "csv" | "ofx";
  lines: ParsedImportLine[];
} {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx") || text.includes("<OFX>")) {
    return { format: "ofx", lines: parseOfx(text) };
  }
  return { format: "csv", lines: parseBankCsv(text) };
}

export { merchantKey, fingerprintImportRow };
