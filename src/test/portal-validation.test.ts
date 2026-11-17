import { describe, expect, it } from "vitest";
import { validateLogin, validatePasswordChange, validateProfile } from "@/lib/portal-validation";

describe("validateLogin", () => {
  it("requires both fields", () => {
    const e = validateLogin("", "");
    expect(e.id).toBeTruthy();
    expect(e.password).toBeTruthy();
  });
  it("accepts a demo email or a member code", () => {
    expect(validateLogin("rose@demo.ethmar", "demo1234")).toEqual({});
    expect(validateLogin("eth-1001", "x")).toEqual({});
  });
  it("rejects malformed identifiers", () => {
    expect(validateLogin("rose@", "x").id).toMatch(/البريد/);
    expect(validateLogin("rose", "x").id).toMatch(/ETH-1001/);
  });
});

describe("validatePasswordChange", () => {
  it("checks the current password and the new password rules", () => {
    expect(
      validatePasswordChange("wrong", "abc12345", "abc12345", "demo1234").current,
    ).toBeTruthy();
    expect(validatePasswordChange("demo1234", "short1", "short1", "demo1234").next).toBeTruthy();
    expect(
      validatePasswordChange("demo1234", "abcdefgh", "abcdefgh", "demo1234").next,
    ).toBeTruthy();
    expect(
      validatePasswordChange("demo1234", "abc12345", "abc12346", "demo1234").confirm,
    ).toBeTruthy();
    expect(validatePasswordChange("demo1234", "abc12345", "abc12345", "demo1234")).toEqual({});
  });
});

describe("validateProfile", () => {
  it("enforces name and bio length", () => {
    expect(validateProfile("رو", "", "").displayName).toBeTruthy();
    expect(validateProfile("روز العتيبي", "", "x".repeat(161)).bio).toBeTruthy();
    expect(validateProfile("روز العتيبي", "نظم المعلومات", "")).toEqual({});
  });
});
