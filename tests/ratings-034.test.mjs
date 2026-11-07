import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const api=fs.readFileSync('src/services/api.ts','utf8');
const section=api.slice(api.indexOf('export interface BusinessRatingStats'));
const code=stripTypeScriptTypes(section,{mode:'transform'}).replaceAll('export ','');
const context=vm.createContext({fetch:()=>{},adminFetch:()=>{},API_BASE:'/api'});vm.runInContext(code,context);
for(const [name,value,valid] of [
 ['zero',{average:0,count:0,distribution:{1:0,2:0,3:0,4:0,5:0}},true],
 ['one',{average:5,count:1,distribution:{1:0,2:0,3:0,4:0,5:1}},true],
 ['multiple',{average:3,count:2,distribution:{1:1,2:0,3:0,4:0,5:1}},true],
 ['wrong count',{average:3,count:3,distribution:{1:1,2:0,3:0,4:0,5:1}},false],
 ['wrong mean',{average:4,count:2,distribution:{1:1,2:0,3:0,4:0,5:1}},false],
 ['negative',{average:5,count:1,distribution:{1:-1,2:0,3:0,4:0,5:2}},false],
 ['incomplete',{average:5,count:1,distribution:{5:1}},false],
 ['legacy optional',{average:5,count:1},true],
])test(name,()=>{if(valid)assert.equal(context.parseRatingStats(value).count,value.count);else assert.throws(()=>context.parseRatingStats(value));});
for(const status of [400,404,409,503])test('HTTP '+status,async()=>{context.adminFetch=async()=>({ok:false,status,json:async()=>({message:'rejected'})});await assert.rejects(context.fetchBusinessRating(1),e=>e.status===status);});
test('invalid JSON',async()=>{context.adminFetch=async()=>({ok:true,json:async()=>{throw Error('invalid')}});await assert.rejects(context.fetchBusinessRating(1));});
test('no false write success',async()=>{context.adminFetch=async()=>({ok:true,json:async()=>({success:false})});await assert.rejects(context.submitBusinessRating({businessId:1,visitorId:'synthetic',rating:5}));});
test('confirmed vote',async()=>{context.adminFetch=async()=>({ok:true,json:async()=>({success:true,rating:5,reviewCount:1,stats:{average:5,count:1,distribution:{1:0,2:0,3:0,4:0,5:1}}})});assert.equal((await context.submitBusinessRating({businessId:1,visitorId:'synthetic',rating:5})).success,true);});
test('invalid stars never sent',async()=>{context.adminFetch=()=>{throw Error('must not send')};for(const rating of [0,6,1.5,'5'])await assert.rejects(context.submitBusinessRating({businessId:1,visitorId:'synthetic',rating}),e=>e.status===400);});
