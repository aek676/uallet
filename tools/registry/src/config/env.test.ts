import { describe, expect, it } from "vitest";

import { expandHome } from "#/config/env";

describe("expandHome", () => {
  it.each([
    ["~", "/home/me"],
    ["~/.config/uallet/key.json", "/home/me/.config/uallet/key.json"],
    ["/tmp/key.json", "/tmp/key.json"],
    ["./key.json", "./key.json"],
    ["~other/key.json", "~other/key.json"],
  ])("%s", (path, expected) => {
    expect(expandHome(path, "/home/me")).toBe(expected);
  });
});
