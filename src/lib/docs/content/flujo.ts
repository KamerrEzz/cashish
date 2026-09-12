import type { DocsArticle } from "@/lib/docs/types";

export const flujoArticle: DocsArticle = {
  slug: "flujo",
  title: "Flujo de caja",
  description:
    "Proyección de liquidez con ingresos planeados, suscripciones, mínimos TDC y MSI.",
  lead: "El flujo mira hacia adelante: suma lo que entra, resta lo que sale, y avisa el primer día en que el saldo proyectado se vuelve negativo.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Es el motor de proyección del proyecto. Parte de tu liquidez actual (cuentas no-TDC) y simula eventos en un horizonte de días — útil para ver si un MSI o un mínimo te dejan sin aire.",
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
            "Abre Flujo desde el menú Más o desde la tarjeta del inicio.",
            "Revisa el runway y si hay faltante (shortfall).",
            "Agrega ingresos planeados (nómina, freelance, etc.).",
            "Registra planes MSI si tienes meses sin intereses activos.",
            "Ajusta suscripciones y perfil TDC: alimentan la misma proyección.",
          ],
        },
      ],
    },
    {
      id: "como-funciona",
      title: "Cómo funciona",
      blocks: [
        {
          type: "list",
          title: "Entradas del motor",
          items: [
            "Liquidez inicial (suma de cuentas que no son TDC).",
            "Ingresos planeados (planned inflows).",
            "Suscripciones activas.",
            "Obligaciones TDC (mínimo en fecha de pago).",
            "Planes MSI (cuotas mensuales restantes).",
          ],
        },
        {
          type: "table",
          headers: ["Regla", "Detalle"],
          rows: [
            [
              "Horizonte",
              "Días desde la fecha de referencia (timezone México en la app).",
            ],
            [
              "Recurrentes",
              "Se expanden weekly / monthly / yearly dentro del horizonte.",
            ],
            [
              "Shortfall",
              "Si el saldo proyectado cruza a negativo: fecha del primer hueco y peor déficit.",
            ],
            [
              "MSI",
              "Cuota = total ÷ meses (redondeo hacia arriba). Entran hasta agotar meses restantes.",
            ],
          ],
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Hueco a 22 días",
          text: "Liquidez $9,000, ingreso el día 15 de $12,000, mínimo TDC $2,400 el día 8, MSI $1,850 el día 10 y suscripciones $890. El forecast marca shortfall alrededor del día 10–12 si no adelantas liquidez o mueves el MSI.",
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
            "Quincena muestra un recorte del mismo pensamiento; Flujo es el mapa completo.",
            "Un aviso de shortfall puede crearse automáticamente cuando el cron detecta el hueco.",
            "No mezcles monedas en la cabeza: cada cuenta proyecta en su moneda; el UI agrupa con cuidado.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/presupuestos", label: "Presupuestos" },
};
