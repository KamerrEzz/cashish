import type { DocsArticle } from "@/lib/docs/types";

export const movimientosArticle: DocsArticle = {
  slug: "movimientos",
  title: "Movimientos",
  description:
    "Captura, filtra, busca y exporta el historial de transacciones del proyecto.",
  lead: "Movimientos es el libro diario: cada cargo, abono o ajuste queda atado a una cuenta y, si aplica, a una categoría.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "La lista filtrable del ledger activo. Sirve para capturar a mano, revisar imports, buscar un comercio y exportar CSV cuando necesitas una hoja de cálculo.",
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
            "Abre Movimientos en la navegación principal.",
            "Filtra por cuenta, tipo o rango de fechas.",
            "Crea un movimiento nuevo con monto, cuenta, fecha y nota.",
            "Usa la búsqueda para localizar comercios o descripciones.",
            "Exporta CSV si quieres trabajar fuera de Cashish.",
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
          headers: ["Pieza", "Detalle"],
          rows: [
            [
              "Monto",
              "Se guarda en la moneda de la cuenta (decimales según MXN/COP/PEN; CLP entero).",
            ],
            [
              "Cuenta",
              "Define si el movimiento afecta liquidez o deuda TDC.",
            ],
            [
              "Paginación",
              "Listas largas se cargan por páginas para mantener la vista rápida.",
            ],
            [
              "Proyecto",
              "Solo ves movimientos del proyecto activo; Personal y otros no se mezclan.",
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
          title: "Cargo de supermercado",
          text: "Registras $842.30 en “TDC Oro”, categoría Despensa, fecha de hoy. La deuda de la tarjeta sube; la liquidez no cambia. Si hubiera sido débito, bajaría el saldo de esa cuenta.",
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
            "Prefiere importar extractos cuando hay muchos cargos; captura manual para excepciones.",
            "Las notas y el merchant ayudan al Asistente y a las sugerencias de suscripción.",
            "Viewer del proyecto puede ver movimientos pero no crearlos.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/transferencias", label: "Transferencias" },
};

export const transferenciasArticle: DocsArticle = {
  slug: "transferencias",
  title: "Transferencias",
  description:
    "Mueve saldo entre cuentas del mismo proyecto y registra pagos a la TDC.",
  lead: "Una transferencia enlaza origen y destino: baja en una cuenta y sube (o baja deuda) en la otra, en un solo acto del ledger.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "No es SPEI real: es el asiento contable que refleja que moviste dinero — de nómina a ahorros, o de débito hacia la tarjeta para pagar el corte.",
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
            "Desde el detalle de una cuenta, inicia una transferencia o un pago TDC.",
            "Elige origen (liquidez) y destino.",
            "Para TDC, elige mínimo, evitar intereses o monto libre.",
            "Confirma: se crean los movimientos enlazados.",
            "Revisa Quincena o el detalle de la tarjeta para ver el efecto.",
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
          headers: ["Caso", "Efecto"],
          rows: [
            [
              "Liquidez → liquidez",
              "Sale de una cuenta no-TDC y entra a otra. Liquidez total igual.",
            ],
            [
              "Liquidez → TDC",
              "Baja liquidez y baja deuda. Es un pago de tarjeta.",
            ],
            [
              "Misma moneda",
              "Las transferencias respetan la moneda de cada cuenta; no hay FX automático.",
            ],
          ],
        },
        {
          type: "callout",
          kind: "tip",
          text: "Para pagos de tarjeta, usa los modos inteligentes del detalle TDC o los CTAs de Quincena: calculan el monto por ti.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Pago del corte",
          text: "Transfieres $7,450 de “Nómina” a “TDC Oro” en modo evitar intereses. Nómina queda en $6,750; la deuda de la TDC baja $7,450. Quincena actualiza runway y veredicto.",
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
            "No uses un movimiento suelto para “simular” un pago TDC: la transferencia mantiene el enlace correcto.",
            "Si manejas dos monedas, crea el pago solo entre cuentas compatibles con tu realidad bancaria.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/suscripciones", label: "Suscripciones" },
};

export const suscripcionesArticle: DocsArticle = {
  slug: "suscripciones",
  title: "Suscripciones",
  description:
    "Cargos recurrentes, próxima facturación y su peso en flujo y quincena.",
  lead: "Las suscripciones son egresos que se repiten. Cashish las proyecta en el flujo y te ayuda a detectarlas a partir de movimientos.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Un registro de servicios o cobros periódicos atados a una cuenta, con monto, frecuencia y próxima fecha de cargo.",
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
            "Abre Suscripciones (menú Más).",
            "Crea una: nombre, monto, frecuencia, cuenta y próxima fecha.",
            "Activa o pausa con el interruptor cuando canceles el servicio.",
            "Revisa sugerencias si Cashish detecta patrones por comercio.",
            "Edita el monto cuando el proveedor lo suba.",
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
          headers: ["Pieza", "Detalle"],
          rows: [
            [
              "Frecuencia",
              "Semanal, mensual o anual — se expande en el forecast.",
            ],
            [
              "Cuenta",
              "Define si el cargo futuro pega a liquidez o a TDC.",
            ],
            [
              "Sugerencias",
              "Agrupa movimientos por merchant_key y propone suscripciones faltantes.",
            ],
            [
              "Cron",
              "Las vencidas pueden avanzar next_billing_on automáticamente.",
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
          title: "Stack mensual",
          text: "Spotify $129, iCloud $49, gym $799 en la misma TDC. En Flujo aparecen como tres egresos el día de cobro; en Quincena suman al peso del periodo.",
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
            "Pausa en lugar de borrar si el servicio vuelve en temporada.",
            "Alinea la fecha de cobro con el extracto real para que el runway no mienta.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/avisos", label: "Avisos" },
};

export const avisosArticle: DocsArticle = {
  slug: "avisos",
  title: "Avisos",
  description:
    "Recordatorios de corte, pago, suscripciones y faltantes de liquidez.",
  lead: "Los avisos te empujan a actuar antes del día D: un corte, un mínimo, o un hueco de liquidez proyectado.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Bandeja de recordatorios del proyecto. Algunos nacen del ciclo de crédito y del flujo; tú puedes descartarlos cuando ya los atendiste.",
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
            "Abre Avisos o revisa la tarjeta en el inicio.",
            "Lee título, cuerpo y fecha objetivo.",
            "Actúa (pagar TDC, ajustar flujo, etc.).",
            "Descarta el aviso cuando ya no aplique.",
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
          items: [
            "Cortes y fechas de pago de TDC generan recordatorios.",
            "Un shortfall de flujo puede insertar un aviso de liquidez.",
            "Suscripciones próximas también pueden avisar.",
            "Descartar no borra el evento financiero; solo limpia la bandeja.",
          ],
        },
        {
          type: "callout",
          kind: "note",
          text: "Si configuraste push en Agentes (VAPID), algunos avisos pueden llegar al dispositivo. Sin esa config, viven solo en la app.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Aviso de pago",
          text: "“Pago TDC Oro — evita intereses” para el día 28. Abres el enlace, pagas desde nómina y descartas el aviso. El inicio deja de mostrarlo en la cola urgente.",
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
            "No ignores shortfalls: suelen ser el mismo problema que Quincena marca en rojo.",
            "Mantén el perfil TDC al día para que las fechas de aviso coincidan con el banco.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/flujo", label: "Flujo de caja" },
};
