import { describe, expect, it, vi } from "vitest";

import { createSampleStore } from "./sample-store";

const KEY = "test:samples";

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(KEY, initial);
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

function parseNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function store(storage: ReturnType<typeof memoryStorage> | null, limit = 3) {
  return createSampleStore({ key: KEY, limit, parse: parseNumber, storage });
}

describe("createSampleStore", () => {
  it("starts empty", () => {
    expect(store(memoryStorage()).getSnapshot()).toEqual([]);
  });

  it("adds samples, oldest first, and persists them", () => {
    const storage = memoryStorage();
    const samples = store(storage);

    samples.add(1);
    samples.add(2);

    expect(samples.getSnapshot()).toEqual([1, 2]);
    expect(storage.data.get(KEY)).toBe("[1,2]");
  });

  it("keeps only the newest samples", () => {
    const samples = store(memoryStorage());

    for (const value of [1, 2, 3, 4, 5]) samples.add(value);

    expect(samples.getSnapshot()).toEqual([3, 4, 5]);
  });

  it("loads what a previous session stored", () => {
    expect(store(memoryStorage("[1,2]")).getSnapshot()).toEqual([1, 2]);
  });

  it("drops stored samples that don't parse and keeps the limit", () => {
    const samples = store(memoryStorage('[1,"x",null,2,{"a":1},3,4]'));

    expect(samples.getSnapshot()).toEqual([2, 3, 4]);
  });

  it.each(["not json", '{"a":1}', '"text"', "null"])(
    "starts empty when storage holds %j",
    (stored) => {
      expect(store(memoryStorage(stored)).getSnapshot()).toEqual([]);
    },
  );

  it("returns the same array until the samples change", () => {
    const samples = store(memoryStorage("[1]"));
    const first = samples.getSnapshot();

    expect(samples.getSnapshot()).toBe(first);
    samples.add(2);
    expect(samples.getSnapshot()).not.toBe(first);
  });

  it("notifies subscribers until they unsubscribe", () => {
    const samples = store(memoryStorage());
    const listener = vi.fn<() => void>();
    const unsubscribe = samples.subscribe(listener);

    samples.add(1);
    samples.clear();
    unsubscribe();
    samples.add(2);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clears the samples and the stored copy", () => {
    const storage = memoryStorage("[1,2]");
    const samples = store(storage);

    samples.clear();

    expect(samples.getSnapshot()).toEqual([]);
    expect(storage.data.has(KEY)).toBe(false);
  });

  it("works in memory without storage", () => {
    const samples = store(null);

    samples.add(1);

    expect(samples.getSnapshot()).toEqual([1]);
  });

  it("keeps working when storage throws", () => {
    const samples = createSampleStore({
      key: KEY,
      limit: 3,
      parse: parseNumber,
      storage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });

    samples.add(1);
    expect(samples.getSnapshot()).toEqual([1]);
    samples.clear();
    expect(samples.getSnapshot()).toEqual([]);
  });
});
