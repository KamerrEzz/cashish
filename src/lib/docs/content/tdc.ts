import type { DocsArticle } from "@/lib/docs/types";

export const tdcArticle: DocsArticle = {
  slug: "tdc",
  title: "Tarjeta de crédito",
  description:
    "Deuda frente a disponible, cortes, estados de cuenta y pagos mínimo o sin intereses.",
  lead: "Cashish trata la TDC como crédito de verdad: el saldo es lo que debes, no un “saldo positivo” de débito.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "El sistema de TDC cubre el perfil de la tarjeta (límite, corte, pago, mínimo), los periodos de estado de cuenta y los pagos desde una cuenta de liquidez.",
        },
        {
          type: "term",
          term: "Corte",
          definition:
            "Fecha en que cierra el periodo de cargos. A partir de ahí se genera (o cierras) un estado con saldo a pagar.",
        },
        {
          type: "term",
          term: "Disponible",
          definition: "Límite de crédito menos la deuda actual (balance).",
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
            "Abre la TDC desde Cuentas.",
            "Edita el perfil: límite, días de corte y pago, pago mínimo.",
            "Revisa el estado abierto; cierra el corte cuando corresponda.",
            "Paga con mínimo, evitar intereses o un monto personalizado.",
            "Marca el estado como pagado cuando el banco lo refleje.",
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
          headers: ["Concepto", "Regla en Cashish"],
          rows: [
            [
              "balance / deuda",
              "Lo que debes. Sube con cargos; baja con pagos.",
            ],
            [
              "Pago mínimo",
              "Obligación del ciclo según el perfil de la tarjeta.",
            ],
            [
              "Evitar intereses",
              "Usa el closing_balance del último estado cerrado si existe; si no, la deuda actual. Nunca menor que el mínimo.",
            ],
            [
              "Estados",
              "Periodos abiertos/cerrados: listar, cerrar corte, marcar pagado.",
            ],
          ],
        },
        {
          type: "callout",
          kind: "note",
          text: "Un pago a TDC es una transferencia desde una cuenta de liquidez hacia la tarjeta. Reduce deuda y liquidez al mismo tiempo.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Evitar intereses vs mínimo",
          text: "El estado cerrado muestra $7,450 a pagar; el mínimo es $1,120. “Sin intereses” sugiere $7,450. Si solo pagas el mínimo, sigues al corriente pero el resto genera intereses según tu banco — Cashish te muestra la diferencia para decidir con ojos abiertos.",
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
            "Actualiza el mínimo cuando el banco lo cambie; el forecast usa ese número.",
            "Cierra cortes a tiempo para que Quincena y Flujo usen el closing balance correcto.",
            "Desde Quincena puedes llegar directo al modo de pago recomendado.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/movimientos", label: "Movimientos" },
};
