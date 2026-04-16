import {
  createEntropyStore,
  setEntropyPolicy,
  getEntropyPolicy,
  measureEntropy,
  checkEntropy,
  generateHighEntropySecret,
  recordSample,
  getEntropySamples,
} from "./entropy";

describe("measureEntropy", () => {
  it("returns 0 for empty string", () => {
    expect(measureEntropy("")).toBe(0);
  });

  it("returns 0 for single repeated character", () => {
    expect(measureEntropy("aaaa")).toBe(0);
  });

  it("returns higher entropy for diverse string", () => {
    const low = measureEntropy("aaaaaab");
    const high = measureEntropy("aAbBcCdD");
    expect(high).toBeGreaterThan(low);
  });
});

describe("entropy policy", () => {
  it("stores and retrieves a policy", () => {
    const store = createEntropyStore();
    setEntropyPolicy(store, { vaultId: "v1", minEntropy: 40, blockBelow: true });
    const p = getEntropyPolicy(store, "v1");
    expect(p?.minEntropy).toBe(40);
  });

  it("returns undefined for unknown vault", () => {
    const store = createEntropyStore();
    expect(getEntropyPolicy(store, "none")).toBeUndefined();
  });
});

describe("checkEntropy", () => {
  it("allows when no policy set", () => {
    const store = createEntropyStore();
    const result = checkEntropy(store, "v1", "weak");
    expect(result.allowed).toBe(true);
  });

  it("blocks weak secret when blockBelow is true", () => {
    const store = createEntropyStore();
    setEntropyPolicy(store, { vaultId: "v1", minEntropy: 100, blockBelow: true });
    const result = checkEntropy(store, "v1", "aaa");
    expect(result.allowed).toBe(false);
  });

  it("allows strong secret", () => {
    const store = createEntropyStore();
    setEntropyPolicy(store, { vaultId: "v1", minEntropy: 10, blockBelow: true });
    const secret = generateHighEntropySecret(16);
    const result = checkEntropy(store, "v1", secret);
    expect(result.allowed).toBe(true);
  });
});

describe("samples", () => {
  it("records and retrieves entropy samples", () => {
    const store = createEntropyStore();
    recordSample(store, "v1", 42.5);
    recordSample(store, "v1", 80.1);
    expect(getEntropySamples(store, "v1")).toEqual([42.5, 80.1]);
  });

  it("returns empty array for unknown vault", () => {
    const store = createEntropyStore();
    expect(getEntropySamples(store, "none")).toEqual([]);
  });
});

describe("generateHighEntropySecret", () => {
  it("returns hex string of correct length", () => {
    const s = generateHighEntropySecret(16);
    expect(s).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(s)).toBe(true);
  });
});
