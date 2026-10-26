export const pages = [
  "Ringkasan",
  "Chat AI",
  "Pemantauan",
  "Analitik",
  "Memori AI",
  "Pengaturan",
] as const;
export type Page = (typeof pages)[number];
export const slugs = [
  "overview",
  "chat",
  "monitoring",
  "analytics",
  "memory",
  "settings",
] as const;
export const contexts = [
  "products",
  "customers",
  "outlets",
  "margin",
  "seasonal",
  "weekend",
  "afternoon",
  "memory",
] as const;
export type ChatContext = (typeof contexts)[number];
export type Option = "A" | "B" | "C";
export type Route = { valid: boolean; page: Page; hash: string };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "overview";
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/");
  const index = slugs.indexOf(parts[0] as (typeof slugs)[number]);
  const params = new URLSearchParams(query);
  let valid =
    index >= 0 &&
    parts.every(Boolean) &&
    !raw.includes("#") &&
    raw.split("?").length <= 2;
  if (parts[0] === "chat") {
    valid &&=
      parts.length === 1 ||
      (parts.length === 3 &&
        parts[1] === "simulation" &&
        ["A", "B", "C"].includes(parts[2]));
    if (params.has("context"))
      valid &&= contexts.includes(params.get("context") as ChatContext);
    if (params.has("option"))
      valid &&= ["A", "B", "C"].includes(params.get("option") ?? "");
  } else if (parts[0] === "analytics") {
    valid &&=
      parts.length === 1 ||
      (parts.length === 2 &&
        ["products", "customers", "outlets", "margin", "seasonal"].includes(
          parts[1],
        ));
  } else if (parts[0] === "monitoring") {
    valid &&=
      parts.length === 1 ||
      (parts.length === 2 &&
        [
          "completed",
          "weekend",
          "lunch",
          "afternoon",
          "morning",
          "payday",
          "pastry",
        ].includes(parts[1]));
  } else valid &&= parts.length === 1;
  return { valid, page: pages[index] ?? "Ringkasan", hash: `#${raw}` };
}
export function pageHref(page: Page) {
  return `#${slugs[pages.indexOf(page)]}`;
}
export function chatHref(context: ChatContext, option?: Option) {
  const params = new URLSearchParams({ context });
  if (option) params.set("option", option);
  return `#chat?${params}`;
}
export function simulationHref(option: Option) {
  return `#chat/simulation/${option}`;
}
