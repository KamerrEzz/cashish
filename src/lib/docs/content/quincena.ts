import type { DocsArticle } from "@/lib/docs/types";

export const quincenaArticle: DocsArticle = {
  slug: "quincena",
  title: "Quincena",
  description:
    "El ritual central de Cashish: veredicto de liquidez, runway y CTAs de pago a la TDC.",
  lead: "Quincena responde una sola pregunta: ¿te alcanza el efectivo hasta el próximo ciclo, con tus cortes y pagos de verdad?",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Es el hub del ritual de pago. Resume liquidez, obligaciones de tarjeta, suscripciones y proyección corta para darte un veredicto — no un dashboard genérico de “saldo total”.",
        },
        {
          type: "term",
          term: "Runway",
          definition:
            "Cuántos días (o hasta qué fecha) te dura la liquidez proyectada antes de un hueco, considerando ingresos y egresos del periodo.",
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
            "Abre Quincena desde la navegación principal o la tarjeta del inicio.",
            "Lee el veredicto: te alcanza, vas justo, o hay faltante.",
            "Revisa runway y los cargos que pesan (mínimo TDC, suscripciones, MSI).",
            "Si hay corte o pago cercano, usa el CTA de pagar mínimo o para evitar intereses.",
            "Opcional: pide al Asistente “Arma mi plan de quincena”.",
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
          headers: ["Señal", "Significado"],
          rows: [
            [
              "Veredicto",
              "Lectura de liquidez vs obligaciones del periodo (no es un score de crédito).",
            ],
            [
              "Pago mínimo",
              "Lo que debes cubrir para no caer en mora según el perfil de la TDC.",
            ],
            [
              "Sin intereses",
              "Monto sugerido (cierre del estado o deuda actual) para no generar intereses.",
            ],
            [
              "Deep links",
              "Los botones de pago llevan al detalle de la tarjeta con el modo preseleccionado.",
            ],
          ],
        },
        {
          type: "callout",
          kind: "tip",
          text: "Quincena y Flujo de caja comparten la misma lógica de proyección. Quincena es el ritual; Flujo es el horizonte extendido.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Día 12, corte el 15",
          text: "Tienes $6,200 líquidos y un mínimo de $1,800 el día 28. Netflix y Spotify restan $450 antes. El veredicto marca “vas justo”: alcanza el mínimo, pero pagar para evitar intereses dejaría el runway corto. Decides el mínimo hoy y mueves el resto al siguiente ingreso.",
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
            "Mantén fechas de corte y pago actualizadas en el perfil de la TDC.",
            "Registra ingresos planeados: sin ellos el veredicto subestima tu runway.",
            "Después de pagar desde Quincena, vuelve a la vista: el veredicto se actualiza con el nuevo saldo.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/cuentas", label: "Cuentas" },
};
