import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export const OWNER = 'dJeoMed78';
export const REPO = 'Encarmenorg';

// Rama autorizada exclusiva para esta tarea (validación positiva estricta)
export const AUTHORIZED_TASK_BRANCH = 'work/ENC-GOOGLE-DEV-ISOLATION-001';

// Ramas protegidas críticas (defensa en profundidad)
export const PROTECTED_BRANCHES = ['main', 'ia-desarrollo', 'google-ai-studio-limpieza'];

// Archivos explícitamente autorizados para la tarea
export const AUTHORIZED_TASK_FILES = [
  'scripts/github_push.mjs',
  'docs/DEV_WORKFLOW_ISOLATION.md'
];

export class GitHubApiError extends Error {
  constructor(status, statusText, endpoint, data) {
    super(`GitHub API error on ${endpoint}: HTTP ${status} ${statusText} - ${JSON.stringify(data)}`);
    this.name = 'GitHubApiError';
    this.status = status;
    this.statusText = statusText;
    this.endpoint = endpoint;
    this.data = data;
  }
}

export class SecurityValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityValidationError';
  }
}

export class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

/**
 * Validador estricto y positivo de la rama destino.
 * No admite variables para omitir seguridad ni ramas implícitas/ambiguas.
 */
export function validateTargetBranch(branchInput, env = process.env) {
  // 1. Prohibición absoluta de excepciones o bypass
  if (env && ('ALLOW_PROTECTED_PUSH' in env)) {
    throw new SecurityValidationError(
      "[SECURITY ERROR]: Se detectó la variable 'ALLOW_PROTECTED_PUSH'. " +
      "Las excepciones de protección fueron eliminadas por completo. Publicación cancelada."
    );
  }

  // 2. Comprobar presencia explícita de la rama destino
  if (!branchInput || typeof branchInput !== 'string' || branchInput.trim() === '') {
    throw new SecurityValidationError(
      "[SECURITY ERROR]: La rama destino debe proporcionarse de forma explícita. " +
      "No se permite selección implícita ni valores por defecto no declarados."
    );
  }

  const trimmedBranch = branchInput.trim();

  // 3. Rechazo de ramas protegidas
  if (PROTECTED_BRANCHES.includes(trimmedBranch)) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: Intento de push directo a rama protegida '${trimmedBranch}'. ` +
      `Google AI Studio (Trabajador 04) tiene prohibido modificar 'main', 'ia-desarrollo' y 'google-ai-studio-limpieza'.`
    );
  }

  // 4. Validación positiva estricta: debe coincidir exactamente con la rama autorizada
  if (trimmedBranch !== AUTHORIZED_TASK_BRANCH) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: La rama '${trimmedBranch}' no está autorizada. ` +
      `La única rama autorizada para esta tarea es exclusivamente '${AUTHORIZED_TASK_BRANCH}'.`
    );
  }

  // 5. Validación de formato de referencia Git
  if (!/^work\/[a-zA-Z0-9._-]+$/.test(trimmedBranch)) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: Formato de rama inválido '${trimmedBranch}'. Debe cumplir patrón seguro work/<ID>.`
    );
  }

  return trimmedBranch;
}

/**
 * Determinación no ambigua del mensaje de commit.
 * Elimina problemas de precedencia entre operadores condicionales y lógicos.
 */
export function resolveCommitMessage(targetBranch, argv = process.argv, env = process.env) {
  // 1. Argumento posicional CLI (argv[3] si argv[2] es la rama)
  if (Array.isArray(argv) && argv.length > 3 && typeof argv[3] === 'string') {
    const rawArg = argv[3].trim();
    if (rawArg.length > 0) {
      return rawArg;
    }
  }

  // 2. Variable de entorno explícita COMMIT_MESSAGE
  if (env && typeof env.COMMIT_MESSAGE === 'string') {
    const rawEnv = env.COMMIT_MESSAGE.trim();
    if (rawEnv.length > 0) {
      return rawEnv;
    }
  }

  // 3. Mensaje predeterminado inequívoco para la tarea autorizada
  return `chore(isolation): update worker isolation in ${targetBranch}`;
}

/**
 * Validador estricto de archivos en alcance.
 * Si existe cualquier archivo modificado fuera de la lista autorizada, se detiene la operación.
 */
export function verifyAuthorizedFiles(changedFiles, authorizedList = AUTHORIZED_TASK_FILES) {
  if (!Array.isArray(changedFiles)) {
    throw new SecurityValidationError("[SECURITY ERROR]: Lista de archivos modificados inválida.");
  }

  const unauthorized = changedFiles.filter((file) => !authorizedList.includes(file));

  if (unauthorized.length > 0) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: Se detectaron archivos modificados fuera del alcance autorizado:\n` +
      unauthorized.map((f) => `  - ${f}`).join('\n') +
      `\nArchivos permitidos exclusivamente para esta tarea:\n` +
      authorizedList.map((f) => `  + ${f}`).join('\n')
    );
  }
}

/**
 * Cliente HTTP para la API REST de GitHub con clasificación de errores.
 */
export async function ghRequest(endpoint, method = 'GET', body = null, token = process.env.GITHUB_TOKEN) {
  if (!token) {
    throw new SecurityValidationError('[GitHub Push Error]: No hay GITHUB_TOKEN configurado en el entorno.');
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Studio-Worker-04-SecureSync'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    const err = new Error(`Fallo de red al conectar con GitHub API (${method} ${endpoint}): ${netErr.message}`);
    err.name = 'NetworkError';
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    throw new GitHubApiError(res.status, res.statusText, endpoint, data);
  }

  return data;
}

/**
 * Obtiene lista de archivos modificados localmente que no sean artefactos transitorios del entorno.
 */
export function getLocalModifiedFiles() {
  try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
    const lines = statusOutput.split('\n').filter(Boolean);
    const files = [];

    for (const line of lines) {
      const filePath = line.slice(3).trim();
      // Filtrar carpetas transitorias de AI Studio y directorios locales volátiles
      if (
        filePath.startsWith('.aistudio') ||
        filePath.startsWith('dist/') ||
        filePath.startsWith('public/assets/aistudio/') ||
        filePath === 'classifieds_db.json' ||
        filePath === 'events_db.json'
      ) {
        continue;
      }
      files.push(filePath);
    }
    return files;
  } catch (_) {
    return [];
  }
}

/**
 * Flujo principal de sincronización con protecciones completas.
 */
export async function run() {
  console.log('[GitHub Push Seguro] Iniciando verificación de seguridad...');

  // 1. Obtener y validar el destino explícito (única fuente: primer argumento CLI)
  const explicitBranchArg = process.argv[2];
  const targetBranch = validateTargetBranch(explicitBranchArg);
  const commitMessage = resolveCommitMessage(targetBranch);

  console.log(`[GitHub Push Seguro] Rama destino validada positivamente: '${targetBranch}'`);
  console.log(`[GitHub Push Seguro] Mensaje de commit: "${commitMessage}"`);

  // 2. Verificar que no haya archivos fuera de alcance en el diff local
  const modifiedFiles = getLocalModifiedFiles();
  verifyAuthorizedFiles(modifiedFiles, AUTHORIZED_TASK_FILES);
  console.log(`[GitHub Push Seguro] Alcance de archivos validado (${modifiedFiles.length} detectados, todos autorizados).`);

  // 3. Inspeccionar el estado de la referencia remota diferenciando HTTP 404 de otros errores
  let baseCommitSha = null;
  let isNewBranch = false;

  try {
    const refData = await ghRequest(`/git/ref/heads/${targetBranch}`);
    baseCommitSha = refData.object.sha;
    console.log(`[GitHub Push Seguro] Rama '${targetBranch}' existente en remoto. SHA base actual: ${baseCommitSha}`);
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      console.log(`[GitHub Push Seguro] Rama '${targetBranch}' no existe en remoto (HTTP 404). Obteniendo HEAD de 'ia-desarrollo'...`);
      const iaRef = await ghRequest('/git/ref/heads/ia-desarrollo');
      baseCommitSha = iaRef.object.sha;
      isNewBranch = true;
      console.log(`[GitHub Push Seguro] Base de creación desde ia-desarrollo: ${baseCommitSha}`);
    } else {
      // HTTP 401, 403, 429, 500 o fallos de red: DETENER INMEDIATAMENTE
      console.error(`[GitHub Push Seguro] ERROR CRÍTICO al verificar rama remota: ${err.message}`);
      throw err;
    }
  }

  // 4. Preparar blobs exclusivamente de los archivos autorizados que existen localmente
  const commitData = await ghRequest(`/git/commits/${baseCommitSha}`);
  const baseTreeSha = commitData.tree.sha;

  const treeItems = [];
  for (const f of AUTHORIZED_TASK_FILES) {
    if (!fs.existsSync(f)) {
      console.warn(`[GitHub Push Seguro] Archivo autorizado omitido por ausencia local: ${f}`);
      continue;
    }
    const buf = fs.readFileSync(f);
    const blobRes = await ghRequest('/git/blobs', 'POST', {
      content: buf.toString('base64'),
      encoding: 'base64'
    });
    console.log(`[GitHub Push Seguro] Blob creado para ${f} (${blobRes.sha.slice(0, 7)})`);
    treeItems.push({
      path: f,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha
    });
  }

  if (treeItems.length === 0) {
    console.log('[GitHub Push Seguro] No hay archivos autorizados para subir.');
    return;
  }

  // 5. Crear el árbol y el nuevo commit
  const newTree = await ghRequest('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeItems
  });
  console.log(`[GitHub Push Seguro] Árbol creado: ${newTree.sha}`);

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
  console.log(`[GitHub Push Seguro] Commit creado: ${newCommit.sha}`);

  // 6. Actualización segura y control de concurrencia
  if (isNewBranch) {
    const createdRef = await ghRequest('/git/refs', 'POST', {
      ref: `refs/heads/${targetBranch}`,
      sha: newCommit.sha
    });
    console.log(`[GitHub Push Seguro] Rama creada exitosamente en ${createdRef.ref} (${createdRef.object.sha})`);
  } else {
    // Control de concurrencia: re-verificar que el SHA remoto no haya cambiado
    const verifyRef = await ghRequest(`/git/ref/heads/${targetBranch}`);
    if (verifyRef.object.sha !== baseCommitSha) {
      throw new ConcurrencyError(
        `[CONCURRENCY ERROR]: La rama remota '${targetBranch}' fue modificada concurrentemente ` +
        `(esperado: ${baseCommitSha}, actual: ${verifyRef.object.sha}). ` +
        `Operación cancelada para evitar sobreescritura de cambios ajenos.`
      );
    }

    const updatedRef = await ghRequest(`/git/refs/heads/${targetBranch}`, 'PATCH', {
      sha: newCommit.sha,
      force: false
    });
    console.log(`[GitHub Push Seguro] ¡Rama '${targetBranch}' actualizada a ${updatedRef.object.sha} (Fast-forward, sin force)!`);
  }
}

// Ejecución directa si se invoca desde línea de comandos
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  run().catch((err) => {
    console.error(`\n[GitHub Push Falló]: ${err.message}\n`);
    process.exit(1);
  });
}
