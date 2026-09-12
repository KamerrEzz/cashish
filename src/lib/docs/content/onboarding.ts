import type { DocsArticle } from "@/lib/docs/types";

export const onboardingArticle: DocsArticle = {
  slug: "onboarding",
  title: "Onboarding",
  description:
    "Configura tu primer ledger: liquidez, tarjeta de crédito e ingreso de quincena.",
  lead: "Si el proyecto aún no tiene cuentas, Cashish te lleva por tres pasos para que la quincena tenga sentido desde el día uno.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "El onboarding no es un tour genérico: arma el mínimo viable de tu ledger. Al terminar, ya puedes ver un veredicto de quincena con liquidez, deuda TDC e ingreso planeado.",
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
            "Crea o entra a tu cuenta. Signup genera el proyecto Personal.",
            "Si no hay cuentas y el perfil no está marcado como listo, la app redirige a /app/onboarding.",
            "Paso 1 — Liquidez: una cuenta de efectivo, débito o ahorros con saldo inicial.",
            "Paso 2 — TDC: límite, fecha de corte y de pago, y deuda actual si aplica.",
            "Paso 3 — Ingreso: el monto que llega en la quincena (o el ciclo que uses).",
            "Al completar, vas a Quincena con el ritual listo.",
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
          headers: ["Pieza", "Para qué sirve"],
          rows: [
            [
              "Liquidez",
              "Cuentas que no son TDC. Su suma es el dinero disponible para pagar y gastar.",
            ],
            [
              "TDC",
              "Tarjeta con deuda, límite y ciclo de corte/pago. No se trata como saldo de débito.",
            ],
            [
              "Ingreso",
              "Entrada planeada que alimenta el veredicto de quincena y el flujo de caja.",
            ],
          ],
        },
        {
          type: "callout",
          kind: "note",
          text: "El proyecto Personal no se archiva. Es tu ledger base; después puedes crear otros (por ejemplo “Negocio” o “Gatos”).",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Primera quincena",
          text: "Tienes $8,400 en débito, una TDC con $12,000 de deuda y corte el día 15. Registras ingreso de $18,000 el día 1 y 16. Con eso Quincena puede decirte si el runway te alcanza antes de que llegue el pago.",
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
            "Usa montos reales aunque sean aproximados: el modelo mejora cuando ajustas, no cuando inventas ceros.",
            "Si saltaste el onboarding por error, crea las cuentas desde Cuentas; el vacío del dashboard te vuelve a enlazar.",
            "La moneda de cada cuenta se elige al crearla (MXN por defecto).",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/quincena", label: "Quincena" },
};
