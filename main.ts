// Tiny stack VM for make.fun's tiny-stack-vm-01 ISA (generator/subject/ISA.md).
// Faithful to the reference VM generator/subject/vm.mjs: same step order,
// same traps and exit codes, same 32-bit wrapping, same limits.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p, inp) {
  const D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cs = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, st = 0;
  const n = p.length;
  const fin = (c) => ({ o: out.slice(0, ol), c });
  for (;;) {
    if (st === 1e6) return fin(10);
    if (pc < 0 || pc >= n) return fin(9);
    const o = p[pc];
    let im = 0, po = 0, pu = 0;
    if (o < 8) { po = [0, 0, 0, 1, 1, 2, 2, 3][o]; pu = [0, 1, 1, 0, 2, 2, 3, 3][o]; im = o === 1 ? 1 : o === 2 ? 4 : 0; }
    else if (o >= 16 && o <= 34 && o !== 31) { po = o === 23 || o === 27 ? 1 : 2; pu = 1; }
    else if (o >= 48 && o <= 52) { im = o === 52 ? 0 : 2; po = o === 49 || o === 50 ? 1 : 0; }
    else if (o === 64) { po = 1; pu = 1; }
    else if (o === 65) { po = 2; }
    else if (o >= 80 && o <= 83) { po = o === 82 ? 0 : 1; pu = o === 82 ? 1 : 0; }
    else return fin(5);
    if (pc + im >= n) return fin(9);
    st++;
    const nx = pc + 1 + im;
    if (sp < po) return fin(2);
    if (sp - po + pu > 256) return fin(3);
    pc = nx;
    if (o < 8) {
      if (o === 0) return fin(0);
      if (o === 1) { D[sp++] = (p[nx - 1] << 24) >> 24; continue; }
      if (o === 2) { D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); continue; }
      if (o === 3) { sp--; continue; }
      if (o === 4) { D[sp] = D[sp - 1]; sp++; continue; }
      if (o === 5) { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; continue; }
      if (o === 6) { D[sp] = D[sp - 2]; sp++; continue; }
      const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a;
      continue;
    }
    if (o >= 16 && o <= 34) {
      if (o === 23) { D[sp - 1] = -D[sp - 1] | 0; continue; }
      if (o === 27) { D[sp - 1] = ~D[sp - 1]; continue; }
      const b = D[sp - 1], a = D[sp - 2];
      let r = 0;
      if (o === 16) r = (a + b) | 0;
      else if (o === 17) r = (a - b) | 0;
      else if (o === 18) r = Math.imul(a, b);
      else if (o === 19) { if (!b) return fin(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
      else if (o === 20) { if (!b) return fin(4); r = b === -1 ? 0 : (a % b) | 0; }
      else if (o === 21) { if (!b) return fin(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
      else if (o === 22) { if (!b) return fin(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
      else if (o === 24) r = a & b;
      else if (o === 25) r = a | b;
      else if (o === 26) r = a ^ b;
      else if (o === 28) r = a << (b & 31);
      else if (o === 29) r = a >> (b & 31);
      else if (o === 30) r = (a >>> (b & 31)) | 0;
      else if (o === 32) r = a === b ? 1 : 0;
      else if (o === 33) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      sp -= 2; D[sp++] = r;
      continue;
    }
    if (o >= 48 && o <= 52) {
      if (o === 51) { if (cs === 64) return fin(7); C[cs++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); continue; }
      if (o === 52) { if (cs === 0) return fin(8); pc = C[--cs]; continue; }
      const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
      if (o === 48) { pc = nx + rel; continue; }
      const v = D[--sp];
      if ((o === 49) === (v === 0)) pc = nx + rel;
      continue;
    }
    if (o === 64) { const a = D[sp - 1]; if (a < 0 || a > 255) return fin(6); D[sp - 1] = M[a]; continue; }
    if (o === 65) { const a = D[sp - 1], v = D[sp - 2]; if (a < 0 || a > 255) return fin(6); sp -= 2; M[a] = v; continue; }
    if (o === 80) {
      const s = String(D[sp - 1]);
      if (ol + s.length > 65536) return fin(11);
      sp--;
      for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
      continue;
    }
    if (o === 81) { if (ol + 1 > 65536) return fin(11); out[ol++] = D[--sp] & 255; continue; }
    if (o === 82) { D[sp++] = ip < inp.length ? inp[ip++] : -1; continue; }
    return fin(D[--sp] & 255);
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), `${r.c}\n`);
}
