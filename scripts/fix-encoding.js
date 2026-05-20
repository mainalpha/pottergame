'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'client');

const REPLACEMENTS = [
  [/motionless-div/g, 'div'],
  [/вЂ¦/g, '\u2026'],
  [/вЂ"/g, '\u2014'],
  [/вЂ"/g, '\u2014'],
  [/вЂў/g, '\u2022'],
  [/рџ—Ў️рџ—Ў️/g, '\u{1F5E1}\uFE0F\u{1F5E1}\uFE0F'],
  [/рџ“њ/g, '\u{1F4DC}'],
  [/пёЏ/g, '\uFE0F'],
  [/рџЄ„/g, '\u{1FA84}'],
  [/рџ§™/g, '\u{1F9D9}'],
  [/рџљЄ/g, '\u{1F6AA}'],
  [/рџ¤–/g, '\u{1F916}'],
  [/рџ—ЎпёЏ/g, '\u{1F5E1}\uFE0F'],
  [/рџ¦…/g, '\u{1F985}'],
  [/рџ¦Ѓ/g, '\u{1F981}'],
  [/рџђЌ/g, '\u{1F40D}'],
  [/рџ¦Ў/g, '\u{1F9A1}'],
  [/рџЏ°/g, '\u{1F3F0}'],
  [/рџ’ѕ/g, '\u{1F4BE}'],
  [/рџЏі/g, '\u{1F3F3}'],
  [/рџ”Ѓ/g, '\u{1F501}'],
  [/рџ”„/g, '\u{1F504}'],
  [/рџ’Ђ/g, '\u{1F480}'],
  [/вњЁ/g, '\u2728'],
  [/вљЎ/g, '\u26A1'],
  [/вљњ/g, '\u269C'],
  [/вљ”/g, '\u2694'],
  [/вљ”пёЏ/g, '\u2694\uFE0F'],
  [/В·/g, '\u00B7']
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(html|js|css)$/.test(name)) out.push(p);
  }
  return out;
}

for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [re, rep] of REPLACEMENTS) {
    const next = text.replace(re, rep);
    if (next !== text) {
      text = next;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, text, 'utf8');
    console.log('fixed:', path.relative(ROOT, file));
  }
}

console.log('done');
