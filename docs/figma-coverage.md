# Figma coverage matrix

Source: `wK37fT7GIe5zPyRgB8HjPx`, canvas `93:79`, inspected 26 October 2026. Desktop reference: 1440 × 900. Counts: 13 main frames, 28 prototype states, 69 overlays/motion frames, 130 interactive component frames. These are not 240 distinct pages.

Implementation groups are complete as a frontend demo, with deliberate unavailable states and shared motion/component reuse. Final verification and explicit exceptions are recorded in `frontend-verification.md` and `implementation-status.md`. A mapped frame is not a claim of pixel-perfect equivalence or individually screenshot-certified coverage.

## Main frames

| Nodes | Implementation / trigger | Verification target |
|---|---|---|
| `93:153` | Overview; `#overview` | KPI, revenue/weekly tooltips, heatmap, contextual Chat |
| `93:551` | Chat; `#chat` | A/B/C, rationale, history, demo thinking |
| `93:904` | Simulation; `#chat/simulation/A` | Supported fixture variants, margin warning, demo scheduling |
| `93:1239`, `93:1282`, `93:1566` | Monitoring active/completed/detail | Search/status/outlet, campaign-specific timelines, result dialogs |
| `93:2243`, `93:2323`, `93:2387`, `93:2450`, `93:2514` | Analytics products/customers/outlets/margin/seasonal | Deep-linked tabs, supported scopes, export, contextual Chat |
| `94:1102` | Memory | Search, four detail dialogs, Chat context |
| `94:1318` | Settings | Local preview, explicit simulated save/invite/connection |

## Prototype states

| Nodes | State / implementation target | Trigger and return |
|---|---|---|
| `187:1593`, `187:1737`, `187:1881` | Chat selected A/B/C | Select card; rationale; simulation; Back |
| `187:2025`, `422:10608` | Demo thinking / response reveal | Explicit scenario playback; cancellable timer |
| `187:2175`, `187:2326`, `187:2477`, `188:2305` | Simulation 10%, 20%, Loyalty, Reach | Offer selector; only defined fixture snapshots |
| `190:2264`, `190:2412`, `190:2560`, `190:2708`, `190:2856` | Product/customer/outlet/margin/seasonal Chat context | Analytics CTA; context query; Back |
| `187:2628`, `187:2783`, `187:2938`, `194:3287`, `194:3466`, `194:3631`, `458:5229` | Improved, scheduled, stopped, cancelled, lunch detail, lunch stopped, stopped after adjustment | Demo review/rethink/stop/cancel; explicit reset |
| `190:3122`, `190:3261`, `190:3590`, `190:3732`, `190:3874` | Monitoring search focus/filled, deviation/on-track/scheduled | Search and status controls; reset empty result |
| `190:3400`, `190:3483` | Memory search focus/filled | Search field; clear query |

## Overlays, dropdowns, and motion

| Nodes | Shared implementation | Required boundary / behavior |
|---|---|---|
| `188:2456`, `188:2487`, `188:2494` | Launch confirmation / scheduling / scheduled result | Demo only; no campaign created; timer cleanup |
| `188:2523`, `188:2545`, `188:2554` | Strategy / rethink / stop | Demo only; cancel or close restores focus |
| `188:2580`, `188:2594`, `188:2608`, `188:2625`, `269:5154`, `269:5176` | Simulation selectors | Native accessible controls; unsupported combination unavailable |
| `188:2713`, `188:2730`, `270:5034` | Workspace scope and updating | Scope gate; no stale all-outlet data under unsupported scope |
| `190:2210`, `190:2221`, `190:2232` | Option rationale | Correct option; dialog Escape/focus restore |
| `190:3006`, `190:3015`, `190:3019`, `190:3043`, `261:4994` | Settings save/connect/invite | Local preview only; no server save or invitation |
| `190:3054`, `190:3071`, `190:3088`, `190:3105` | Four memory detail dialogs | Correct note; contextual Chat |
| `190:3582`, `219:4934`, `267:5028` | Monitoring status/outlet/search | Filter fixtures; explicit empty state |
| `190:4022`, `219:4957`, `219:4976`, `219:4999`, `268:5342` | Analytics export/period/outlet/category/updating | Demo CSV contents; unsupported comparison unavailable |
| `190:4037` | Notifications | Direct weekend detail; live unavailable |
| `194:3276`, `194:3447`, `194:3621`, `261:4964`, `261:4974`, `261:4984` | Cancel scheduled / review / stop and progress | No business operation; cancellable session simulation |
| `194:3849`, `269:4989` | Margin warning / updating simulation | Fixture warning; no calculated prediction |
| `223:4949`, `223:4978`, `223:5007` | Completed morning/payday/pastry results | Campaign-specific snapshots; unknown numbers unavailable |
| `278:5771` | Conversation search | Static demo history; no claimed persistence |
| `423:5142`, `423:5176`, `423:5191`, `423:5204`, `423:5217`, `423:5230`, `423:5242`, `423:5260`, `423:5278`, `423:5296`, `423:5314`, `423:5326`, `423:5341`, `423:5357`, `423:5372`, `423:5387`, `423:5407`, `423:5427` | Modal motion gates | Reuse corresponding semantic dialog, not separate pages |
| `430:5662`, `430:5669`, `430:5676` | Toast fade variants | Reuse toast; reduced motion; no exact timing equivalence claimed |

## Interactive component families

The 130 component frames are reused primitives and card/input/chart variants, not additional routes. Their coverage is through parent screens:

- `194:3869–194:3897`: primary/secondary/danger buttons → shared `ui.tsx`.
- `194:4607–194:5759`, `194:5893–194:7341`: KPI/recommendation/campaign/memory cards and selected/result variants → pages and typed fixtures.
- `194:4807`, `194:5068`, `194:5256`, `194:5776–194:5861`, `194:6945`, `194:7012`, `194:7057`, `194:7111`: input/KPI variants → semantic controls and cards in parent pages. Ranges describe families, not every integer node ID.
- `194:7384`, `194:7412`, `194:7440`, `194:7468`: product categories → Analytics category filter.
- `194:7577`, `194:7767`: revenue/weekly chart tooltip variants → Overview chart controls; `270:5053` heatmap tooltip.
- `194:7943`, `194:8117`, `194:8284`, `194:8450`, `194:8616`, `194:8806`, `194:8982`, `194:9153`, `194:9324`, `194:9498`, `194:9713`: simulation/monitoring/analytics chart families → original SVG assets with honest fixture availability. Unverified point values must not be synthesized.
- `217:4936`, `217:4968`, `217:5000`, `217:5032`, `217:5064`: product margin variants → Analytics product rows.
- `233:4958`, `233:5467`, `236:4958`, `278:5023`: dropdown/sidebar/recommendation/history composites → shared shell and Chat.

## Acceptance and intentional differences

- Indonesian interface text and explicit demo/API boundaries are retained even where Figma uses English or success copy implying real persistence.
- Native selects replace custom dropdown motion where equivalent keyboard interaction is safer.
- Fixture absence is not zero; unsupported scopes and projections remain unavailable.
- UI timers reproduce demonstrative progress only. No LLM, campaign scheduling, notification backend, auth, persistence, or execution is implied.
- Reduced-motion behavior and responsive rearrangement intentionally differ from fixed desktop animation/layout.
- Automated screenshots detect regressions; they do not establish pixel-perfect Figma equivalence. Browser engines/devices and visual exceptions must be reported separately.
