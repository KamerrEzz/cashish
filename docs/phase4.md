# Fase 4 — checklist (quincena OS)

Smoke manual / doc checklist. Playwright público en `e2e/smoke.spec.ts` + `e2e/quincena-nav.spec.ts`.

## Q1 — Ritual quincena

- [ ] Nav primary muestra **Quincena** → `/app/quincena`
- [ ] Dashboard card “Tu quincena” enlaza a `/app/quincena`
- [ ] Veredicto + runway + CTA pago deep-link `?pay=avoid_interest|minimum`
- [ ] SmartPayForm resalta ritual y, al pagar, link a `/app/quincena`
- [ ] `/app/cashflow` muestra runway arriba

## Q2 — Onboarding

- [ ] Migración `onboarding_completed_at` aplicada
- [ ] Proyecto sin cuentas + perfil sin flag → redirect `/app/onboarding`
- [ ] Wizard 3 pasos (liquidez, TDC, ingreso) → completa y va a `/app/quincena`
- [ ] Dashboard empty states enlazan a onboarding

## Q3 — Agente

- [ ] Tool `cashish_quincena_plan` en MCP / asistente
- [ ] CTA “Arma mi plan de quincena” en chat
- [ ] Action cards confirman con `payCreditCardSmart`

## Q4 — Retención

- [ ] Emails `payment_due` / `cashflow_shortfall`: subject “Tu quincena” + Hub URL
- [ ] Landing: brand dominante + headline quincena/crédito + CTA Entrar
- [ ] `loading.tsx` / `error.tsx` bajo `/app`

## Automatizado

```bash
npx tsc --noEmit
npm test
```
