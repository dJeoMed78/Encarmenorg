import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'dJeoMed78';
const REPO = 'Encarmenorg';

// Protegidas contra escritura directa desde AI Studio
const FORBIDDEN_BRANCHES = ['main', 'ia-desarrollo', 'google-ai-studio-limpieza'];

function getCurrentGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (branch && branch !== 'HEAD') return branch;
  } catch (_) {}
  return null;
}

// Determinación segura de la rama destino
const targetBranch = process.env.WORK_BRANCH ||
                     process.env.GIT_BRANCH ||
                     process.argv[2] ||
                     getCurrentGitBranch() ||
                     'work/ENC-GOOGLE-DEV-ISOLATION-001';

const commitMessage = process.env.COMMIT_MESSAGE ||
                      (process.argv[3] && !process.argv[3].startsWith('work/') ? process.argv[3] : null) ||
                      process.argv[2] && !process.argv[2].startsWith('work/') ? process.argv[2] : null ||
                      `chore(isolation): setup worker isolation in ${targetBranch}`;

// 1. Barrera estricta de seguridad
if (FORBIDDEN_BRANCHES.includes(targetBranch) && !process.env.ALLOW_PROTECTED_PUSH) {
  console.error('\n' + '='.repeat(70));
  console.error(`[SECURITY ERROR]: Intento de push directo a rama protegida '${targetBranch}'.`);
  console.error('Google AI Studio (Trabajador 04) tiene prohibido modificar directamente:');
  console.error('  - main (producción)');
  console.error('  - ia-desarrollo (integración administrada por coordinación)');
  console.error('  - google-ai-studio-limpieza (auditoría)');
  console.error('Todas las tareas deben publicarse exclusivamente en ramas `work/<ID>`.');
  console.error('='.repeat(70) + '\n');
  process.exit(1);
}

if (!GITHUB_TOKEN) {
  console.error('[GitHub Push Error]: No hay GITHUB_TOKEN disponible en el entorno.');
  process.exit(1);
}

const headers = {
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent': 'AI-Studio-Worker-04'
};

async function ghRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API error on ${method} ${endpoint}: ${res.status} - ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  console.log(`[GitHub Push Seguro] Destino: ${OWNER}/${REPO} en rama '${targetBranch}'`);

  // 1. Verificar si la rama existe en el remoto
  let baseCommitSha = null;
  let isNewBranch = false;

  try {
    const refData = await ghRequest(`/git/ref/heads/${targetBranch}`);
    baseCommitSha = refData.object.sha;
    console.log(`[GitHub Push] Rama '${targetBranch}' existente detectada. SHA base: ${baseCommitSha}`);
  } catch (err) {
    // Si la rama no existe, se crea a partir del HEAD de ia-desarrollo
    console.log(`[GitHub Push] La rama '${targetBranch}' no existe en remoto. Obteniendo HEAD de 'ia-desarrollo'...`);
    const iaRef = await ghRequest('/git/ref/heads/ia-desarrollo');
    baseCommitSha = iaRef.object.sha;
    isNewBranch = true;
    console.log(`[GitHub Push] Base inicial de ia-desarrollo: ${baseCommitSha}`);
  }

  const commitData = await ghRequest(`/git/commits/${baseCommitSha}`);
  const baseTreeSha = commitData.tree.sha;
  console.log(`[GitHub Push] Base tree: ${baseTreeSha}`);

  // 2. Archivos modificados relevantes para la sincronización de la tarea
  const filesToPush = [
    { path: 'scripts/github_push.mjs', localPath: 'scripts/github_push.mjs' },
    { path: 'docs/DEV_WORKFLOW_ISOLATION.md', localPath: 'docs/DEV_WORKFLOW_ISOLATION.md' }
  ];

  // Añadir cualquier archivo que haya sido modificado según git
  try {
    const gitDiffFiles = execSync('git diff --name-only origin/ia-desarrollo', { encoding: 'utf8' })
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    for (const f of gitDiffFiles) {
      if (!f.startsWith('wp-content/') && !f.startsWith('public/wp-content/') && fs.existsSync(f)) {
        filesToPush.push({ path: f, localPath: f });
      }
    }
  } catch (_) {}

  // Deduplicar lista de archivos
  const uniqueFilesMap = new Map();
  for (const item of filesToPush) {
    if (fs.existsSync(item.localPath)) {
      uniqueFilesMap.set(item.path, item);
    }
  }
  const uniqueFiles = Array.from(uniqueFilesMap.values());
  console.log(`[GitHub Push] Subiendo ${uniqueFiles.length} archivos a '${targetBranch}'...`);

  // 3. Crear blobs para cada archivo
  const treeItems = [];
  for (const f of uniqueFiles) {
    const buf = fs.readFileSync(f.localPath);
    const blobRes = await ghRequest('/git/blobs', 'POST', {
      content: buf.toString('base64'),
      encoding: 'base64'
    });
    console.log(`[GitHub Push] Blob creado para ${f.path}: ${blobRes.sha.slice(0, 7)}`);
    treeItems.push({
      path: f.path,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha
    });
  }

  if (treeItems.length === 0) {
    console.log('[GitHub Push] No hay archivos modificados para subir.');
    return;
  }

  // 4. Crear nuevo árbol
  const newTree = await ghRequest('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeItems
  });
  console.log(`[GitHub Push] Nuevo árbol creado: ${newTree.sha}`);

  // 5. Crear el commit
  const newCommit = await ghRequest('/git/commits', 'POST', {
    message: commitMessage,
    tree: newTree.sha,
    parents: [baseCommitSha],
    author: {
      name: 'Google AI Studio — Trabajador 04',
      email: '22005951@es.uveg.edu.mx',
      date: new Date().toISOString()
    }
  });
  console.log(`[GitHub Push] Commit creado exitosamente: ${newCommit.sha}`);

  // 6. Actualizar o crear la referencia de la rama
  if (isNewBranch) {
    const createdRef = await ghRequest('/git/refs', 'POST', {
      ref: `refs/heads/${targetBranch}`,
      sha: newCommit.sha
    });
    console.log(`[GitHub Push] ¡Rama creada exitosamente en ${createdRef.ref} con SHA ${createdRef.object.sha}!`);
  } else {
    const updatedRef = await ghRequest(`/git/refs/heads/${targetBranch}`, 'PATCH', {
      sha: newCommit.sha,
      force: false
    });
    console.log(`[GitHub Push] ¡Rama '${targetBranch}' actualizada exitosamente a ${updatedRef.object.sha}!`);
  }
}

run().catch((err) => {
  console.error('[GitHub Push Error]:', err);
  process.exit(1);
});
