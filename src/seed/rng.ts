const SEED = 0x9e3779b9;
let state = SEED;

function nextUInt32(): number {
  state = (state + 0x9e3779b9) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 1);
  return (t ^ (t >>> 14)) >>> 0;
}

function random(): number {
  return nextUInt32() / 0xffffffff;
}

function seededChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

export { random, seededChoice, nextUInt32 };
