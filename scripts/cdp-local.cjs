// Local developer-tools diagnostics only. Never shipped in the miniprogram.
const fs=require('node:fs');
async function connect(match){
 const targets=await fetch('http://127.0.0.1:9222/json/list').then(r=>r.json());
 const target=targets.find(match);if(!target)throw new Error('Target not found');
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP connect timeout')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=e=>{clearTimeout(timer);reject(e);};});
 let id=0;const pending=new Map();
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(new Error('CDP timeout: '+method));},12000);pending.set(n,m=>{clearTimeout(timer);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 return {send,evaluate,close:()=>ws.close(),target};
}
module.exports={connect};
if(require.main===module)(async()=>{const c=await connect(t=>t.url.includes(process.argv[2]||'__pageframe__'));try{const result=await c.evaluate(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(result,null,2));}finally{c.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
