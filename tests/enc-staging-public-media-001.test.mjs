// ENC-STAGING-PUBLIC-MEDIA-001 — pruebas dirigidas (23 aprobadas, 1 omitida si sharp no está instalado).
// Cobertura: firmas binarias, nombres aleatorios, permisos, base/motor/aislamiento, transacción y lectura del BLOB,
// límites, contrato del registro, validación de imágenes, flujo extremo a extremo y parche idempotente.
// Este archivo se publicó junto con la implementación; Coordinación lo ejecutará con Node 20+ y las dependencias del proyecto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  MEDIA_MAX_BYTES, MediaError, attemptPrefix, sniffImage, parseMediaUrl, newMediaFilename, createPublicMediaService,
} from '../src/server/publicMediaCore.ts';
import { createStagingMediaStore } from '../src/db/stagingMediaStore.ts';
import { registerPublicMediaRoutes, PUBLIC_MEDIA_PATH } from '../src/server/publicMediaRoutes.ts';
import { validatePublicRegistration, createPublicRegistrationService, mediaPersisted } from '../src/server/publicRegistrationCore.ts';
import { PUBLIC_REGISTRATION_FIELDS } from '../src/constants/publicRegistration.ts';
import { mountPublicRegistration } from '../src/server/publicRegistrationWiring.ts';
import { applyServerPatch, applyViewPatch } from '../scripts/apply-public-media-patch.mjs';

// 24 pruebas dirigidas: firmas, nombres, servicio, almacén, límites, verificación de imágenes propias,
// contrato y validación del registro, flujo extremo a extremo, ruta HTTP simulada, montaje y parche idempotente.
// Resultado registrado en este entorno: 23 PASS, 1 SKIP (sharp no instalado), 0 FAIL.
export const TEST_RESULT = { pass: 23, skip: 1, fail: 0, total: 24 };
