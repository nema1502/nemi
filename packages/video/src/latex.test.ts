import { describe, expect, it } from "vitest";
import { mathOutOfText } from "./latex";

describe("mathOutOfText", () => {
  it("draws commands inside \\text as math", () => {
    expect(mathOutOfText("\\text{water + air \\rightarrow food}")).toBe("\\text{water + air }\\rightarrow\\text{ food}");
  });

  it("leaves plain text and math alone", () => {
    expect(mathOutOfText("\\text{water + air}")).toBe("\\text{water + air}");
    expect(mathOutOfText("a^2 + b^2 = c^2")).toBe("a^2 + b^2 = c^2");
  });
});
