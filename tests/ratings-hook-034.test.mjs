import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const empty={average:0,count:0,hasRated:false,userRating:null};
const confirmed={average:5,count:1,distribution:{1:0,2:0,3:0,4:0,5:1}};
test('React: late confirmation refresh cannot overwrite vote; double send, switch, failure and remount',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/'});
 const prior={window:globalThis.window,document:globalThis.document,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const reads=[],writes=[];let current;
 const source=fs.readFileSync('src/utils/realRatings.ts','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
 const context=vm.createContext({useEffect:React.useEffect,useRef:React.useRef,useState:React.useState,window:dom.window,Event:dom.window.Event,localStorage:dom.window.localStorage,crypto:globalThis.crypto,RatingApiError:class extends Error{},fetchBusinessRating:(id)=>{const d=deferred();reads.push({id,...d});return d.promise},submitBusinessRating:(payload)=>{const d=deferred();writes.push({payload,...d});return d.promise}});
 vm.runInContext(stripTypeScriptTypes(source,{mode:'transform'}),context);
 function View({id}){current=context.useBusinessRatings(id);return React.createElement('span',null,current.loading?'loading':current.error||`${current.summary.average}/${current.summary.count}`)}
 const root=createRoot(dom.window.document.getElementById('root'));
 try{
 await act(async()=>root.render(React.createElement(View,{id:'one'})));assert.equal(current.loading,true);
 await act(async()=>reads[0].resolve(empty));assert.equal(current.summary.count,0);
 let first,second;await act(async()=>{first=current.rate(5);second=current.rate(5)});assert.equal(writes.length,1);assert.equal(await second,null);
 await act(async()=>{writes[0].resolve({stats:confirmed});await first});assert.equal(current.saved,true);assert.equal(current.summary.count,1);assert.equal(reads.length,2);
 await act(async()=>reads[1].resolve(empty));assert.equal(current.summary.count,1);assert.equal(current.summary.average,5);
 await act(async()=>dom.window.dispatchEvent(new dom.window.Event('focus')));
 await act(async()=>root.render(React.createElement(View,{id:'two'})));
 await act(async()=>reads[3].resolve({...empty,average:4,count:2}));
 await act(async()=>reads[2].resolve(empty));assert.equal(current.summary.average,4);assert.equal(current.key,'two');
 await act(async()=>dom.window.dispatchEvent(new dom.window.Event('focus')));
 await act(async()=>reads[4].reject(Error('offline')));assert.equal(current.available,false);assert.match(current.error,/consultar/);
 await act(async()=>root.unmount());
 const fresh=createRoot(dom.window.document.getElementById('root'));
 await act(async()=>fresh.render(React.createElement(View,{id:'one'})));
 await act(async()=>reads[5].resolve({...confirmed,hasRated:true,userRating:5}));assert.equal(current.summary.count,1);assert.equal(current.summary.hasRated,true);
 await act(async()=>{dom.window.dispatchEvent(new dom.window.Event('focus'));fresh.unmount()});
 await act(async()=>reads[6].resolve(empty));
 }finally{Object.assign(globalThis,prior);dom.window.close()}
});
