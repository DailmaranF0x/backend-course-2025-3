#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Параметри командного рядка
program
  .option('-i, --input <path>', 'path to input file')
  .option('-o, --output <path>', 'path to output file')
  .option('-d, --display', 'display result to console')
  .option('-v, --variety', 'include variety field in output')
  .option('-l, --length <number>', 'only records with petal.length greater than value');

program.parse(process.argv);
const opts = program.opts();

// Перевірка обовʼязкового параметру
if (!opts.input) {
  console.error('Please, specify input file');
  process.exit(1);
}

const inputPath = path.resolve(opts.input);

// Перевірка на існування файлу
if (!fs.existsSync(inputPath)) {
  console.error('Cannot find input file');
  process.exit(1);
}

// Зчитування файлу
let raw;
try {
  raw = fs.readFileSync(inputPath, 'utf8');
} catch (err) {
  console.error('Cannot find input file');
  process.exit(1);
}

// Парсинг JSON
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

// Функція для безпечного доступу до вкладених полів
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

// Фільтрування за довжиною пелюстки
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

// Видалення поля variety, якщо параметр не заданий
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

// Перетворення у JSON
const outStr = JSON.stringify(result, null, 2);

// Якщо не задано -o та -d — нічого не виводимо
if (!opts.output && !opts.display) {
  process.exit(0);
}

// Запис у файл, якщо задано -o
if (opts.output) {
  const outPath = path.resolve(opts.output);
  try {
    fs.writeFileSync(outPath, outStr, 'utf8');
  } catch (err) {
    console.error('Error writing output file:', err.message);
    process.exit(1);
  }
}

// Вивід у консоль, якщо задано -d
if (opts.display) {
  console.log(outStr);
}
