export function seedToUint32(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  const text = String(seed ?? "0");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 0) {
    this.seed = seedToUint32(seed);
    this._next = mulberry32(this.seed);
  }

  float() {
    return this._next();
  }

  chance(probability) {
    return this.float() < probability;
  }

  int(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(this.float() * (hi - lo + 1)) + lo;
  }

  pick(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("RNG.pick requires a non-empty array");
    }
    return items[this.int(0, items.length - 1)];
  }

  shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  weightedPick(weightMapOrEntries) {
    const entries = Array.isArray(weightMapOrEntries)
      ? weightMapOrEntries
      : Object.entries(weightMapOrEntries);

    let total = 0;
    for (const [, weight] of entries) {
      if (weight > 0) total += weight;
    }
    if (total <= 0) {
      throw new Error("weightedPick requires positive total weight");
    }
    let roll = this.float() * total;
    for (const [value, weight] of entries) {
      if (weight <= 0) continue;
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  fork(label = "") {
    const forkSeed = seedToUint32(`${this.seed}:${label}:${this.int(0, 0xffffffff)}`);
    return new RNG(forkSeed);
  }
}

