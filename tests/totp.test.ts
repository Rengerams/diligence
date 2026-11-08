import { describe, expect, it } from "vitest";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  totpCode,
  verifyRecoveryCode,
  verifyTotp,
} from "../src/lib/totp";

describe("tweestapsverificatie", () => {
  it("accepteert de juiste code en weigert een verkeerde code", () => {
    const secret = generateTotpSecret();
    const at = Date.UTC(2026, 10, 3, 12, 0, 0);
    const code = totpCode(secret, at);
    expect(verifyTotp(secret, code, at)).toBe(true);
    expect(verifyTotp(secret, "000000", at)).toBe(false);
  });

  it("accepteert een code binnen het tijdsvenster", () => {
    const secret = generateTotpSecret();
    const at = Date.UTC(2026, 10, 3, 12, 0, 0);
    const code = totpCode(secret, at - 30_000);
    expect(verifyTotp(secret, code, at)).toBe(true);
  });

  it("verifieert en verbruikt herstelcodes", () => {
    const { plain, hashed } = generateRecoveryCodes();
    const index = verifyRecoveryCode(hashed, plain[0]);
    expect(index).toBe(0);
    hashed.splice(index, 1);
    expect(verifyRecoveryCode(hashed, plain[0])).toBe(-1);
  });
});
