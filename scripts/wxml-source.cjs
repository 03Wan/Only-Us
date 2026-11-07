// Resolve native includes for source checks without changing the shipped templates.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../miniprogram');

function readWxml(file, ancestors = []) {
  const absolute = path.resolve(file);
  if (ancestors.includes(absolute)) throw new Error(`Circular WXML include: ${absolute}`);
  return fs.readFileSync(absolute, 'utf8').replace(/<include\b[^>]*\bsrc="([^"]+)"[^>]*\/>/g, (_, src) => {
    const included = src.startsWith('/') ? path.join(root, src.slice(1)) : path.resolve(path.dirname(absolute), src);
    return readWxml(included, [...ancestors, absolute]);
  });
}

function wxmlDependencies(file, visited = new Set()) {
  const absolute = path.resolve(file);
  if (visited.has(absolute)) return [];
  visited.add(absolute);
  const files = [absolute];
  for (const match of fs.readFileSync(absolute, 'utf8').matchAll(/<include\b[^>]*\bsrc="([^"]+)"/g)) {
    const src = match[1];
    const included = src.startsWith('/') ? path.join(root, src.slice(1)) : path.resolve(path.dirname(absolute), src);
    files.push(...wxmlDependencies(included, visited));
  }
  return files;
}

module.exports = { readWxml, wxmlDependencies };
