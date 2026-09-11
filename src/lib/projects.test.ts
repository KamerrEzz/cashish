import { describe, expect, it } from "vitest";
import { slugifyProjectName } from "./projects";

describe("slugifyProjectName", () => {
  it("slugifies spanish names", () => {
    expect(slugifyProjectName("Gatos & Casa")).toBe("gatos-casa");
    expect(slugifyProjectName("Negocio X")).toBe("negocio-x");
  });

  it("falls back when empty", () => {
    expect(slugifyProjectName("!!!")).toBe("proyecto");
  });
});
