import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Compile the actual server helper; replace only the Next.js server-only marker.
const errorModule = { exports: {} };
new Function('exports', ts.transpileModule(readFileSync(new URL('../lib/api-error.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(errorModule.exports);
const helper = { exports: {} };
const env = { WEBS_BOT_URL: 'https://mcp.mobilut.com', WEBS_BOT_SECRET: 'test-secret' };
let fetchImpl;
new Function('require', 'exports', 'process', 'fetch', ts.transpileModule(readFileSync(new URL('../lib/webs/bot.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(
  name => name === 'server-only' ? {} : name === '@/lib/api-error' ? errorModule.exports : require(name), helper.exports, { env }, (...args) => fetchImpl(...args));
const { callWebsBot } = helper.exports;

test('WAF HTML retries the same signed read on the trusted Worker', async () => {
  const calls = [];
  fetchImpl = async (url, options) => { calls.push({ url, options }); return calls.length === 1 ? new Response('<html>Blocked</html>', { status: 403 }) : Response.json({site:{slug:'demo'}}); };
  assert.equal((await callWebsBot('/cms/overview', {op:'site'})).data.site.slug, 'demo');
  assert.equal(calls[1].url, 'https://webs-bot.crimson-bonus-69e4.workers.dev/cms/overview');
  assert.equal(calls[0].options.body, calls[1].options.body);
  const options = calls[1].options;
  assert.equal(options.headers['x-webs-signature'], createHmac('sha256','test-secret').update(`${options.headers['x-webs-timestamp']}.${options.body}`).digest('hex'));
  assert.equal(options.redirect, 'error');
});
test('application permission denial is returned without retry', async () => {
  let calls = 0; fetchImpl = async () => { calls++; return Response.json({error:'No access'}, {status:403}); };
  assert.equal((await callWebsBot('/cms/overview', {})).status,403); assert.equal(calls,1);
});
test('network failure retries read-only overview', async () => {
  let calls = 0; fetchImpl = async () => { if (++calls === 1) throw new TypeError('network'); return Response.json({sites:[]}); };
  assert.deepEqual((await callWebsBot('/cms/overview', {})).data,{sites:[]}); assert.equal(calls,2);
});
test('failed endpoints produce a useful 503', async () => {
  fetchImpl = async () => {throw new Error('timeout')};
  await assert.rejects(callWebsBot('/cms/overview', {}), e => e.status === 503 && /nedostupný/.test(e.message));
});
test('HTML never becomes a successful empty overview', async () => {
  fetchImpl = async () => new Response('<html>Blocked</html>');
  await assert.rejects(callWebsBot('/cms/overview', {}), e => e.status === 502);
});
test('mutating chat calls are never replayed', async () => {
  let calls=0; fetchImpl=async()=>{calls++;throw new Error('network')};
  await assert.rejects(callWebsBot('/cms/chat',{op:'send'})); assert.equal(calls,1);
});
test('unrelated bot URLs receive no implicit fallback', async () => {
  env.WEBS_BOT_URL='https://other.example';let calls=0;
  fetchImpl=async()=>{calls++;return new Response('not found',{status:404})};
  try {await assert.rejects(callWebsBot('/cms/overview',{}));assert.equal(calls,1);} finally {env.WEBS_BOT_URL='https://mcp.mobilut.com'}
});

function overviewAccessHarness({source='user',collaborator=false,github={private:false,permissions:{push:false}},denied=false,signedIn=true}={}){
 const calls=[],user={id:'account-1',email:'info@leadmarket.cz'},access={token:'private-test-token',source};
 const compile=(file,deps)=>{const exports={};new Function('require','exports',ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{if(name in deps)return deps[name];throw Error('Unexpected dependency '+name)},exports);return exports;};
 const overview=compile('lib/webs/overview-access.ts',{
  'server-only':{},'@/db':{db:{query:{collaboratorTable:{findFirst:async({where})=>{calls.push(['collaborator',where]);return collaborator?{id:1}:null}}}}},
  '@/lib/collaborator-access':{collaboratorMatchesUserForRepo:(actor,owner,repo)=>({userId:actor.id,owner,repo})},
  '@/lib/utils/octokit':{createOctokitInstance:token=>{assert.equal(token,access.token);return {rest:{repos:{get:async scope=>{calls.push(['github',scope]);if(github instanceof Error)throw github;return {data:github}}}}}}},
 });
 const route=compile('app/api/[owner]/[repo]/[branch]/webs-overview/route.ts',{
  '@/lib/token':{getToken:async(actor,owner,repo)=>{calls.push(['token',actor.id,owner,repo]);if(denied)throw Object.assign(Error('No repository access'),{status:403});return access}},
  '@/lib/api-error':{createHttpError:(message,status)=>Object.assign(Error(message),{status}),toErrorResponse:error=>Response.json({error:error.message},{status:error.status??500})},
  '@/lib/session-server':{requireApiUserSession:async()=>signedIn?{user}:{response:new Response(null,{status:401})}},
  '@/lib/admin':{hasAdminAccess:()=>false},'@/lib/webs/overview-access':overview,
  '@/lib/webs/bot':{callWebsBot:async(path,payload)=>{calls.push(['bot',path,payload]);return {status:200,data:{site:{slug:'demo'}}}}},
 });
 return {calls,user,access,canRead:overview.canReadSiteOverview,post:(body={},origin='https://cms.example')=>route.POST(new Request('https://cms.example/api/Leadgen-labs/webs-obsah-demo/main/webs-overview',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({owner:'Leadgen-labs',repo:'webs-obsah-demo',branch:'main'})})};
}

test('invited CMS collaborators can read the overview with installation or user tokens',async()=>{
 for(const options of [{source:'installation'},{source:'user',collaborator:true}]){
  const ctx=overviewAccessHarness(options);assert.equal((await ctx.post()).status,200);
  const payload=ctx.calls.find(c=>c[0]==='bot')[2];assert.equal(payload.repositoryAccess,true);assert.equal(payload.admin,false);assert.equal(payload.repo,'Leadgen-labs/webs-obsah-demo');
  assert.ok(!ctx.calls.some(c=>c[0]==='github'),'explicit invitation needs no additional GitHub permissions');
 }
});

test('public GitHub read access alone cannot grant operational overview access',async()=>{
 for(const [github,expected]of [[{private:false,permissions:{push:false}},false],[{private:true,permissions:{push:false}},true],[{private:false,permissions:{push:true}},true],[Error('GitHub denied'),false]]){
  const ctx=overviewAccessHarness({github});assert.equal(await ctx.canRead(ctx.user,'Leadgen-labs','webs-obsah-demo',ctx.access),expected);
  assert.deepEqual(ctx.calls.find(c=>c[0]==='github')[1],{owner:'Leadgen-labs',repo:'webs-obsah-demo'});
 }
});

test('overview verifies the exact repository first and ignores forged browser identity and claims',async()=>{
 const ctx=overviewAccessHarness();await ctx.post({repositoryAccess:true,admin:true,email:'other@example.com',repo:'Other/webs-obsah-secret'});
 assert.deepEqual(ctx.calls[0],['token','account-1','Leadgen-labs','webs-obsah-demo']);
 const payload=ctx.calls.find(c=>c[0]==='bot')[2];assert.equal(payload.repositoryAccess,false);assert.equal(payload.admin,false);assert.equal(payload.email,'info@leadmarket.cz');assert.equal(payload.repo,'Leadgen-labs/webs-obsah-demo');
 const denied=overviewAccessHarness({denied:true});assert.equal((await denied.post({repositoryAccess:true})).status,403);assert.equal(denied.calls.length,1);
 const anonymous=overviewAccessHarness({signedIn:false});assert.equal((await anonymous.post()).status,401);assert.equal(anonymous.calls.length,0);
 const crossOrigin=overviewAccessHarness();assert.equal((await crossOrigin.post({},'https://other.example')).status,403);assert.equal(crossOrigin.calls.length,0);
});
