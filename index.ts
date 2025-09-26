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
