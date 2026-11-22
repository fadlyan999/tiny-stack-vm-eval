import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';
# agent edit 1: add comment line after imports
const I=process.env.MAKEFUN_INPUT_DIR??'/input'; const O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
# agent edit 2: second line (real code)
const S=256,C=64;M=256;L=1e6;U=65536;
