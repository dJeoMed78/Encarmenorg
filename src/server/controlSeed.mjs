export const seedTasks = [
  {
    "id": "ENC-REGISTRO-PUBLICO-001",
    "title": "Registro público de empresas",
    "owner": "Perplexity",
    "priority": "P1",
    "branch": "work/enc-staging-public-media-001",
    "target": "staging",
    "sha": "bdc5a9f70fe6ac689b2f27095eba908dcc7532c1",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "Comprobar alta pública, persistencia tras recarga y manejo de duplicados. La integración histórica no demuestra el funcionamiento actual.",
    "evidence": [
      {
        "id": "github-25",
        "kind": "integrado",
        "scope": "ia-desarrollo",
        "branch": "ia-desarrollo",
        "sha": "bdc5a9f70fe6ac689b2f27095eba908dcc7532c1",
        "url": "https://github.com/dJeoMed78/Encarmenorg/pull/25",
        "observedAt": "2026-10-31T21:24:02Z",
        "details": "GitHub API consultada: merged=true; base=ia-desarrollo. Integración histórica; no acredita despliegue ni prueba funcional.",
        "actor": "Verificación GitHub · 13-nov-2026",
        "verified": true,
        "result": "PASS"
      }
    ],
    "failures": [],
    "closed": false
  },
  {
    "id": "ENC-RADAR-EMPRESAS-043",
    "title": "Radar de empresas · DENUE",
    "owner": "W1",
    "priority": "P1",
    "branch": "work/enc-radar-empresas-043-w1-denue-001",
    "target": "staging",
    "sha": "cc48003aeaf782d13992aae4fbc3b1b53e8fa9e5",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "PR #94 integrada. Pendientes documentados: token DENUE, fuentes individuales, SQL real y aislamiento en Staging. PR #68 es otra entrega y continúa abierta.",
    "evidence": [
      {
        "id": "github-94",
        "kind": "integrado",
        "scope": "ia-desarrollo",
        "branch": "ia-desarrollo",
        "sha": "cc48003aeaf782d13992aae4fbc3b1b53e8fa9e5",
        "url": "https://github.com/dJeoMed78/Encarmenorg/pull/94",
        "observedAt": "2026-11-12T21:16:04Z",
        "details": "GitHub API consultada: merged=true; base=ia-desarrollo. Integración histórica; no acredita despliegue ni prueba funcional.",
        "actor": "Verificación GitHub · 13-nov-2026",
        "verified": true,
        "result": "PASS"
      }
    ],
    "failures": [],
    "closed": false
  },
  {
    "id": "ENC-RADAR-CLASIFICADOS-041",
    "title": "Radar de clasificados",
    "owner": "Nia",
    "priority": "P1",
    "branch": "work/enc-radar-clasificados-041-nia",
    "target": "staging",
    "sha": "d5b056fcc07838164b57bb871a4528e3f60b566c",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "Verificar anuncios de Ciudad del Carmen, precio y contacto desde fuente individual, aprobación explícita y persistencia HTTP. No publicar automáticamente.",
    "evidence": [
      {
        "id": "github-54",
        "kind": "integrado",
        "scope": "ia-desarrollo",
        "branch": "ia-desarrollo",
        "sha": "d5b056fcc07838164b57bb871a4528e3f60b566c",
        "url": "https://github.com/dJeoMed78/Encarmenorg/pull/54",
        "observedAt": "2026-11-06T18:26:48Z",
        "details": "GitHub API consultada: merged=true; base=ia-desarrollo. Integración histórica; no acredita despliegue ni prueba funcional.",
        "actor": "Verificación GitHub · 13-nov-2026",
        "verified": true,
        "result": "PASS"
      }
    ],
    "failures": [],
    "closed": false
  },
  {
    "id": "ENC-MEDIOS-019",
    "title": "Logotipo y fachada independientes",
    "owner": "Nia",
    "priority": "P1",
    "branch": "work/enc-business-gallery-cover-separation-019-nia",
    "target": "staging",
    "sha": "6bdfd009e4269d72b92665465e25bcaa160874dd",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "Comprobar carga y edición independiente de logotipo, fachada y galería, con persistencia y vista pública.",
    "evidence": [
      {
        "id": "github-84",
        "kind": "integrado",
        "scope": "ia-desarrollo",
        "branch": "ia-desarrollo",
        "sha": "6bdfd009e4269d72b92665465e25bcaa160874dd",
        "url": "https://github.com/dJeoMed78/Encarmenorg/pull/84",
        "observedAt": "2026-11-07T21:49:46Z",
        "details": "GitHub API consultada: merged=true; base=ia-desarrollo. Integración histórica; no acredita despliegue ni prueba funcional.",
        "actor": "Verificación GitHub · 13-nov-2026",
        "verified": true,
        "result": "PASS"
      }
    ],
    "failures": [],
    "closed": false
  },
  {
    "id": "ENC-COMENTARIOS-034",
    "title": "Comentarios y moderación",
    "owner": "W1 / Nia",
    "priority": "P2",
    "branch": "work/enc-ratings-comments-034-nia-completion",
    "target": "staging",
    "sha": "11a82832102c59b63e177094cb67f82219566e59",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "Conservar validación histórica del propietario; adjuntar evidencia fechada de envío, visualización y aprobación/rechazo en la versión revisada.",
    "evidence": [
      {
        "id": "github-67",
        "kind": "integrado",
        "scope": "ia-desarrollo",
        "branch": "ia-desarrollo",
        "sha": "11a82832102c59b63e177094cb67f82219566e59",
        "url": "https://github.com/dJeoMed78/Encarmenorg/pull/67",
        "observedAt": "2026-11-07T15:37:10Z",
        "details": "GitHub API consultada: merged=true; base=ia-desarrollo. Integración histórica; no acredita despliegue ni prueba funcional.",
        "actor": "Verificación GitHub · 13-nov-2026",
        "verified": true,
        "result": "PASS"
      }
    ],
    "failures": [],
    "closed": false
  },
  {
    "id": "ENC-BUILD-SERVER-ARTIFACT-20261109-001",
    "title": "Auditoría del build server",
    "owner": "W1",
    "priority": "P1",
    "branch": "ia-desarrollo",
    "target": "staging",
    "sha": "",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "Cierre técnico histórico documentado el 12-nov-2026 para SHA 830602be. Runtime, PID/CWD y hashes constan en Actions 43277110058. No extrapolar ese cierre a otra release.",
    "evidence": [
      {
        "id": "historical-build",
        "kind": "referencia",
        "scope": "staging",
        "branch": "ia-desarrollo",
        "sha": "830602beb0a0b59f009458c5bce8f0a22f46e46a",
        "url": "https://github.com/dJeoMed78/Encarmenorg/actions/runs/43277110058",
        "observedAt": "2026-11-12T18:11:36Z",
        "details": "Registro maestro: cierre técnico de runtime Staging confirmado. Antecedente documental leído; logs no reejecutados en esta sesión.",
        "actor": "Registro maestro",
        "verified": false,
        "result": "PENDIENTE"
      }
    ],
    "failures": [],
    "closed": false
  },
  {
    "id": "ENC-INT-007",
    "title": "Persistencia de altas manuales",
    "owner": "Nia",
    "priority": "P1",
    "branch": "ia-desarrollo",
    "target": "staging",
    "sha": "",
    "status": "pendiente",
    "updatedAt": "2026-11-13T14:20:00.000Z",
    "notes": "PR #93 abierta: SQL-first para eventos, promociones y clasificados. Entrega parcial; faltan CI y pruebas de fallo, cupón claim, limpieza y arranque.",
    "evidence": [
      {
        "id": "pr93",
        "kind": "referencia",
        "scope": "github",
        "branch": "pendiente",
        "sha": "",
        "url": "https://github.com/dJeoMed78/Encarmenorg/pull/93",
        "observedAt": "2026-11-13T14:20:00Z",
        "details": "PR abierta consultada. Implementación parcial; no integrada ni desplegada.",
        "actor": "GitHub",
        "verified": false,
        "result": "PENDIENTE"
      }
    ],
    "failures": [],
    "closed": false
  }
];
