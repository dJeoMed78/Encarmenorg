#!/usr/bin/env node
// ENC-F007A-MOBILE-ORDER-001 — ordena calificaciones/comentarios al final en la ficha pública.
// Parche exacto e idempotente para src/components/BusinessPublicDetail.tsx y .css.
// Uso: node scripts/apply-f007a-mobile-order-patch.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TSX_REMOVE = `            <section className="bpd-card bpd-reviews" id="bpd-ratings">
              <h2>
                <Star /> Opiniones de la comunidad
              </h2>
              <StarRatingWidget businessId={b.id} businessName={b.name} />
              <div className="bpd-comments">
                <MessageCircle size={20} />
                <strong>Comentarios todavía no disponibles</strong>
                <p>
                  Puedes calificar con estrellas. Aún no se pueden publicar
                  comentarios ni fotografías de reseñas.
                </p>
              </div>
            </section>
`;
const TSX_INSERT_AFTER = `          </aside>\n        </div>\n        <footer className="bpd-footer">`;
const TSX_REVIEWS = `          <section className="bpd-card bpd-reviews" id="bpd-ratings">\n            <h2>\n              <Star /> Opiniones de la comunidad\n            </h2>\n            <StarRatingWidget businessId={b.id} businessName={b.name} />\n            <div className="bpd-comments">\n              <MessageCircle size={20} />\n              <strong>Comentarios todavía no disponibles</strong>\n              <p>\n                Puedes calificar con estrellas. Aún no se pueden publicar\n                comentarios ni fotografías de reseñas.\n              </p>\n            </div>\n          </section>\n`;
const CSS_BASE_ANCHOR = `.bpd-reviews {\n  padding: 15px;\n}`;
const CSS_BASE_ADD = `\n\n/* ENC-F007A: reviews after business facts on wide screens. */\n.bpd-reviews {\n  grid-column: 1 / -1;\n  grid-row: 3;\n}`;
const CSS_1100_ANCHOR = `  .bpd-facts {\n    grid-row: 3;\n    grid-column: 1/-1;\n    display: grid;\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }`;
const CSS_1100_ADD = `\n\n  /* ENC-F007A: medium screens place reviews below business facts. */\n  .bpd-reviews {\n    grid-column: 1 / -1;\n    grid-row: 4;\n  }`;

const count = (s, part) => (part ? s.split(part).length - 1 : 0);

export const TSX_STEPS = [
  { name: 'mover opiniones después de datos del negocio', find: TSX_REMOVE, replace: '' },
  { name: 'insertar opiniones tras ubicación/horarios/pagos/entrega', find: TSX_INSERT_AFTER, replace: `          </aside>\n${TSX_REVIEWS}        </div>\n        <footer className="bpd-footer">` },
];
export const CSS_STEPS = [
  { name: 'opiniones al final en escritorio', find: CSS_BASE_ANCHOR, replace: CSS_BASE_ANCHOR + CSS_BASE_ADD },
  { name: 'opiniones después de datos en 701-1100px', find: CSS_1100_ANCHOR, replace: CSS_1100_ANCHOR + CSS_1100_ADD },
];

function apply(source, steps) {
  let next = source;
  const applied = [];
  const skipped = [];
  for (const step of steps) {
    // Removal is already complete when the review section exists at its final DOM location.
    if (step.replace === '' && next.includes(`</aside>\n${TSX_REVIEWS}        </div>`) && count(next, step.find) === 0) {
      skipped.push(step.name);
      continue;
    }
    if (step.replace !== '' && count(next, step.replace) === 1) { skipped.push(step.name); continue; }
    const found = count(next, step.find);
    if (found !== 1) throw new Error(`Ancla no válida para "${step.name}": aparece ${found} veces (se esperaba 1). No se modificó nada.`);
    next = next.replace(step.find, () => step.replace);
    applied.push(step.name);
  }
  return { source: next, applied, skipped };
}

export const applyTsxPatch = (source) => apply(source, TSX_STEPS);
export const applyCssPatch = (source) => apply(source, CSS_STEPS);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  try {
    const results = [
      ['src/components/BusinessPublicDetail.tsx', applyTsxPatch(readFileSync('src/components/BusinessPublicDetail.tsx', 'utf8'))],
      ['src/components/BusinessPublicDetail.css', applyCssPatch(readFileSync('src/components/BusinessPublicDetail.css', 'utf8'))],
    ];
    if (!check) for (const [file, result] of results) writeFileSync(file, result.source);
    console.log(JSON.stringify(results.map(([file, result]) => ({ file, mode: check ? 'check' : 'write', applied: result.applied, skipped: result.skipped })), null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
