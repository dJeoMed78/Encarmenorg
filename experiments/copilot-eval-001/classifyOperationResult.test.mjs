import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOperationResult } from './classifyOperationResult.mjs';

const expectedKeys = ['state', 'confirmed', 'retryable'];

function assertResult(input, expected) {
  const actual = classifyOperationResult(input);
  assert.deepEqual(actual, expected);
  assert.deepEqual(Object.keys(actual).sort(), expectedKeys.slice().sort());
}

test('confirms HTTP 200 with success true', () => {
  assertResult(
    { status: 200, body: { success: true } },
    { state: 'CONFIRMED', confirmed: true, retryable: false },
  );
});

test('confirms HTTP 201 with success true', () => {
  assertResult(
    { status: 201, body: { success: true } },
    { state: 'CONFIRMED', confirmed: true, retryable: false },
  );
});

test('marks HTTP 204 without body uncertain', () => {
  assertResult(
    { status: 204 },
    { state: 'UNCERTAIN', confirmed: false, retryable: true },
  );
});

test('rejects HTTP 200 with success false', () => {
  assertResult(
    { status: 200, body: { success: false } },
    { state: 'REJECTED', confirmed: false, retryable: false },
  );
});

for (const status of [401, 403, 409, 422]) {
  test(`rejects HTTP ${status}`, () => {
    assertResult(
      { status },
      { state: 'REJECTED', confirmed: false, retryable: false },
    );
  });
}

for (const status of [408, 429, 500]) {
  test(`marks HTTP ${status} uncertain and retryable`, () => {
    assertResult(
      { status },
      { state: 'UNCERTAIN', confirmed: false, retryable: true },
    );
  });
}

test('marks a network error uncertain and retryable', () => {
  assertResult(
    { status: 200, body: { success: true }, networkError: true },
    { state: 'UNCERTAIN', confirmed: false, retryable: true },
  );
});

test('rejects a status string as invalid', () => {
  assertResult(
    { status: '200', body: { success: true } },
    { state: 'INVALID', confirmed: false, retryable: false },
  );
});

test('rejects NaN status as invalid', () => {
  assertResult(
    { status: Number.NaN },
    { state: 'INVALID', confirmed: false, retryable: false },
  );
});

test('rejects null input as invalid', () => {
  assertResult(null, { state: 'INVALID', confirmed: false, retryable: false });
});

test('rejects array input as invalid', () => {
  assertResult([], { state: 'INVALID', confirmed: false, retryable: false });
});

test('does not accept success as a string', () => {
  assertResult(
    { status: 200, body: { success: 'true' } },
    { state: 'UNCERTAIN', confirmed: false, retryable: true },
  );
});

test('does not use inherited success', () => {
  const body = Object.create({ success: true });
  assertResult(
    { status: 200, body },
    { state: 'UNCERTAIN', confirmed: false, retryable: true },
  );
});

test('rejects a non-boolean networkError', () => {
  assertResult(
    { status: 200, body: { success: true }, networkError: 'false' },
    { state: 'INVALID', confirmed: false, retryable: false },
  );
});

test('rejects a decimal status', () => {
  assertResult(
    { status: 200.5 },
    { state: 'INVALID', confirmed: false, retryable: false },
  );
});

test('does not mutate input or body', () => {
  const input = { status: 200, body: { success: true } };
  const before = structuredClone(input);
  classifyOperationResult(input);
  assert.deepEqual(input, before);
});

test('returns invalid for an empty object', () => {
  assertResult({}, { state: 'INVALID', confirmed: false, retryable: false });
});

test('networkError takes precedence over invalid status', () => {
  assertResult(
    { status: 'not-a-status', networkError: true },
    { state: 'UNCERTAIN', confirmed: false, retryable: true },
  );
});

test('accepts omitted networkError', () => {
  assertResult(
    { status: 200, body: { success: true } },
    { state: 'CONFIRMED', confirmed: true, retryable: false },
  );
});
