import { describe, expect, it } from "vitest";
import { validateSignupShape } from "@/lib/ledger-types";

describe("validateSignupShape", () => {
  it("accepts a .pay handle", () => {
    const result = validateSignupShape({
      name: "Nina Cole",
      handle: "Nina.Pay",
      password: "demo",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.handle).toBe("nina.pay");
  });

  it("rejects a taken-looking invalid handle", () => {
    expect(
      validateSignupShape({
        name: "Nina",
        handle: "nina",
        password: "demo",
      }).ok,
    ).toBe(false);
  });
});
