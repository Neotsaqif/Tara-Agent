import { describe, expect, it } from "vitest";
import { chatHref, pageHref, parseRoute, simulationHref } from "./routing";

describe("typed prototype routes", () => {
  it.each([
    "",
    "#overview",
    "#chat?context=products&option=B",
    "#chat/simulation/C",
    "#analytics/margin",
    "#monitoring/completed",
    "#monitoring/lunch",
    "#settings",
  ])("accepts %s", (hash) => {
    expect(parseRoute(hash).valid).toBe(true);
  });
  it.each([
    "#missing",
    "#monitoring/unknown",
    "#chat/simulation/D",
    "#chat?context=unknown",
    "#chat?option=D",
    "#analytics/unknown",
    "#memory/extra",
    "#chat//",
    "#chat?context=products?extra",
  ])("rejects %s", (hash) => {
    expect(parseRoute(hash).valid).toBe(false);
  });
  it("builds contextual deep links", () => {
    expect(chatHref("outlets", "B")).toBe("#chat?context=outlets&option=B");
    expect(simulationHref("A")).toBe("#chat/simulation/A");
    expect(pageHref("Pemantauan")).toBe("#monitoring");
  });
});
