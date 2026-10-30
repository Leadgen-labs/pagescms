import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import ts from 'typescript';

// Installed as scripts/test-webs-submissions.mjs in the CMS repository.
function compile(file,deps){
 const exports={};
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 new Function('require','exports','process','fetch',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{
  if(id in deps)return deps[id];throw Error('Unexpected dependency '+id);
 },exports,{env:deps.env},deps.fetch);
 return exports;
}
function harness({reply=()=>Response.json({items:[]}),denied=false,signedIn=true,manager=true}={}){
 const calls=[];
 const errors={createHttpError:(message,status)=>Object.assign(Error(message),{status}),toErrorResponse:e=>Response.json({status:'error',message:e.message},{status:e.status??500})};
 const env={WEBS_BOT_URL:'https://mcp.mobilut.com',WEBS_BOT_SECRET:'test-secret'};
 const helper=compile('lib/webs/bot.ts',{'server-only':{},'node:crypto':{createHmac},'@/lib/api-error':errors,env,fetch:async(url,options)=>{calls.push({url,options});return reply();}});
 const route=compile('app/api/[owner]/[repo]/[branch]/webs-submissions/route.ts',{
  '@/lib/webs/bot':helper,'@/lib/api-error':errors,env,
  '@/lib/session-server':{requireApiUserSession:async()=>signedIn?{user:{id:'1',email:'test@example.com'}}:{response:new Response(null,{status:401})}},
  '@/lib/token':{getToken:async()=>{if(denied)throw errors.createHttpError('No access',403);return {token:'test'};}},
  '@/lib/webs/submissions-access':{canManageSubmissions:async()=>manager},
 });
 const request=(op='list',origin='https://cms.mobilut.com')=>route.POST(new Request('https://cms.mobilut.com/api/leadgen-labs/webs-obsah-leadgenia/main/webs-submissions',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({op,args:{limit:25},email:'forged@example.com',cmsRole:'manager'})}),{params:Promise.resolve({owner:'leadgen-labs',repo:'webs-obsah-leadgenia',branch:'main'})});
 return {calls,env,request};
}

test('submissions use the trusted Worker with a signed authenticated identity',async()=>{
 const {calls,request}=harness();const response=await request();
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{items:[]});
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://webs-bot.crimson-bonus-69e4.workers.dev/cms/submissions');
 const {options}=calls[0];const payload=JSON.parse(options.body);
 assert.equal(payload.email,'test@example.com');assert.equal(payload.repo,'leadgen-labs/webs-obsah-leadgenia');
 assert.equal(payload.cmsRole,'manager');
 assert.equal(options.headers['x-webs-signature'],createHmac('sha256','test-secret').update(options.headers['x-webs-timestamp']+'.'+options.body).digest('hex'));
 assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
});
test('browser-supplied manager claims are ignored without a verified CMS role',async()=>{
 const {calls,request}=harness({manager:false});await request();
 assert.equal(JSON.parse(calls[0].options.body).cmsRole,undefined);
});

test('CMS invitations and superadmins authorize managers; GitHub read access does not',async()=>{
 for(const [admin,collaborator,source,push,expected] of [[true,false,'user',false,true],[false,true,'installation',false,true],[false,true,'user',false,true],[false,false,'user',true,true],[false,false,'user',false,false],[false,false,'installation',true,false]]){
  const queries=[];
  const deps={
   'server-only':{},'@/lib/admin':{hasAdminAccess:()=>admin},
   '@/db':{db:{query:{collaboratorTable:{findFirst:async({where})=>{queries.push(where);return collaborator?{id:1}:undefined;}}}}},
   '@/lib/collaborator-access':{collaboratorMatchesUserForRepo:(user,owner,repo)=>({id:user.id,owner,repo})},
   '@/lib/utils/octokit':{createOctokitInstance:()=>({rest:{repos:{get:async()=>({data:{private:true,permissions:{push}}})}}})},
  };
  const {canManageSubmissions}=compile('lib/webs/submissions-access.ts',deps);
  assert.equal(await canManageSubmissions({id:'user'},'owner','webs-obsah-one',{source,token:'test'}),expected);
  if(!admin)assert.deepEqual(queries,[{id:'user',owner:'owner',repo:'webs-obsah-one'}]);
 }
});
test('HTML becomes a useful gateway error instead of a JSON parsing exception',async()=>{
 const {calls,request}=harness({reply:()=>new Response('<!DOCTYPE html><title>Blocked</title>',{status:403})});
 const response=await request();assert.equal(response.status,502);
 const data=await response.json();assert.match(data.message,/platnou odpověď/);assert.doesNotMatch(data.message,/Unexpected token|DOCTYPE/);assert.equal(calls.length,1);
});
test('submission mutations are never replayed after uncertain failures',async()=>{
 for(const op of ['enable','status','settings','access'])for(const reply of [()=>{throw Error('timeout')},()=>new Response('<!DOCTYPE html>',{status:502})]){
  const {calls,request}=harness({reply});const response=await request(op);
  assert.ok([502,503].includes(response.status));assert.equal(calls.length,1,op);
 }
});
test('application permission denials survive without retries',async()=>{
 const {calls,request}=harness({reply:()=>Response.json({error:'Přístup k formulářům musí povolit správce webu.'},{status:403})});
 const response=await request();assert.equal(response.status,403);assert.match((await response.json()).error,/správce/);assert.equal(calls.length,1);
});
test('session, repository access, origin and operation are checked before contacting the bot',async()=>{
 for(const [options,op,origin,status] of [[{signedIn:false},'list',undefined,401],[{denied:true},'list',undefined,403],[{},'list','https://other.example',403],[{},'unknown',undefined,400]]){
  const {calls,request}=harness(options);assert.equal((await request(op,origin)).status,status);assert.equal(calls.length,0);
 }
});
test('other configured bot addresses are preserved unless a fallback is explicit',async()=>{
 const {calls,env,request}=harness();env.WEBS_BOT_URL='https://other.example';await request();assert.equal(calls[0].url,'https://other.example/cms/submissions');
 env.WEBS_BOT_FALLBACK_URL='https://trusted.example/';await request();assert.equal(calls[1].url,'https://trusted.example/cms/submissions');
});
