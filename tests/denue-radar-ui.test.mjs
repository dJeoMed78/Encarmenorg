import test from 'node:test';import assert from 'node:assert/strict';
import React,{act} from 'react';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('React radar: no automatic search or selection; review, select, deselect, discard, explicit approval and honest errors',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://synthetic.invalid'});const previous={};
  for(const key of ['window','document','navigator','HTMLElement','Event','MouseEvent']){previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});}
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  let searches=0,approved=[],fail=false;
  const candidate=id=>({denueId:id,name:'<img src=x onerror=alert(1)> Sintética '+id,address:'CALLE DE PRUEBA '+id,geography:'VERIFICADA',duplicate:'NUEVO',latitude:null,longitude:null,activity:'Prueba',consultedAt:'2026-11-12T00:00:00.000Z'});
  globalThis.__denueTestApi={searchDenue:async()=>{searches++;return {candidates:['90000000001','90000000002','90000000003'].map(candidate),nextPage:null};},approveDenue:async list=>{if(fail)throw Error('SQL no confirmado');approved=list;return {confirmed:list.map(c=>({...c,id:c.denueId})),results:list.map(c=>({denueId:c.denueId,success:true}))};}};
  const result=await build({entryPoints:[new URL('../src/components/DenueBusinessRadar.tsx',import.meta.url).pathname],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',plugins:[{name:'isolated-denue',setup(b){b.onResolve({filter:/services\/denueApi$/},()=>({path:'mock',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const searchDenue=(...a)=>globalThis.__denueTestApi.searchDenue(...a);export const approveDenue=(...a)=>globalThis.__denueTestApi.approveDenue(...a);'}));}}]});
  const module={exports:{}};vm.runInThisContext(`(function(require,module,exports){${result.outputFiles[0].text}\n})`)(require,module,module.exports);
  const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root'));let notifications=0;
  const click=async button=>act(async()=>{button.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));});
  const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
  try{
    await act(async()=>root.render(React.createElement(module.exports.DenueBusinessRadar,{isOpen:true,onClose(){},onBusinessApproved(){notifications++;}})));
    assert.equal(searches,0);await click(button('Consultar DENUE'));assert.equal(searches,1);assert.equal(approved.length,0);
    assert.equal(document.querySelectorAll('img').length,0);assert.ok(document.body.textContent.includes('<img src=x'));
    const cards=[...document.querySelectorAll('article')];assert.equal(cards.length,3);
    assert.equal(cards[0].querySelector('button[aria-pressed]').disabled,true);
    for(const card of cards.slice(0,2))await click(card.querySelector('input[type=checkbox]'));
    await click(cards[0].querySelector('button[aria-pressed]'));await click(cards[1].querySelector('button[aria-pressed]'));
    assert.ok(document.body.textContent.includes('2 seleccionados'));
    await click(cards[1].querySelector('button[aria-pressed]'));assert.ok(document.body.textContent.includes('1 seleccionados'));
    await click([...cards[2].querySelectorAll('button')].find(b=>b.textContent==='Descartar de esta consulta'));assert.equal(document.querySelectorAll('article').length,2);
    assert.equal(approved.length,0);
    const link=cards[0].querySelector('a');assert.equal(link.rel,'noopener noreferrer');assert.match(link.href,/idee=90000000001$/);
    await click(button('Revisar y aprobar selección'));await click(button('Cancelar'));assert.equal(approved.length,0);
    fail=true;await click(button('Revisar y aprobar selección'));await click(button('Confirmar publicación'));
    assert.ok(document.body.textContent.includes('SQL no confirmado'));assert.equal(document.querySelectorAll('article').length,2);assert.equal(notifications,0);
    fail=false;await click(button('Revisar y aprobar selección'));await click(button('Confirmar publicación'));
    assert.equal(approved.length,1);assert.equal(notifications,1);assert.equal(document.querySelectorAll('article').length,1);
    await click(button('La ficha no abre o no coincide'));assert.ok(document.body.textContent.includes('Fuente no disponible'));
    assert.equal(document.querySelector('button[aria-pressed]').disabled,true);
  }finally{await act(async()=>root.unmount());dom.window.close();for(const [k,d]of Object.entries(previous)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}delete globalThis.__denueTestApi;}
});
