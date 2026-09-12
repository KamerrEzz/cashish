import type { DocsArticle } from "@/lib/docs/types";

export const presupuestosArticle: DocsArticle = {
  slug: "presupuestos",
  title: "Presupuestos",
  description:
    "Sobres mensuales por categoría comparados con el gasto real del mes.",
  lead: "Un presupuesto es un tope consciente: defines cuánto quieres gastar en una categoría y Cashish te muestra cuánto llevas.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Sobres (envelopes) del mes en curso. No bloquean cargos; te dan visibilidad para decidir antes de que el extracto te sorprenda.",
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
            "Abre Presupuestos.",
            "Crea un sobre: categoría y monto mensual.",
            "Categoriza movimientos para que el gasto cuente.",
            "Revisa el avance del mes.",
            "Elimina o ajusta sobres cuando cambie tu plan.",
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
            ["Mes", "El gasto se mide en el mes calendario actual del proyecto."],
            [
              "Categoría",
              "Debe coincidir con la categoría de los movimientos para sumar.",
            ],
            [
              "Alcance",
              "Por proyecto activo: el presupuesto de Personal no aplica a otro ledger.",
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
          title: "Sobre de comida",
          text: "Fijas $4,500 en Despensa. Llevas $3,120 a mitad de mes. El sobre muestra el resto; no impide gastar, pero Quincena y tu criterio ya saben el margen.",
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
            "Empieza con 3–5 categorías que duelen; no cubras todo el catálogo.",
            "Sin categoría en el movimiento, ese gasto no entra al sobre.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/analiticas", label: "Analíticas" },
};

export const analiticasArticle: DocsArticle = {
  slug: "analiticas",
  title: "Analíticas",
  description:
    "Resúmenes del mes: flujo, categorías, comercios, uso de crédito y señales.",
  lead: "Analíticas mira hacia atrás: qué pasó este mes, dónde se fue el dinero y cómo se comportó tu crédito.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Vistas de resumen del proyecto (y, si eres dueño de varios, un rollup). Complementa Quincena (adelante) con lectura del mes cerrado o en curso.",
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
            "Abre Analíticas.",
            "Revisa flujo del mes y desglose por categoría.",
            "Mira comercios top y utilización de crédito.",
            "Atiende señales accionables (si aparecen).",
            "Si tienes varios proyectos owned, revisa el rollup del dueño.",
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
            "Los totales respetan el proyecto activo salvo el rollup de dueño.",
            "Utilización de crédito = deuda / límite en TDC.",
            "Las señales destacan patrones útiles (no scores mágicos).",
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
          title: "Mes de viaje",
          text: "Categoría Viajes se come el 38% del egreso; utilización de TDC sube al 62%. La señal sugiere pagar hacia “sin intereses” antes del corte — enlazas a Quincena.",
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
            "Categoriza con constancia: sin eso, Analíticas solo ve “sin categoría”.",
            "Compara con Flujo: uno explica el pasado, el otro el hueco futuro.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/importar", label: "Importar" },
};

export const importarArticle: DocsArticle = {
  slug: "importar",
  title: "Importar",
  description:
    "Sube CSV u OFX, revisa el lote fila a fila y aplícalo a una cuenta.",
  lead: "Importar acelera el ledger cuando el banco ya tiene el historial: subes el archivo, curas el lote y confirmas.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Un flujo por lotes: archivo → revisión → aplicar a una cuenta del proyecto. Puedes rechazar filas que no quieras antes de confirmar.",
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
            "Ve a Importar y sube CSV u OFX.",
            "Abre el lote creado (/app/import/[batchId]).",
            "Revisa filas; rechaza las que no apliquen.",
            "Elige la cuenta destino y aplica.",
            "Verifica saldos y movimientos resultantes.",
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
          headers: ["Paso", "Detalle"],
          rows: [
            ["Parseo", "El archivo se convierte en filas pendientes del lote."],
            ["Curación", "Aceptas o rechazas antes de tocar saldos."],
            [
              "Aplicar",
              "Las filas aceptadas se convierten en movimientos de la cuenta elegida.",
            ],
            [
              "Permisos",
              "Un viewer no puede importar ni aplicar; solo lectura.",
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
          title: "Extracto de débito",
          text: "Subes el CSV de septiembre (42 filas). Rechazas 2 transferencias internas que ya registraste. Aplicas el resto a “Nómina BBVA”. El saldo del ledger se alinea con el banco.",
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
            "Importa a la cuenta correcta: un OFX de TDC no debe ir a débito.",
            "Si una fila duplica un movimiento manual, recházala.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/tickets", label: "Tickets" },
};

export const ticketsArticle: DocsArticle = {
  slug: "tickets",
  title: "Tickets",
  description:
    "Sube foto o PDF de un ticket, revisa el borrador con IA y confírmalo al ledger.",
  lead: "Tickets convierte un comprobante en un movimiento: subes el archivo, el modelo propone un borrador, tú confirmas.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Inbox de recibos (Storage receipts). Requiere tu clave de modelo (BYOK) para interpretar el documento. Nada entra al ledger hasta que confirmas.",
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
            "Configura BYOK en Agentes si aún no lo has hecho.",
            "Abre Tickets y sube foto o PDF.",
            "Espera el borrador (monto, comercio, fecha sugeridos).",
            "Corrige si hace falta y aplica a una cuenta.",
            "Descarta o reintenta si el parse falló.",
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
            "El archivo vive en el bucket de recibos del proyecto.",
            "El parse usa tu clave BYOK — Cashish no guarda un modelo propio para esto.",
            "Confirmar crea el movimiento; descartar limpia el borrador.",
            "Viewer: puede ver, no aplicar.",
          ],
        },
        {
          type: "callout",
          kind: "warn",
          text: "Sin clave de modelo, el parse no puede correr. Guárdala en Agentes antes de depender del inbox.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Ticket de farmacia",
          text: "Subes el PDF de $386.50. El borrador propone comercio “Farmacias del Ahorro” y fecha de hoy. Confirmas en la TDC. Aparece en Movimientos y sube la deuda.",
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
            "Fotos nítidas y sin recortes raros parsean mejor.",
            "Siempre revisa el monto: la IA ayuda, tú firmas el asiento.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/asistente", label: "Asistente" },
};

export const asistenteArticle: DocsArticle = {
  slug: "asistente",
  title: "Asistente",
  description:
    "Chat en español sobre tus finanzas reales, con tu propia clave de modelo (BYOK).",
  lead: "El Asistente no inventa saldos: llama a las mismas herramientas del ledger (dashboard, pagos, flujo) con el proyecto activo.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Un chat in-app. Tú traes la clave del proveedor (OpenAI u compatible); Cashish la cifra y solo la usa en el servidor. No hay RAG ni embeddings: el modelo actúa vía tools.",
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
            "Ve a Agentes → Clave de modelo (BYOK) y guarda proveedor + key.",
            "Abre Asistente (/app/ai).",
            "Pregunta en español: “¿cuánto debo en TDC?” o “arma mi plan de quincena”.",
            "Si propone una acción (pago), confirma en la tarjeta de acción.",
            "Cambia de proyecto en el switcher si quieres otro ledger.",
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
              "BYOK",
              "Clave por usuario, cifrada. Distinta de las claves MCP csh_…",
            ],
            [
              "Tools",
              "Misma capa que los agentes externos: lee y actúa sobre el proyecto activo.",
            ],
            [
              "Sin key",
              "La app te manda a Agentes a configurarla antes de chatear.",
            ],
            [
              "Temperatura baja",
              "Pensado para números y acciones, no para prosa creativa.",
            ],
          ],
        },
        {
          type: "callout",
          kind: "note",
          text: "Los agentes externos (Cursor, Claude Desktop, etc.) usan MCP con csh_…. El Asistente usa tu key de modelo. Son dos puertas distintas al mismo ledger.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Plan de quincena",
          text: "Escribes “¿me alcanza si pago para evitar intereses?”. El Asistente llama al dashboard y al plan de quincena, te resume el runway y te ofrece confirmar el pago sugerido.",
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
            "Sé específico con nombres de cuenta (“TDC Oro”) para menos ambigüedad.",
            "Revisa siempre las action cards antes de confirmar un pago.",
            "Para conectar Cursor u otro cliente, ve a la guía MCP.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/proyectos", label: "Proyectos" },
};

export const proyectosArticle: DocsArticle = {
  slug: "proyectos",
  title: "Proyectos",
  description:
    "Ledgers separados, roles (dueño, miembro, viewer) e invitaciones.",
  lead: "Un proyecto es un libro completo: cuentas, movimientos y TDC de “Personal” no se mezclan con “Negocio” o “Gatos”.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Aislamiento de ledger por proyecto, con switcher en el header, invitaciones por correo y roles de escritura o solo lectura.",
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
            "Abre Proyectos.",
            "Crea un ledger nuevo o quédate en Personal (no se archiva).",
            "Cambia el activo con el switcher del header.",
            "Invita a alguien como miembro o viewer (enlace 7 días).",
            "Archiva proyectos secundarios que ya no uses.",
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
          headers: ["Rol", "Puede"],
          rows: [
            ["Dueño", "Todo: editar, invitar, archivar (excepto Personal)."],
            ["Miembro", "Leer y escribir finanzas del proyecto."],
            [
              "Viewer",
              "Solo leer. Mensaje: “Solo lectura en este proyecto.”",
            ],
          ],
        },
        {
          type: "list",
          title: "También importa",
          items: [
            "Las claves MCP se crean atadas a un project_id.",
            "El Asistente opera siempre sobre el proyecto activo.",
            "BYOK es por usuario; el alcance de datos lo pone el proyecto.",
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
          title: "Ledger de mascotas",
          text: "Creas “Gatos”, una cuenta de gastos y suscripciones de alimento. En Personal la quincena no ve esos cargos. Invitas a tu pareja como viewer para que consulte sin editar.",
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
            "Antes de preguntarle al Asistente, mira qué proyecto está activo.",
            "No archives Personal: es el ledger base del signup.",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/monedas", label: "Monedas" },
};

export const monedasArticle: DocsArticle = {
  slug: "monedas",
  title: "Monedas",
  description:
    "MXN, COP, PEN y CLP por cuenta — sin conversión automática de divisas.",
  lead: "Cada cuenta tiene una moneda. Los montos viven ahí; Cashish no inventa un tipo de cambio para sumar peras con manzanas.",
  sections: [
    {
      id: "que-es",
      title: "Qué es",
      blocks: [
        {
          type: "paragraph",
          text: "Soporte multi-moneda a nivel cuenta: pesos mexicanos, colombianos, soles y pesos chilenos, con reglas de decimales distintas.",
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
            "Al crear una cuenta, elige la moneda (MXN por defecto).",
            "Captura montos con el formato de esa moneda.",
            "Mantén TDC y su liquidez de pago en la moneda que uses en la vida real.",
            "Revisa totales agrupados por moneda en vistas resumen.",
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
          headers: ["Moneda", "Precisión"],
          rows: [
            ["MXN", "Hasta 2 decimales (centavos)."],
            ["COP", "Hasta 2 decimales."],
            ["PEN", "Hasta 2 decimales."],
            ["CLP", "Enteros — sin centavos."],
          ],
        },
        {
          type: "callout",
          kind: "warn",
          text: "No hay motor FX. Si necesitas “todo en MXN”, convierte tú al registrar o mantén ledgers separados por moneda/realidad.",
        },
      ],
    },
    {
      id: "ejemplo",
      title: "Ejemplo",
      blocks: [
        {
          type: "example",
          title: "Viaje a Lima",
          text: "Creas “Efectivo PEN” para el viaje. Los gastos en soles no se suman al total MXN de nómina. Al volver, archivas o dejas el saldo residual sin forzar una conversión falsa.",
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
            "En MCP y Asistente, los montos van como string decimal según la moneda de la cuenta.",
            "CLP rechaza centavos: usa enteros (ej. \"15000\").",
          ],
        },
      ],
    },
  ],
  next: { href: "/docs/mcp", label: "MCP (agentes)" },
};
