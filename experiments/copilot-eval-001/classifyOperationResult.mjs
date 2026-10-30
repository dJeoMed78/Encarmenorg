const INVALID_RESULT = Object.freeze({
  state: 'INVALID',
  confirmed: false,
  retryable: false,
});

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const result = (state, confirmed, retryable) => ({
  state,
  confirmed,
  retryable,
});

export function classifyOperationResult(input) {
  if (!isPlainObject(input)) {
    return INVALID_RESULT;
  }

  const hasNetworkError = Object.hasOwn(input, 'networkError');
  if (hasNetworkError && typeof input.networkError !== 'boolean') {
    return INVALID_RESULT;
  }

  if (input.networkError === true) {
    return result('UNCERTAIN', false, true);
  }

  if (
    typeof input.status !== 'number' ||
    !Number.isInteger(input.status) ||
    input.status < 100 ||
    input.status > 599
  ) {
    return INVALID_RESULT;
  }

  if (input.status >= 200 && input.status <= 299) {
    if (!isPlainObject(input.body)) {
      return result('UNCERTAIN', false, true);
    }

    if (!Object.hasOwn(input.body, 'success') || typeof input.body.success !== 'boolean') {
      return result('UNCERTAIN', false, true);
    }

    return input.body.success
      ? result('CONFIRMED', true, false)
      : result('REJECTED', false, false);
  }

  if ([400, 401, 403, 404, 409, 422].includes(input.status)) {
    return result('REJECTED', false, false);
  }

  if (input.status === 408 || input.status === 429 || input.status >= 500) {
    return result('UNCERTAIN', false, true);
  }

  return result('UNCERTAIN', false, false);
}
