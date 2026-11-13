import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/control/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/control/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/control/index.html', import.meta.url), 'utf8');

test('primary board is an issue table with three requested columns', () => {
  assert.match(app, /function issueTable\(ts\)/);
  for (const heading of ['Issue / tarea', 'Trabajo en proceso', 'Estatus final']) {
    assert.ok(app.includes(heading), heading);
  }
  assert.match(app, /if\(view==='board'\).*issueTable\(ts\)/);
  assert.match(app, /data-task=/);
});

test('issue click opens existing control and instruction dialog', () => {
  assert.match(app, /\$\$\('\[data-task\]'\)/);
  assert.match(app, /detail\(el\.dataset\.task\)/);
  assert.match(app, /TUS INSTRUCCIONES PARA NIA/);
  assert.match(app, /function progress\(t\)/);
});

test('closure explicitly distinguishes task evidence from overall deployment', () => {
  assert.match(app, /corresponden exclusivamente a la versión objetivo/);
  assert.match(app, /Sin acreditar/);
  assert.match(app, /REQUISITOS PARA CERRAR/);
  assert.match(css, /\.issues-table/);
  assert.match(html, /issues-table-v1/);
});
