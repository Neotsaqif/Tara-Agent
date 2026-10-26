// Exact visible snapshots from Figma; repeated KPI values are intentional.
// Prototype navigation confirms A 10/15/20%, B loyalty, C reach.
// Base frame captions are stale (all say 15%); menu actions define the mapping.
// B/C menu alternatives have no confirmed snapshots and remain unsupported.
export const simulationSnapshots = {
  bundle15: {
    label: "Standar · Diskon 15%",
    node: "93:904",
    optionId: "A",
    offer: "Kopi + pastri · Diskon 15%",
    hours: "14.00–17.00",
    primary: "SimulationPrimarySeriesScaleBounds",
    muted: "SimulationMutedSeriesScaleBounds",
    height: 124.451,
    width: 1038.09,
  },
  bundle10: {
    label: "Snapshot diskon 10%",
    node: "187:2175",
    optionId: "A",
    offer: "Kopi + pastri · Diskon 10%",
    hours: "14.00–17.00",
    primary: "Variant10PercentPrimary",
    muted: "Variant10PercentMuted",
    height: 120.25,
    width: 1038.06,
  },
  bundle20: {
    label: "Snapshot diskon 20%",
    node: "187:2326",
    optionId: "A",
    offer: "Kopi + pastri · Diskon 20%",
    hours: "14.00–17.00",
    primary: "Variant20PercentPrimary",
    muted: "Variant20PercentMuted",
    height: 127.451,
    width: 1038.12,
  },
  loyalty: {
    label: "Snapshot loyalitas",
    node: "187:2477",
    optionId: "B",
    offer: "Poin loyalitas 2×",
    hours: "14.00–17.00",
    primary: "VariantLoyaltyPrimary",
    muted: "VariantLoyaltyMuted",
    height: 121.09,
    width: 1038.07,
  },
  reach: {
    label: "Snapshot jangkauan",
    node: "188:2305",
    optionId: "C",
    offer: "Minuman pilihan · Diskon 20%",
    hours: "14.00–16.00",
    primary: "VariantReachOfferPrimary",
    muted: "VariantReachOfferMuted",
    height: 128.652,
    width: 1038.12,
  },
} as const;
export type SimulationSnapshot = keyof typeof simulationSnapshots;
export const defaultParameters = {
  period: "14–20 Sep 2026",
  outlet: "Semua 3 outlet",
  offer: "Kopi + pastri · Diskon 15%",
  hours: "14.00–17.00",
};
export const optionOffers: Record<string, string[]> = {
  A: [
    "Kopi + pastri · Diskon 10%",
    defaultParameters.offer,
    "Kopi + pastri · Diskon 20%",
  ],
  B: ["Poin loyalitas 1,5×", "Poin loyalitas 2×", "Poin loyalitas 3×"],
  C: [
    "Minuman pilihan · Diskon 10%",
    "Minuman pilihan · Diskon 15%",
    "Minuman pilihan · Diskon 20%",
  ],
};
export function initialSimulationParameters(
  optionId: string,
  snapshotId?: string,
) {
  const defaultId =
    optionId === "B" ? "loyalty" : optionId === "C" ? "reach" : "bundle15";
  const id = snapshotId ?? defaultId;
  const snapshot = Object.prototype.hasOwnProperty.call(simulationSnapshots, id)
    ? simulationSnapshots[id as SimulationSnapshot]
    : null;
  // Cross-option and unknown deep links never silently become the default projection.
  if (!snapshot || snapshot.optionId !== optionId)
    return {
      ...defaultParameters,
      offer: `Penawaran tidak didukung (${id})`,
      hours: optionId === "C" ? "14.00–16.00" : defaultParameters.hours,
    };
  return { ...defaultParameters, offer: snapshot.offer, hours: snapshot.hours };
}
export function getSimulationSnapshot(
  optionId: string,
  parameters: typeof defaultParameters,
) {
  if (
    parameters.period !== defaultParameters.period ||
    parameters.outlet !== defaultParameters.outlet
  )
    return null;
  return (
    Object.values(simulationSnapshots).find(
      (snapshot) =>
        snapshot.optionId === optionId &&
        snapshot.offer === parameters.offer &&
        snapshot.hours === parameters.hours,
    ) ?? null
  );
}
export function simulationOfferId(optionId: string, offer: string) {
  return Object.entries(simulationSnapshots).find(
    ([, snapshot]) =>
      snapshot.optionId === optionId && snapshot.offer === offer,
  )?.[0];
}
