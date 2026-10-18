// Public-only, zero-auth client comparison. No HTML, headers, IP, URLs, cookies or raw exceptions in stdout.
import https from 'node:https';
import {spawn} from 'node:child_process';
import {URLS,assertPublic,statusOf,classifyContentType,classifyPrefix,classifyError,compare,parseCurl} from './feasibility-client-compare-v18-core.mjs';
const MAX_MS = 11000;
const MAX_BYTES = 8192;
function log(label, kind, value) { console.log(`V18_${label}_${kind}=${value}`); }

async function readPrefix(stream) {
  if (!stream) return {prefix: 'EMPTY', read: 'EMPTY'};
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < MAX_BYTES) {
      const {done,value} = await reader.read();
      if (done) break;
      const part = Buffer.from(value);
      chunks.push(part.subarray(0,MAX_BYTES-total));
      total += Math.min(part.length, MAX_BYTES-total);
    }
    return {prefix:classifyPrefix(Buffer.concat(chunks)),read:'OK'};
  } finally {
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
async function nodeFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MAX_MS);
  let http=0, content='UNKNOWN', prefix='NOT_READ', read='FAILED', error='NONE';
  try {
    const resp = await fetch(assertPublic(url), {redirect:'manual', signal:ctrl.signal, headers:{Accept:'text/html'}});
    http = resp.status;
    content = classifyContentType(resp.headers.get('content-type'));
    try {
      const sampled = await readPrefix(resp.body);
      prefix = sampled.prefix;
      read = sampled.read;
    } catch (e) { read = 'FAILED'; error = classifyError(e); }
  } catch (e) { error = classifyError(e); }
  finally {clearTimeout(timer);}
  return {http,content,prefix,read,error};
}
async function nodeHttps(url) {
  assertPublic(url);
  return await new Promise(resolve=>{
    let settled=false, secured=false;
    const finish=(result)=>{if(settled)return; settled=true; resolve(result);};
    const req=https.get(url,{family:4,timeout:MAX_MS,headers:{Accept:'text/html'}},res=>{
      const http=res.statusCode??0;
      const content=classifyContentType(res.headers['content-type']);
      // Only parse a short prefix in memory. Never write response content to disk/log.
      const chunks=[];let n=0;
      res.on('data',chunk=>{
        if(n<MAX_BYTES){chunks.push(Buffer.from(chunk).subarray(0,MAX_BYTES-n)); n+=Math.min(chunk.length,MAX_BYTES-n);}
        if(n>=MAX_BYTES){finish({http,content,prefix:classifyPrefix(Buffer.concat(chunks)),tls:secured?'YES':'UNKNOWN',error:'NONE'});res.destroy();}
      });
      res.on('end',()=>finish({http,content,prefix:classifyPrefix(Buffer.concat(chunks)),tls:secured?'YES':'UNKNOWN',error:'NONE'}));
      res.on('error',e=>finish({http,content,prefix:'NOT_READ',tls:secured?'YES':'UNKNOWN',error:classifyError(e)}));
    });
    req.on('socket',socket=>socket.on('secureConnect',()=>{secured=true;}));
    req.on('timeout',()=>req.destroy(Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})));
    req.on('error',e=>finish({http:0,content:'UNKNOWN',prefix:'NOT_READ',tls:secured?'YES':'NO',error:classifyError(e)}));
  });
}
async function curl(url) {
  assertPublic(url);
  const args=['--silent','--show-error','--http1.1','--ipv4','--proto','=https',
    '--max-redirs','0','--connect-timeout','6','--max-time','11',
    '--output','/dev/null','--user-agent','undici','--header','Accept: text/html',
    '--write-out','%{http_code};%{time_connect};%{time_appconnect};%{time_starttransfer};%{time_total}',url];
  return await new Promise(resolve=>{
    const p=spawn('curl',args,{stdio:['ignore','pipe','ignore']});
    let output='';
    p.stdout.on('data',b=>{if(output.length<200)output+=String(b).slice(0,200-output.length);});
    p.on('error',()=>resolve({http:0,exit:-1,phase:'UNKNOWN'}));
    p.on('close',code=>{
      // Reorder curl write-out fields into parser's documented format.
      const pieces=output.trim().split(';');
      const encoded=pieces.length===5 ? `${pieces[0]};0;${pieces[1]};${pieces[2]};${pieces[3]}` : '';
      resolve(parseCurl(encoded,code));
    });
  });
}
console.log('V18_SCOPE=PUBLIC_PAGES_ONLY');
console.log('V18_AUTHENTICATION=DISABLED');
console.log('V18_PRIVATE_DATA=NONE');
console.log('V18_CLIENT_MATRIX=NODE_FETCH,NODE_HTTPS,CURL');
console.log('V18_RAW_CONTENT_LOGGING=DISABLED');
console.log('V18_NODE_VERSION_MAJOR=' + process.versions.node.split('.')[0]);
for(const [label,url] of URLS){
  const [f,h,c]=await Promise.all([nodeFetch(url),nodeHttps(url),curl(url)]);
  log(label,'FETCH_HTTP',statusOf(f.http));
  log(label,'FETCH_CONTENT_TYPE',f.content);
  log(label,'FETCH_PREFIX',f.prefix);
  log(label,'FETCH_READ',f.read);
  log(label,'FETCH_ERROR',f.error);
  log(label,'HTTPS_HTTP',statusOf(h.http));
  log(label,'HTTPS_TLS',h.tls);
  log(label,'HTTPS_CONTENT_TYPE',h.content);
  log(label,'HTTPS_PREFIX',h.prefix);
  log(label,'HTTPS_ERROR',h.error);
  log(label,'CURL_HTTP',statusOf(c.http));
  log(label,'CURL_PHASE',c.phase);
  log(label,'CURL_EXIT',c.exit);
  log(label,'CLIENT_COMPARISON',compare(f,h,c));
}
console.log('V18_DIAGNOSTIC_DONE=1');
console.log('V18_AUTHENTICATED_ACCESS_NOT_TESTED=1');
