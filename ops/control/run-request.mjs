import fs from 'node:fs';
import {createJournal,toClientState} from '../../src/server/controlBoard.mjs';
export const allowedControlEvents=['create','meta','checkpoint','decision','evidence','failure','resolve','close','reopen','instruction_result'];
export function executeControlRequest(journal,request,actor){
 if(!request||Array.isArray(request)||Object.keys(request).some(k=>!['requestId','op','expectedRevision','type','taskId','data'].includes(k)))throw Error('REQUEST_INVALID');
 if(typeof request.requestId!=='string'||!/^enc-control-[a-zA-Z0-9_-]{8,90}$/.test(request.requestId))throw Error('REQUEST_ID_INVALID');
 if(typeof actor!=='string'||!/^NIA vía GitHub: [a-zA-Z0-9_\[\]-]{1,100}$/.test(actor))throw Error('ACTOR_INVALID');
 if(request.op==='read')return toClientState(journal.read());
 if(request.op!=='event'||!allowedControlEvents.includes(request.type)||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)throw Error('REQUEST_ACTION_INVALID');
 if(!request.data||Array.isArray(request.data)||typeof request.data!=='object'||JSON.stringify(request).length>24000)throw Error('REQUEST_DATA_INVALID');
 return toClientState(journal.append(request.expectedRevision,request.type,request.taskId,request.data,actor,request.requestId));
}
if(process.argv[1]?.endsWith('run-request.mjs')){
 const [requestFile,journalDir,actor]=process.argv.slice(2);
 const request=JSON.parse(fs.readFileSync(requestFile,'utf8'));
 const state=executeControlRequest(createJournal(journalDir),request,actor);
 // Operational state only. Credentials are neither read nor emitted by this program.
 const output={requestId:request.requestId,revision:state.revision,tasks:state.tasks,events:state.events.slice(-30)};
 process.stdout.write('ENC_CONTROL_STATE_JSON='+JSON.stringify(output)+'\n');
}
