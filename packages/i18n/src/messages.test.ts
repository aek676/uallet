import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import es from "../messages/es.json";
import settings from "../project.inlang/settings.json";
import { LOCALES } from "./locales";

describe("project settings", () => {
  it("has the locales the apps format for, English first", () => {
    expect(settings.locales).toEqual(LOCALES);
    expect(settings.baseLocale).toBe("en");
  });
});

describe("messages", () => {
  // Paraglide falls back to English for a missing translation, silently.
  it("translates every message into Spanish, and nothing else", () => {
    expect(Object.keys(es).toSorted()).toEqual(Object.keys(en).toSorted());
  });

  it.each([
    ["en", en],
    ["es", es],
  ])("has no empty %s message", (_, messages) => {
    const empty = Object.entries(messages).filter(
      ([, message]) => message === "",
    );
    expect(empty).toEqual([]);
  });
});
