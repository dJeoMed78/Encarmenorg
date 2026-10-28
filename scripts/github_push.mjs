import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

export const OWNER = 'dJeoMed78';
export const REPO = 'Encarmenorg';

// Rama autorizada exclusiva para esta tarea (validación positiva estricta)
// NOTA: Este script está configurado específicamente para la tarea ENC-GOOGLE-DEV-ISOLATION-001.
// No es un mecanismo general de publicación para otras tareas sin autorización previa.
export const AUTHORIZED_TASK_BRANCH = 'work/ENC-GOOGLE-DEV-ISOLATION-001';

// Ramas protegidas críticas (defensa en profundidad)
export const PROTECTED_BRANCHES = ['main', 'ia-desarrollo', 'google-ai-studio-limpieza'];

// Archivos explícitamente autorizados para esta tarea
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
 * Calcula el hash SHA-1 canónico de Git para un buffer dado.
 * Formato: sha1("blob " + size + "\0" + content)
 */
export function computeGitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex');
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
      "[SECURITY ERROR]: La rama destino debe proporcionarse de forma explícita como primer argumento. " +
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
 * Validador estricto de archivos en alcance local.
 * Si existe cualquier archivo modificado fuera de la lista autorizada, se detiene la operación.
 */
export function verifyAuthorizedFiles(changedFiles, authorizedList = AUTHORIZED_TASK_FILES) {
  if (!Array.isArray(changedFiles)) {
    throw new SecurityValidationError("[SECURITY ERROR]: Lista de archivos modificados inválida.");
  }

  const unauthorized = changedFiles.filter((file) => !authorizedList.includes(file));

  if (unauthorized.length > 0) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: Se detectaron archivos fuera del alcance autorizado para esta tarea:\n` +
      unauthorized.map((f) => `  - ${f}`).join('\n') +
      `\nArchivos permitidos exclusivamente:\n` +
      authorizedList.map((f) => `  + ${f}`).join('\n')
    );
  }
}

/**
 * Validador del diff efectivo entre árboles o commits en GitHub.
 * Asegura que el cambio real que se aplicará en el repositorio contenga única
 * y exclusivamente archivos autorizados.
 */
export function verifyEffectiveDiff(diffFiles, authorizedList = AUTHORIZED_TASK_FILES) {
  if (!Array.isArray(diffFiles)) {
    throw new SecurityValidationError("[SECURITY ERROR]: Lista de archivos del diff efectivo inválida.");
  }

  const unauthorized = diffFiles.filter((file) => !authorizedList.includes(file));
  if (unauthorized.length > 0) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: El diff efectivo del commit en GitHub contiene archivos no autorizados:\n` +
      unauthorized.map((f) => `  - ${f}`).join('\n') +
      `\nArchivos permitidos exclusivamente para esta tarea:\n` +
      authorizedList.map((f) => `  + ${f}`).join('\n')
    );
  }

  return {
    hasChanges: diffFiles.length > 0,
    files: diffFiles
  };
}

/**
 * Inspección estricta de Git sin retorno silencioso de listas vacías.
 */
export function getLocalModifiedFiles(execFn = execSync) {
  try {
    // 1. Working tree no committeado
    const trackedModified = execFn('git diff --name-only HEAD', { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    // 2. Índice staged
    const staged = execFn('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    // 3. Archivos untracked
    const untracked = execFn('git ls-files --others --exclude-standard', { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter((filePath) => {
        if (!filePath) return false;
        if (
          filePath.startsWith('.aistudio') ||
          filePath.startsWith('dist/') ||
          filePath.startsWith('public/assets/aistudio/') ||
          filePath.startsWith('public/uploads/') ||
          filePath.startsWith('uploads/') ||
          filePath === 'classifieds_db.json' ||
          filePath === 'events_db.json'
        ) {
          return false;
        }
        return true;
      });

    // 4. Commits locales anteriores respecto al punto de partida (origin/ia-desarrollo)
    let commitsDiff = [];
    try {
      commitsDiff = execFn('git diff --name-only origin/ia-desarrollo...HEAD', { encoding: 'utf8' })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } catch (diffErr) {
      throw new SecurityValidationError(
        `[SECURITY ERROR]: Imposible verificar commits locales anteriores respecto a 'origin/ia-desarrollo': ${diffErr.message}`
      );
    }

    return Array.from(new Set([...trackedModified, ...staged, ...untracked, ...commitsDiff]));
  } catch (err) {
    if (err instanceof SecurityValidationError) {
      throw err;
    }
    throw new SecurityValidationError(
      `[SECURITY ERROR]: Falló la inspección de Git (${err.message}). Publicación abortada para garantizar el alcance.`
    );
  }
}

/**
 * Valida que la copia local no esté desactualizada respecto a la referencia remota base.
 */
export function verifyNotBehind(baseCommitSha, execFn = execSync) {
  if (!baseCommitSha) return;

  try {
    execFn(`git merge-base --is-ancestor ${baseCommitSha} HEAD`, { stdio: 'pipe' });
  } catch (_) {
    throw new SecurityValidationError(
      `[SECURITY ERROR]: La copia local está desactualizada respecto al commit remoto ${baseCommitSha}. ` +
      `Publicación abortada para impedir sobreescritura con versiones obsoletas. Realice sincronización previa.`
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
 * Flujo principal de sincronización con protecciones completas, validación del árbol real y control de concurrencia.
 */
export async function run() {
  console.log('[GitHub Push Seguro] Iniciando verificación de seguridad...');

  // 1. Obtener y validar el destino explícito (única fuente: primer argumento CLI)
  const explicitBranchArg = process.argv[2];
  const targetBranch = validateTargetBranch(explicitBranchArg);
  const commitMessage = resolveCommitMessage(targetBranch);

  console.log(`[GitHub Push Seguro] Rama destino validada positivamente: '${targetBranch}'`);
  console.log(`[GitHub Push Seguro] Mensaje de commit: "${commitMessage}"`);

  // 2. Verificar alcance de archivos locales
  const modifiedFiles = getLocalModifiedFiles();
  verifyAuthorizedFiles(modifiedFiles, AUTHORIZED_TASK_FILES);
  console.log(`[GitHub Push Seguro] Alcance de archivos locales validado (${modifiedFiles.length} detectados, todos autorizados).`);

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
      console.error(`[GitHub Push Seguro] ERROR CRÍTICO al verificar rama remota: ${err.message}`);
      throw err;
    }
  }

  // 4. Validar que la copia local no sea obsoleta respecto a la referencia remota
  if (!isNewBranch) {
    verifyNotBehind(baseCommitSha);
    console.log(`[GitHub Push Seguro] Árbol local comprobado al día respecto al remoto base (${baseCommitSha.slice(0, 7)}).`);
  }

  // 5. Comparar el contenido que se pretende publicar contra el árbol remoto base
  const commitData = await ghRequest(`/git/commits/${baseCommitSha}`);
  const baseTreeSha = commitData.tree.sha;

  // Consultar el árbol remoto base para conocer los blobs existentes
  const baseTreeData = await ghRequest(`/git/trees/${baseTreeSha}`);
  const remoteTreeMap = new Map();
  if (Array.isArray(baseTreeData.tree)) {
    for (const item of baseTreeData.tree) {
      remoteTreeMap.set(item.path, item.sha);
    }
  }

  const treeItems = [];
  let filesWithDiffCount = 0;

  for (const f of AUTHORIZED_TASK_FILES) {
    if (!fs.existsSync(f)) {
      console.warn(`[GitHub Push Seguro] Archivo autorizado omitido por ausencia local: ${f}`);
      continue;
    }
    const buf = fs.readFileSync(f);
    const localBlobSha = computeGitBlobSha(buf);
    const remoteBlobSha = remoteTreeMap.get(f);

    if (remoteBlobSha === localBlobSha) {
      console.log(`[GitHub Push Seguro] Archivo sin cambios efectivos respecto al árbol remoto: ${f} (${localBlobSha.slice(0, 7)})`);
    } else {
      filesWithDiffCount++;
      console.log(`[GitHub Push Seguro] Cambio efectivo detectado en ${f}: remoto=${remoteBlobSha ? remoteBlobSha.slice(0, 7) : 'nuevo'} -> local=${localBlobSha.slice(0, 7)}`);
    }

    const blobRes = await ghRequest('/git/blobs', 'POST', {
      content: buf.toString('base64'),
      encoding: 'base64'
    });
    treeItems.push({
      path: f,
      mode: '100644',
      type: 'blob',
      sha: blobRes.sha
    });
  }

  // Regla: si no hay diferencias efectivas entre el contenido local y el árbol remoto, evitar commit redundante
  if (filesWithDiffCount === 0) {
    console.log('[GitHub Push Seguro] Ninguno de los archivos autorizados presenta cambios respecto al árbol base.');
    console.log('[GitHub Push Seguro] Operación completada: no se crean commits innecesarios con diff vacío.');
    return { created: false, reason: 'empty_diff' };
  }

  // 6. Crear el nuevo árbol
  const newTree = await ghRequest('/git/trees', 'POST', {
    base_tree: baseTreeSha,
    tree: treeItems
  });
  console.log(`[GitHub Push Seguro] Árbol creado: ${newTree.sha}`);

  if (newTree.sha === baseTreeSha) {
    console.log('[GitHub Push Seguro] El árbol generado es idéntico al árbol base remoto. Operación completada sin crear commit.');
    return { created: false, reason: 'identical_tree' };
  }

  // 7. Crear el commit candidato
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
  console.log(`[GitHub Push Seguro] Commit candidato creado: ${newCommit.sha}`);

  // 8. Validación final del diff efectivo antes de actualizar cualquier referencia remota
  const compareData = await ghRequest(`/compare/${baseCommitSha}...${newCommit.sha}`);
  const effectiveDiffFiles = Array.isArray(compareData.files) ? compareData.files.map((cf) => cf.filename) : [];

  const diffValidation = verifyEffectiveDiff(effectiveDiffFiles, AUTHORIZED_TASK_FILES);
  if (!diffValidation.hasChanges) {
    console.log('[GitHub Push Seguro] La comparación contra el commit base indica diff vacío. No se actualiza la referencia.');
    return { created: false, reason: 'empty_compare_diff' };
  }
  console.log(`[GitHub Push Seguro] Diff efectivo en GitHub validado positivamente: [${effectiveDiffFiles.join(', ')}].`);

  // 9. Actualización con control de concurrencia y force: false
  if (isNewBranch) {
    const createdRef = await ghRequest('/git/refs', 'POST', {
      ref: `refs/heads/${targetBranch}`,
      sha: newCommit.sha
    });
    console.log(`[GitHub Push Seguro] Rama creada exitosamente en ${createdRef.ref} (${createdRef.object.sha})`);
  } else {
    // Control de concurrencia Nivel 1: re-verificar SHA remoto antes del PATCH
    const verifyRef = await ghRequest(`/git/ref/heads/${targetBranch}`);
    if (verifyRef.object.sha !== baseCommitSha) {
      throw new ConcurrencyError(
        `[CONCURRENCY ERROR]: La rama remota '${targetBranch}' fue modificada concurrentemente ` +
        `(esperado: ${baseCommitSha}, actual: ${verifyRef.object.sha}). ` +
        `Operación abortada para evitar sobreescritura de cambios ajenos.`
      );
    }

    // Control de concurrencia Nivel 2: PATCH con force: false
    try {
      const updatedRef = await ghRequest(`/git/refs/heads/${targetBranch}`, 'PATCH', {
        sha: newCommit.sha,
        force: false
      });
      console.log(`[GitHub Push Seguro] ¡Rama '${targetBranch}' actualizada a ${updatedRef.object.sha} (Fast-forward, sin force)!`);
      return { created: true, sha: updatedRef.object.sha };
    } catch (patchErr) {
      if (patchErr instanceof GitHubApiError && patchErr.status === 422) {
        throw new ConcurrencyError(
          `[CONCURRENCY ERROR]: GitHub rechazó la actualización (HTTP 422) porque la referencia ya no es fast-forward. ` +
          `Otro trabajador o proceso actualizó la rama en el intervalo de publicación.`
        );
      }
      throw patchErr;
    }
  }
}

// Ejecución directa si se invoca desde línea de comandos
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  run().catch((err) => {
    console.error(`\n[GitHub Push Falló]: ${err.message}\n`);
    process.exit(1);
  });
}
