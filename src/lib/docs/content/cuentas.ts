import type { DocsArticle } from "@/lib/docs/types";

export const cuentasArticle: DocsArticle = {
  slug: "cuentas",
  title: "Cuentas",
  description:
    "Tipos de cuenta, liquidez frente a TDC, monedas y el detalle de cada ledger.",
  lead: "Cada cuenta es una línea del ledger: efectivo, débito, ahorros o tarjeta de crédito, cada una con su propia moneda.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Cuentas es el inventario de dónde vive tu dinero y tu deuda. Las no-TDC suman liquidez; las TDC muestran lo que debes, el límite y el ciclo de crédito.",
        },
      ],
    },
    {
      id: "camino-rapido",
      title: "Camino rápido",
      blocks: [
        {
          type: "steps",
          items: [
            "Ve a Cuentas → Nueva cuenta.",
            "Elige tipo, nombre, moneda y saldo inicial (o deuda inicial si es TDC).",
            "En una TDC, completa límite, corte, pago y pago mínimo.",
            "Abre el detalle para ver movimientos, pagar o editar el perfil.",
            "Archiva cuentas que ya no uses; no borra el historial del proyecto.",
          ],
        },
      ],
    },
    {
      id: "como-funciona",
      title: "Cómo funciona",
      blocks: [
        {
          type: "table",
          headers: ["Tipo", "Cómo se lee el saldo"],
          rows: [
            ["Efectivo", "Dinero en mano. Cuenta como liquidez."],
            ["Débito / cheques", "Saldo bancario disponible. Liquidez."],
            ["Ahorros", "Reserva. También es liquidez para el forecast."],
            [
              "Tarjeta de crédito",
              "El saldo es deuda (lo que debes). Disponible = límite − deuda.",
            ],
          ],
        },
        {
          type: "callout",
          kind: "warn",
          title: "No es un banco",
          text: "Cashish no mueve dinero real. Los saldos reflejan lo que registras o importas; son tu libro, no la app de tu banco.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Dos cuentas, una moneda",
          text: "“Nómina BBVA” (débito, MXN, $14,200) y “BBVA Oro” (TDC, límite $40,000, debes $9,800 → disponible $30,200). En el inicio ves liquidez $14,200 y deuda TDC $9,800 por separado — nunca sumados como un solo “patrimonio” engañoso.",
        },
      ],
    },
    {
      id: "tips",
      title: "Tips",
      blocks: [
        {
          type: "list",
          items: [
            "Una cuenta = una moneda. Si manejas pesos y soles, crea cuentas distintas.",
            "Renombra con claridad (“Efectivo casa”, “TDC Amazon”) para el Asistente y los filtros.",
            "El detalle de TDC es el lugar para cortes y pagos inteligentes — ver la guía de Tarjeta de crédito.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/tdc", label: "Tarjeta de crédito" },
};
