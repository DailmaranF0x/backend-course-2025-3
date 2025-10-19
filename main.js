#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
  .requiredOption('-i, --input <path>', 'path to input file')
  .option('-o, --output <path>', 'path to output file')
  .option('-d, --display', 'display result to console')
  .option('-v, --variety', 'include variety field in output')
  .option('-l, --length <number>', 'only records with petal.length greater than value');

program.parse(process.argv);

const opts = program.opts();

if (!opts.input) {
  console.error('Please, specify input file');
  process.exit(1);
}

const inputPath = path.resolve(opts.input);

if (!fs.existsSync(inputPath)) {
  console.error('Cannot find input file');
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(inputPath, 'utf8');
} catch (err) {
  console.error('Cannot find input file');
  process.exit(1);
}

let items = [];
const trimmed = raw.trim();
try {
  if (trimmed.startsWith('[')) {
    items = JSON.parse(trimmed);
  } else {
    items = trimmed
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => JSON.parse(l));
  }
} catch (err) {
  console.error('Error parsing input file:', err.message);
  process.exit(1);
}

function getField(obj, key) {
  if (obj == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  const parts = key.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return undefined;
  }
  return cur;
}

let result = items;
if (opts.length !== undefined) {
  const threshold = Number(opts.length);
  if (Number.isNaN(threshold)) {
    console.error('Length parameter is not a number');
    process.exit(1);
  }
  result = result.filter(rec => {
    const val = getField(rec, 'petal.length');
    const num = typeof val === 'string' ? Number(val) : val;
    if (num === undefined || num === null) return false;
    return Number(num) > threshold;
  });
}

if (!opts.variety) {
  result = result.map(rec => {
    if (rec && Object.prototype.hasOwnProperty.call(rec, 'variety')) {
      const copy = { ...rec };
      delete copy.variety;
      return copy;
    }
    return rec;
  });
}

const outStr = JSON.stringify(result, null, 2);

if (!opts.output && !opts.display) {
  process.exit(0);
}

if (opts.output) {
  const outPath = path.resolve(opts.output);
  try {
    fs.writeFileSync(outPath, outStr, 'utf8');
  } catch (err) {
    console.error('Error writing output file:', err.message);
    process.exit(1);
  }
}

if (opts.display) {
  console.log(outStr);
}
