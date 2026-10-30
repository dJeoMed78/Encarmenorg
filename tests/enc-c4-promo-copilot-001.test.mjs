import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile('src/components/AdminPromotionsTab.tsx', 'utf8');

function extractHandler(marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `handler not found: ${marker}`);
  const end = source.indexOf('\n  };', start);
  assert.notEqual(end, -1, `handler end not found: ${marker}`);
  return source.slice(start, end + 6);
}

function evaluateHandler(handler, context) {
  const sandbox = vm.createContext(context);
  const executable = handler
    .replace(/: React\.ChangeEvent<HTMLInputElement>/g, '')
    .replace(/: React\.FormEvent/g, '')
    .replace(/: any/g, '')
    .replace(/: Promotion/g, '');
  return vm.runInContext(`(function () { ${executable}; return ${executable.match(/const (handle\w+)/)[1]}; })()`, sandbox);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function uploadHarness({ uploadResult = { success: true, url: '/uploads/new.webp' }, upload } = {}) {
  const state = {
    image: '/uploads/old.webp',
    imageData: '',
    preview: '',
    unconfirmed: false,
    uploading: false,
    error: null,
    calls: 0,
  };
  const context = {
    promoImageGeneration: { current: 0 },
    compressFlyerImage: async () => 'data:image/webp;base64,LOCAL',
    uploadBusinessLogo: async (...args) => {
      state.calls += 1;
      return upload ? upload(...args) : uploadResult;
    },
    setPromoImage: value => { state.image = value; },
    setPromoImageData: value => { state.imageData = value; },
    setPromoImagePreview: value => { state.preview = value; },
    setPromoImageUnconfirmed: value => { state.unconfirmed = value; },
    setIsUploadingPromoImg: value => { state.uploading = value; },
    setErrorMsg: value => { state.error = value; },
    console,
  };
  return { state, context, handler: evaluateHandler(extractHandler('const handlePromoImageUpload ='), context) };
}

async function uploadOnce(options) {
  const harness = uploadHarness(options);
  await harness.handler({ target: { files: [{ name: 'flyer.webp' }] } });
  return harness.state;
}

test('successful upload stores the confirmed remote URL', async () => {
  const state = await uploadOnce();
  assert.equal(state.image, '/uploads/new.webp');
  assert.equal(state.preview, '');
  assert.equal(state.unconfirmed, false);
  assert.equal(state.uploading, false);
});

for (const status of [500, 503]) {
  test(`HTTP ${status} failure preserves the previous image`, async () => {
    const state = await uploadOnce({
      uploadResult: { success: false, message: `HTTP ${status}` },
    });
    assert.equal(state.image, '/uploads/old.webp');
    assert.equal(state.preview, '');
    assert.equal(state.unconfirmed, true);
    assert.equal(state.error, `HTTP ${status}`);
  });
}

test('network failure preserves the previous image and exposes an error', async () => {
  const state = await uploadOnce({
    upload: async () => { throw new Error('network down'); },
  });
  assert.equal(state.image, '/uploads/old.webp');
  assert.equal(state.error, 'No se confirmó la carga de la imagen.');
});

test('success:false is not treated as a confirmed upload', async () => {
  const state = await uploadOnce({
    uploadResult: { success: false, message: 'not confirmed' },
  });
  assert.equal(state.image, '/uploads/old.webp');
  assert.equal(state.unconfirmed, true);
});

test('success:true without a URL is rejected', async () => {
  const state = await uploadOnce({ uploadResult: { success: true } });
  assert.equal(state.image, '/uploads/old.webp');
  assert.equal(state.error, 'No se confirmó la carga de la imagen.');
});

test('a data URL response is not accepted as a remote image', async () => {
  const state = await uploadOnce({
    uploadResult: { success: true, url: 'data:image/webp;base64,REMOTE' },
  });
  assert.equal(state.image, '/uploads/old.webp');
  assert.equal(state.error, 'No se confirmó la carga de la imagen.');
});

test('upload B wins when it finishes before upload A', async () => {
  const first = deferred();
  const second = deferred();
  const harness = uploadHarness({
    upload: () => (harness.state.calls === 1 ? first.promise : second.promise),
  });
  const uploadA = harness.handler({ target: { files: [{ name: 'a.webp' }] } });
  await new Promise(resolve => setImmediate(resolve));
  const uploadB = harness.handler({ target: { files: [{ name: 'b.webp' }] } });
  await new Promise(resolve => setImmediate(resolve));
  second.resolve({ success: true, url: '/uploads/b.webp' });
  await uploadB;
  first.resolve({ success: true, url: '/uploads/a.webp' });
  await uploadA;
  assert.equal(harness.state.image, '/uploads/b.webp');
  assert.equal(harness.state.uploading, false);
});

test('a late upload response cannot replace a newer result', async () => {
  const first = deferred();
  const second = deferred();
  const harness = uploadHarness({
    upload: () => (harness.state.calls === 1 ? first.promise : second.promise),
  });
  const uploadA = harness.handler({ target: { files: [{ name: 'a.webp' }] } });
  await new Promise(resolve => setImmediate(resolve));
  const uploadB = harness.handler({ target: { files: [{ name: 'b.webp' }] } });
  await new Promise(resolve => setImmediate(resolve));
  second.resolve({ success: true, url: '/uploads/b.webp' });
  await uploadB;
  first.resolve({ success: true, url: '/uploads/a.webp' });
  await uploadA;
  assert.notEqual(harness.state.image, '/uploads/a.webp');
});

function formHarness(overrides = {}) {
  const state = {
    formId: 'promo-1',
    image: '',
    imageData: '',
    preview: '',
    unconfirmed: false,
    uploading: false,
    title: 'Updated title',
    error: null,
    saving: false,
    ...overrides,
  };
  const context = {
    isSaving: state.saving,
    isUploadingPromoImg: state.uploading,
    promoImageUnconfirmed: state.unconfirmed,
    promoImage: state.image,
    promoImageData: state.imageData,
    formId: state.formId,
    selectedBizId: 7,
    promoTitle: state.title,
    promoDiscount: '10% OFF',
    promoDescription: 'Description',
    promoTotal: 5,
    promoValidUntil: '31 de Octubre, 2026',
    promoOwnerEmail: 'owner@example.test',
    promoOwnerWhatsapp: '9381458462',
    promoTerms: 'Terms',
    businesses: [{ id: 7, name: 'Business', phone: '9381458462' }],
    cleanPhoneNumber: value => value,
    extractCleanPhone: () => '9381458462',
    saveAdminPromotion: async payload => {
      state.payload = payload;
      return { success: true, message: 'saved' };
    },
    setErrorMsg: value => { state.error = value; },
    setSuccessMsg: value => { state.success = value; },
    setIsSaving: value => { state.saving = value; },
    handleResetForm: () => { state.reset = true; },
    loadData: () => {},
    setActiveSubTab: value => { state.activeTab = value; },
    window: { dispatchEvent: () => {} },
  };
  return { state, context };
}

test('editing historical base64 keeps it confirmed, not pending', () => {
  const state = { image: '', imageData: '', preview: '', unconfirmed: false };
  const context = {
    promoImageGeneration: { current: 0 },
    invalidatePromoImageOperation() {},
    setFormId: () => {},
    setSelectedBizId: () => {},
    setPromoTitle: () => {},
    setPromoDiscount: () => {},
    setPromoDescription: () => {},
    setPromoTotal: () => {},
    setPromoValidUntil: () => {},
    setPromoOwnerEmail: () => {},
    setPromoOwnerWhatsapp: () => {},
    setPromoImage: value => { state.image = value; },
    setPromoImageData: value => { state.imageData = value; },
    setPromoImagePreview: value => { state.preview = value; },
    setPromoImageUnconfirmed: value => { state.unconfirmed = value; },
    setPromoTerms: () => {},
    setActiveSubTab: () => {},
    cleanPhoneNumber: value => value,
  };
  const edit = evaluateHandler(extractHandler('const handleEditPromo ='), context);
  edit({
    id: 'promo-1',
    businessId: 7,
    title: 'Old',
    discount: '10%',
    description: 'Old description',
    promoImage: 'data:image/webp;base64,HISTORICAL',
    promoImageData: '',
  });
  assert.equal(state.image, '');
  assert.equal(state.imageData, 'data:image/webp;base64,HISTORICAL');
  assert.equal(state.unconfirmed, false);
});

test('saving only a title preserves historical image data', async () => {
  const { state, context } = formHarness({
    imageData: 'data:image/webp;base64,HISTORICAL',
  });
  const save = evaluateHandler(extractHandler('const handleSavePromo ='), context);
  await save({ preventDefault() {} });
  assert.equal(state.payload.promoImageData, 'data:image/webp;base64,HISTORICAL');
  assert.equal(state.payload.title, 'Updated title');
});

test('confirmed replacement clears historical data so it cannot hide the new URL', async () => {
  const state = await uploadOnce({
    uploadResult: { success: true, url: 'https://cdn.example/new.webp' },
  });
  assert.equal(state.image, 'https://cdn.example/new.webp');
  assert.equal(state.imageData, '');
});

test('failed replacement preserves a historical remote URL', async () => {
  const state = await uploadOnce({
    uploadResult: { success: false, message: 'HTTP 503' },
  });
  assert.equal(state.image, '/uploads/old.webp');
  assert.equal(state.preview, '');
});

test('a local preview is never placed in the persisted image field', async () => {
  const state = await uploadOnce({
    uploadResult: { success: false, message: 'rejected' },
  });
  assert.equal(state.image.startsWith('data:'), false);
  assert.equal(state.imageData.startsWith('data:'), false);
});

test('an empty file selection does not start an upload', async () => {
  const harness = uploadHarness();
  await harness.handler({ target: { files: [] } });
  assert.equal(harness.state.calls, 0);
  assert.equal(harness.state.uploading, false);
});

test('editing a historical remote URL does not mark it as unconfirmed', () => {
  const state = { image: '', imageData: '', preview: '', unconfirmed: true };
  const context = {
    invalidatePromoImageOperation() {},
    setFormId: () => {},
    setSelectedBizId: () => {},
    setPromoTitle: () => {},
    setPromoDiscount: () => {},
    setPromoDescription: () => {},
    setPromoTotal: () => {},
    setPromoValidUntil: () => {},
    setPromoOwnerEmail: () => {},
    setPromoOwnerWhatsapp: () => {},
    setPromoImage: value => { state.image = value; },
    setPromoImageData: value => { state.imageData = value; },
    setPromoImagePreview: value => { state.preview = value; },
    setPromoImageUnconfirmed: value => { state.unconfirmed = value; },
    setPromoTerms: () => {},
    setActiveSubTab: () => {},
    cleanPhoneNumber: value => value,
  };
  const edit = evaluateHandler(extractHandler('const handleEditPromo ='), context);
  edit({ id: 'promo-1', businessId: 7, title: 'Old', discount: '10%', description: '', promoImage: '/uploads/old.webp' });
  assert.equal(state.image, '/uploads/old.webp');
  assert.equal(state.imageData, '');
  assert.equal(state.unconfirmed, false);
});

test('reset clears the local preview and historical image state', () => {
  const state = { image: 'old', imageData: 'historical', preview: 'local', unconfirmed: true };
  const context = {
    invalidatePromoImageOperation() {},
    setFormId: () => {},
    businesses: [],
    setSelectedBizId: () => {},
    setPromoTitle: () => {},
    setPromoDiscount: () => {},
    setPromoDescription: () => {},
    setPromoTotal: () => {},
    setPromoValidUntil: () => {},
    setPromoOwnerEmail: () => {},
    setPromoOwnerWhatsapp: () => {},
    extractCleanPhone: () => '',
    setPromoImage: value => { state.image = value; },
    setPromoImageData: value => { state.imageData = value; },
    setPromoImagePreview: value => { state.preview = value; },
    setPromoImageUnconfirmed: value => { state.unconfirmed = value; },
    setPromoTerms: () => {},
    setBizSearchQuery: () => {},
  };
  const reset = evaluateHandler(extractHandler('const handleResetForm ='), context);
  reset();
  assert.deepEqual(state, { image: '', imageData: '', preview: '', unconfirmed: false });
});

test('save is blocked while an upload is pending', async () => {
  const { state, context } = formHarness({ uploading: true });
  const save = evaluateHandler(extractHandler('const handleSavePromo ='), context);
  let prevented = 0;
  await save({ preventDefault() { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(state.payload, undefined);
  assert.match(state.error, /previsualización/);
});

test('save is blocked for an unconfirmed preview', async () => {
  const { state, context } = formHarness({ unconfirmed: true });
  const save = evaluateHandler(extractHandler('const handleSavePromo ='), context);
  await save({ preventDefault() {} });
  assert.equal(state.payload, undefined);
  assert.match(state.error, /previsualización/);
});

test('double save is ignored while the first save is active', async () => {
  const { state, context } = formHarness({ saving: true });
  const save = evaluateHandler(extractHandler('const handleSavePromo ='), context);
  await save({ preventDefault() {} });
  assert.equal(state.payload, undefined);
});

test('saving preserves the remaining promotion fields', async () => {
  const { state, context } = formHarness({
    image: 'https://cdn.example/current.webp',
    imageData: 'data:image/webp;base64,HISTORICAL',
  });
  const save = evaluateHandler(extractHandler('const handleSavePromo ='), context);
  await save({ preventDefault() {} });
  assert.equal(state.payload.description, 'Description');
  assert.equal(state.payload.discount, '10% OFF');
  assert.equal(state.payload.promoImage, 'https://cdn.example/current.webp');
  assert.equal(state.payload.promoImageData, 'data:image/webp;base64,HISTORICAL');
});

test('reset invalidates a pending upload', async () => {
  const pending = deferred();
  const harness = uploadHarness({ upload: () => pending.promise });
  const resetContext = {
    invalidatePromoImageOperation: () => {
      harness.context.promoImageGeneration.current += 1;
      harness.state.uploading = false;
    },
    setFormId: () => {},
    businesses: [],
    setSelectedBizId: () => {},
    setPromoTitle: () => {},
    setPromoDiscount: () => {},
    setPromoDescription: () => {},
    setPromoTotal: () => {},
    setPromoValidUntil: () => {},
    setPromoOwnerEmail: () => {},
    setPromoOwnerWhatsapp: () => {},
    extractCleanPhone: () => '',
    setPromoImage: () => {},
    setPromoImageData: () => {},
    setPromoImagePreview: () => {},
    setPromoImageUnconfirmed: () => {},
    setPromoTerms: () => {},
    setBizSearchQuery: () => {},
  };
  const reset = evaluateHandler(extractHandler('const handleResetForm ='), resetContext);
  const upload = harness.handler({ target: { files: [{ name: 'a.webp' }] } });
  await new Promise(resolve => setImmediate(resolve));
  reset();
  pending.resolve({ success: true, url: '/uploads/late.webp' });
  await upload;
  assert.equal(harness.state.image, '/uploads/old.webp');
});

test('editing another promotion invalidates the previous upload', async () => {
  const pending = deferred();
  const harness = uploadHarness({ upload: () => pending.promise });
  const editContext = {
    invalidatePromoImageOperation: () => { harness.context.promoImageGeneration.current += 1; },
    setFormId: () => {},
    setSelectedBizId: () => {},
    setPromoTitle: () => {},
    setPromoDiscount: () => {},
    setPromoDescription: () => {},
    setPromoTotal: () => {},
    setPromoValidUntil: () => {},
    setPromoOwnerEmail: () => {},
    setPromoOwnerWhatsapp: () => {},
    setPromoImage: value => { harness.state.image = value; },
    setPromoImageData: value => { harness.state.imageData = value; },
    setPromoImagePreview: value => { harness.state.preview = value; },
    setPromoImageUnconfirmed: value => { harness.state.unconfirmed = value; },
    setPromoTerms: () => {},
    setActiveSubTab: () => {},
    cleanPhoneNumber: value => value,
  };
  const edit = evaluateHandler(extractHandler('const handleEditPromo ='), editContext);
  const upload = harness.handler({ target: { files: [{ name: 'a.webp' }] } });
  await new Promise(resolve => setImmediate(resolve));
  edit({ id: 'promo-2', businessId: 8, title: 'Other', discount: '5%', description: '' });
  pending.resolve({ success: true, url: '/uploads/late.webp' });
  await upload;
  assert.notEqual(harness.state.image, '/uploads/late.webp');
});

test('remove/reset invalidation leaves the previous request unable to restore a poster', () => {
  assert.match(source, /invalidatePromoImageOperation\(\);\s*\n\s*setPromoImage\(''\)/);
  assert.match(source, /onClick=\{\(\) => \{\s*invalidatePromoImageOperation\(\);/);
});
