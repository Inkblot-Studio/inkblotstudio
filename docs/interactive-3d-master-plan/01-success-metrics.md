# Success Metrics and Conversion Outcomes

## Objective

Position the studio as a premium, innovation-forward partner for enterprise buyers and convert high-intent visits into qualified conversations.

## KPI Framework

### 1) Business Outcome Metrics

- Qualified inbound opportunities per month: `>= 8` after launch stabilization.
- Discovery call booking rate from qualified visitors: `>= 12%`.
- Proposal request rate from discovery calls: `>= 35%`.
- Win-rate on enterprise opportunities sourced from the site: `>= 20%`.

### 2) Conversion Funnel Metrics

- Hero-to-CTA interaction rate (first meaningful action): `>= 40%`.
- Lead form completion rate (from CTA click): `>= 25%`.
- Demo reel or case-study deep-view rate: `>= 45%`.
- Returning visitor rate (30-day): `>= 18%`.

### 3) Engagement Quality Metrics

- Average engaged session duration: `>= 2m 30s`.
- Scroll depth to proof/case section: `>= 60%`.
- Case-study interaction completion (story modules viewed): `>= 50%`.
- Branded search lift after launch (90 days): `+20%`.

### 4) Performance Guardrail Metrics

- Largest Contentful Paint (p75 mobile): `<= 2.5s`.
- Interaction to Next Paint (p75): `<= 200ms`.
- Cumulative Layout Shift (p75): `<= 0.1`.
- Time to first visual response in 3D hero: `<= 1.2s`.
- Total JavaScript delivered on first load (critical path): `<= 250KB gz`.

## Conversion Definitions

- **Qualified lead**: enterprise company fit, clear initiative, budget/timeline signal, and decision-maker or core influencer involved.
- **High-intent session**: reaches case proof and triggers at least one conversion action (call click, form open, calendar open).
- **Meaningful interaction**: any interaction that indicates exploration intent, such as rotating a hero object, starting an interactive scene, or expanding a case module.

## Measurement Design

- Track event taxonomy by module:
  - `hero_interact_start`, `hero_interact_complete`
  - `case_open`, `case_module_complete`
  - `cta_primary_click`, `cta_secondary_click`
  - `lead_form_start`, `lead_form_submit`
- Tag each event with `device_class`, `traffic_source`, `industry_segment`, and `new_vs_returning`.
- Use weekly dashboard review for leading indicators, monthly review for pipeline-quality metrics.

## Targets by Time Horizon

- **0-30 days:** validate baseline interaction and performance guardrails.
- **31-60 days:** optimize conversion friction points (CTA clarity, form length, proof placement).
- **61-90 days:** optimize lead quality via messaging and qualification criteria.

## Decision / Rationale / Implication

- **Decision:** use balanced KPI system (brand + conversion + performance), not vanity engagement only.
- **Rationale:** premium positioning fails if visual ambition harms speed or conversion confidence.
- **Implication:** every design and interaction concept must map to at least one measurable KPI and remain inside performance budgets.
