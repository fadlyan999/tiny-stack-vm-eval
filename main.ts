import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const S = 256, C = 64, M = 256, L = 1e6, U = 65536;

function run(p: Uint8Array, i: Uint8Array): { o: Uint8Array; e: number } {
  const D = new Int32Array(S);
  let sp = 0;
  const CC = new Int32Array(C);
  let csp = 0;
  const Mem = new Int32Array(M);
  const out = new Uint8Array(U);
  let ol = 0, inp = 0, pc = 0, steps = 0;
  const tr = (c: number) => ({ o: out.slice(0, ol), e: c });
  const done = (e: number) => ({ o: out.slice(0, ol), e });

  for (;;) {
    if (steps === L) return tr(10);
    if (pc < 0 || pc >= p.length) return tr(9);
    const op = p[pc];
    if (op === undefined) return tr(9);
    let imm = 0, pops = 0, push = 0;
    if (op === 0) { imm = 0; pops = 0; push = 0; }
    else if (op === 1) { imm = 1; pops = 0; push = 1; }
    else if (op === 2) { imm = 4; pops = 0; push = 1; }
    else if (op === 3) { imm = 0; pops = 1; push = 0; }
    else if (op === 4) { imm = 0; pops = 1; push = 2; }
    else if (op === 5) { imm = 0; pops = 2; push = 2; }
    else if (op === 6) { imm = 0; pops = 2; push = 3; }
    else if (op === 7) { imm = 0; pops = 3; push = 3; }
    else if (op >= 0x10 && op <= 0x1e && op !== 0x17 && op !== 0x1b) { imm = 0; pops = 2; push = 1; }
    else if (op === 0x17 || op === 0x1b) { imm = 0; pops = 1; push = 1; }
    else if (op >= 0x20 && op <= 0x22) { imm = 0; pops = 2; push = 1; }
    else if (op === 0x30 || op === 0x31 || op === 0x32) { imm = 2; pops = op === 0x30 ? 0 : 1; push = 0; }
    else if (op === 0x33) { imm = 2; pops = 0; push = 0; }
    else if (op === 0x34) { imm = 0; pops = 0; push = 0; }
    else if (op === 0x40) { imm = 0; pops = 1; push = 1; }
    else if (op === 0x41) { imm = 0; pops = 2; push = 0; }
    else if (op === 0x50 || op === 0x51 || op === 0x53) { imm = 0; pops = 1; push = 0; }
    else if (op === 0x52) { imm = 0; pops = 0; push = 1; }
    else { return tr(5); }

    if (pc + imm >= p.length) return tr(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < pops) return tr(2);
    if (sp - pops + push > S) return tr(3);
    pc = next;

    switch (op) {
      case 0: return done(0);
      case 1: D[sp++] = (p[next - 1] << 24) >> 24; break;
      case 2: D[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24); break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x10: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = (a + b) | 0; break; }
      case 0x11: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = (a - b) | 0; break; }
      case 0x12: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = Math.imul(a, b); break; }
      case 0x13: { const b = D[sp - 1], a = D[sp - 2]; if (b === 0) return tr(4); const r = a === -2147483648 && b === -1 ? a : (a / b) | 0; sp -= 2; D[sp++] = r; break; }
      case 0x14: { const b = D[sp - 1], a = D[sp - 2]; if (b === 0) return tr(4); const r = b === -1 ? 0 : a % b | 0; sp -= 2; D[sp++] = r; break; }
      case 0x15: { const b = D[sp - 1], a = D[sp - 2]; if (b === 0) return tr(4); const r = Math.floor((a >>> 0) / (b >>> 0)) | 0; sp -= 2; D[sp++] = r; break; }
      case 0x16: { const b = D[sp - 1], a = D[sp - 2]; if (b === 0) return tr(4); const r = (a >>> 0) % (b >>> 0) | 0; sp -= 2; D[sp++] = r; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x18: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a & b; break; }
      case 0x19: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a | b; break; }
      case 0x1a: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a ^ b; break; }
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x1c: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a << (b & 31); break; }
      case 0x1d: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a >> (b & 31); break; }
      case 0x1e: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = (a >>> (b & 31)) | 0; break; }
      case 0x20: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a === b ? 1 : 0; break; }
      case 0x21: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = a < b ? 1 : 0; break; }
      case 0x22: { const b = D[sp - 1], a = D[sp - 2]; sp -= 2; D[sp++] = (a >>> 0) < (b >>> 0) ? 1 : 0; break; }
      case 0x30: { const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16; pc = next + rel; break; }
      case 0x31: { const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16; const v = D[--sp]; if (v === 0) pc = next + rel; break; }
      case 0x32: { const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16; const v = D[--sp]; if (v !== 0) pc = next + rel; break; }
      case 0x33: { if (csp === C) return tr(7); CC[csp++] = next; pc = p[next - 2] | (p[next - 1] << 8); break; }
      case 0x34: { if (csp === 0) return tr(8); pc = CC[--csp]; break; }
      case 0x40: { const addr = D[sp - 1]; if (addr < 0 || addr >= M) return tr(6); D[sp - 1] = Mem[addr]; break; }
      case 0x41: { const addr = D[sp - 1]; const v = D[sp - 2]; if (addr < 0 || addr >= M) return tr(6); sp -= 2; Mem[addr] = v; break; }
      case 0x50: { const bytes = new TextEncoder().encode(String(D[sp - 1])); if (ol + bytes.length > U) return tr(11); sp--; out.set(bytes, ol); ol += bytes.length; break; }
      case 0x51: { if (ol + 1 > U) return tr(11); out[ol++] = D[--sp] & 255; break; }
      case 0x52: D[sp++] = inp < i.length ? i[inp++] : -1; break;
      case 0x53: return done(D[--sp] & 255);
      default: return tr(5);
    }
  }
  return done(0);
}

for (const id of readdirSync(I).sort()) {
  mkdirSync(join(O, id), { recursive: true });
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), r.e + '\n');
}
