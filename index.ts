type Sketch = {
  width: number;
  depth: number;
  bins: Uint32Array;
};

function makeSketch({
  confidence,
  errorRate,
}: {
  confidence: number;
  errorRate: number;
}): Sketch {
  const width = Math.ceil(2 / errorRate);
  const depth = Math.ceil(-Math.log(1 - confidence) / Math.log(2));
  return {
    width,
    depth,
    bins: new Uint32Array(width * depth),
  };
}

function hashValue(v: string, n: bigint): bigint {
  return Bun.hash.xxHash3(v, n);
}

function getIndexes(sketch: Sketch, value: string): number[] {
  const { width, depth } = sketch;
  const intialSeed = hashValue(value, -1n);
  const results: number[] = [];
  for (let d = 0; d < depth; d++) {
    const binStartIdx = d * width;
    const hashed = Bun.hash.xxHash3(value, intialSeed + BigInt(d));
    const binIdx = Number(hashed % BigInt(width));
    const globalIdx = binStartIdx + binIdx;
    results.push(globalIdx);
  }
  return results;
}

function add(sketch: Sketch, value: string): void {
  const indexes = getIndexes(sketch, value);
  for (const idx of indexes) {
    sketch.bins[idx]!++;
  }
}

function check(sketch: Sketch, value: string): number {
  const indexes = getIndexes(sketch, value);
  let approx = Infinity;
  for (const idx of indexes) {
    approx = Math.min(approx, sketch.bins[idx]!);
  }
  return approx;
}

// ---------
// Play

const randV = () => `v-${Math.ceil(Math.random() * 1000)}`;
const sketch = makeSketch({ confidence: 0.95, errorRate: 0.01 });
const cnts = new Map<string, number>();
for (let t = 0; t < 10_000; t++) {
  const v = randV();
  add(sketch, v);
  cnts.set(v, (cnts.get(v) || 0) + 1);
}
const sample = [...new Set(Array.from({ length: 50 }, () => randV()))];
let maxOver = 0,
  avgOver = 0;
for (const x of sample) {
  const est = check(sketch, String(x)),
    tru = cnts.get(x) || 0,
    over = est - tru;
  if (over > maxOver) maxOver = over;
  avgOver += over;
}
console.log("random:", {
  maxOver,
  avgOver: +(avgOver / sample.length).toFixed(3),
});
