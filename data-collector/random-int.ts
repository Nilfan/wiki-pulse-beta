export function oneIn(n: number): boolean {
  return randomInt(n) === 0;
}

function randomInt(maxExclusive: number): number {
  const UINT32_RANGE = 2 ** 32;

  if (
    !Number.isSafeInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError(`n must be more than 1 and less than ${UINT32_RANGE}`);
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buffer = new Uint32Array(1);

  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);

  return buffer[0] % maxExclusive;
}
