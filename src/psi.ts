/**
 * Diffie–Hellman private set intersection.
 *
 * Each phone hashes its own reportable genes into the group and raises them to a secret key.
 * The other phone raises what it receives to its own key. Because exponentiation commutes,
 * H(g)^(ab) matches only when both sides hold the same gene. Neither side ever receives the
 * other's plaintext list, and a gene held by one person alone stays an opaque number.
 *
 * The modulus is the Mersenne prime 2^127 − 1: enough to demonstrate the protocol honestly,
 * not a production parameter set (that would be an elliptic-curve group such as ristretto255).
 */

export const P = (1n << 127n) - 1n;

export function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

function toBigInt(bytes: Uint8Array): bigint {
  let n = 0n;
  for (const byte of bytes) n = (n << 8n) | BigInt(byte);
  return n;
}

export async function hashToGroup(value: string): Promise<bigint> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`satr/v1/${value}`));
  const n = toBigInt(new Uint8Array(digest)) % P;
  return n < 2n ? n + 2n : n;
}

export function randomKey(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const n = toBigInt(bytes) % (P - 3n);
  return n + 2n;
}

export function short(n: bigint): string {
  const hex = n.toString(16).padStart(32, "0");
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

export type PsiRow = { gene: string; once: bigint; twice: bigint; match: boolean };

export type PsiTrace = {
  a: PsiRow[];
  b: PsiRow[];
  intersection: string[];
};

export async function runPsi(aGenes: string[], bGenes: string[], keyA = randomKey(), keyB = randomKey()): Promise<PsiTrace> {
  const aHashed = await Promise.all(aGenes.map(hashToGroup));
  const bHashed = await Promise.all(bGenes.map(hashToGroup));

  // A blinds its own list and sends it; B re-blinds. And the mirror image.
  const aOnce = aHashed.map((h) => modpow(h, keyA, P));
  const aTwice = aOnce.map((x) => modpow(x, keyB, P));
  const bOnce = bHashed.map((h) => modpow(h, keyB, P));
  const bTwice = bOnce.map((x) => modpow(x, keyA, P));

  const bSet = new Set(bTwice.map(String));
  const aSet = new Set(aTwice.map(String));

  const a = aGenes.map((gene, i) => ({ gene, once: aOnce[i], twice: aTwice[i], match: bSet.has(String(aTwice[i])) }));
  const b = bGenes.map((gene, i) => ({ gene, once: bOnce[i], twice: bTwice[i], match: aSet.has(String(bTwice[i])) }));
  return { a, b, intersection: a.filter((row) => row.match).map((row) => row.gene) };
}

export async function runPsiChecks(): Promise<string[]> {
  const bad: string[] = [];
  if (modpow(3n, 5n, 7n) !== 5n) bad.push("modpow");
  const trace = await runPsi(["USH2A", "GJB2"], ["USH2A", "MEFV"]);
  if (trace.intersection.join() !== "USH2A") bad.push(`psi intersection: ${trace.intersection.join()}`);
  if (trace.b.filter((row) => row.match).map((row) => row.gene).join() !== "USH2A") bad.push("psi mirror");
  const none = await runPsi(["GJB2"], ["MEFV"]);
  if (none.intersection.length) bad.push("psi false match");
  return bad;
}
