import { describe, expect, it } from "vitest";

import { parseAddArgs, parseAddressArgs, UsageError } from "#/lib/args";

const ADDRESS = "xUo5vVMjVwiEGZurUHqbX27PXFjiSaKqKQ5rj8d52Ct";

describe("parseAddArgs", () => {
  it("reads the address and the trimmed name", () => {
    expect(
      parseAddArgs(["--address", ADDRESS, "--name", "  Cafetería Central "]),
    ).toEqual({ address: ADDRESS, name: "Cafetería Central" });
  });

  it("normalizes the name to NFC", () => {
    expect(
      parseAddArgs(["--address", ADDRESS, "--name", "Cafe\u0301"]).name,
    ).toBe("Caf\u00E9");
  });

  it.each([
    [["--name", "Bar"], "Missing --address"],
    [["--address", ADDRESS], "Missing --name"],
    [["--address", ADDRESS, "--name", "   "], "Missing --name"],
    [["--address", "not-an-address", "--name", "Bar"], "Not a Solana address"],
    [["--address", ADDRESS, "--name", "x".repeat(41)], "Invalid name"],
    [["--address", ADDRESS, "--name", "Bar\nBaz"], "Invalid name"],
    [["--address", ADDRESS, "--name", "Bar\u200B"], "Invalid name"],
    [["--address", ADDRESS, "--name", "Bar", "--extra", "1"], "Unknown option"],
  ])("rejects %j", (argv, message) => {
    expect(() => parseAddArgs(argv)).toThrow(UsageError);
    expect(() => parseAddArgs(argv)).toThrow(message);
  });
});

describe("parseAddressArgs", () => {
  it("reads the address", () => {
    expect(parseAddressArgs(["--address", ADDRESS])).toEqual({
      address: ADDRESS,
    });
  });

  it("requires it", () => {
    expect(() => parseAddressArgs([])).toThrow("Missing --address");
  });
});
