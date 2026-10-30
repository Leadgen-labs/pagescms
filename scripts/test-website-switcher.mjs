import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const paths={exports:{}};new Function('exports',compile('lib/project-url.ts'))(paths.exports);
const websites={exports:{}};new Function('require','exports',compile('lib/websites.ts'))(name=>{assert.equal(name,'@/lib/project-url');return paths.exports;},websites.exports);
const {loadAccessibleWebsites,websiteHref,websiteAccounts}=websites.exports;

test('website switcher uses complete authorized results and excludes technical repositories',async()=>{
 const calls=[];
 const result=await loadAccessibleWebsites([{login:'Leadgen-labs',type:'org',repositorySelection:'all'}],async url=>{calls.push(url);return Response.json({status:'success',data:[...Array.from({length:9},(_,i)=>({owner:'Leadgen-labs',repo:'webs-obsah-site'+i,displayName:'site'+i+'.cz'})),{owner:'Leadgen-labs',repo:'private-code'}]});});
 assert.equal(result.websites.length,9);assert.equal(result.failedAccounts,0);assert.match(calls[0],/websites_only=1/);assert.match(calls[0],/repository_selection=all/);
});
test('several accounts are combined without duplicate websites and failing accounts remain explicit',async()=>{
 const result=await loadAccessibleWebsites([{login:'one'},{login:'two'},{login:'blocked'}],async url=>url.includes('blocked')?new Response(null,{status:403}):Response.json({status:'success',data:[{owner:'one',repo:'webs-obsah-kesek',displayName:'kesek.cz'}]}));
 assert.equal(result.websites.length,1);assert.equal(result.failedAccounts,1);
 assert.equal(websiteAccounts([{login:'ONE',repositorySelection:'selected'},{login:'one',repositorySelection:'all'}]).length,1);
 assert.equal(websiteAccounts([{login:'ONE',repositorySelection:'selected'},{login:'one',repositorySelection:'all'}])[0].repositorySelection,'all');
});
test('website links lead to existing per-site dashboards and preserve other owners and branches',()=>{
 assert.equal(websiteHref({owner:'leadgen-labs',repo:'webs-obsah-kesek'}),'/kesek');
 assert.equal(websiteHref({owner:'another',repo:'webs-obsah-demo',defaultBranch:'draft/preview'}),'/another/webs-obsah-demo/draft%2Fpreview/prehled');
});

function api({authenticated=true,github=false}={}){
 let searchCalls=[],dbCalls=0;
 const deps={
  '@/lib/utils/octokit':{createOctokitInstance:()=>({rest:{search:{repos:async options=>{searchCalls.push(options);const count=options.page?1:100;return {data:{total_count:101,items:Array.from({length:count},(_,i)=>({name:'webs-obsah-site'+(options.page?100:i),owner:{login:'leadgen-labs'},permissions:{push:true},default_branch:'main'}))}};}}}})},
  '@/lib/github-app':{},
  '@/db':{db:{query:{collaboratorTable:{findMany:async options=>{dbCalls++;assert.ok(options.where.includes('signed-in-user'));return [{owner:'leadgen-labs',repo:'webs-obsah-client'},{owner:'leadgen-labs',repo:'technical-repo'}];}},configTable:{findMany:async()=>[]}}}},
  '@/lib/project-name':{projectName:name=>name},
  'drizzle-orm':{and:(...args)=>args,sql:()=>null},
  '@/db/schema':{collaboratorTable:{}},
  '@/lib/github-account':{getGithubAccount:async()=>github?{accessToken:'test'}:null},
  '@/lib/authz-shared':{hasGithubIdentity:()=>github},
  '@/lib/api-error':{toErrorResponse:e=>Response.json({error:e.message},{status:500})},
  '@/lib/session-server':{requireApiUserSession:async()=>authenticated?{user:{id:'signed-in-user'}}:{response:new Response(null,{status:401})}},
  '@/lib/collaborator-access':{collaboratorMatchesUser:user=>user.id},
 };
 const mod={exports:{}};new Function('require','exports',compile('app/api/repos/[owner]/route.ts'))(name=>{if(!(name in deps))throw Error(name);return deps[name];},mod.exports);
 return {get:mod.exports.GET,searchCalls,dbCalls:()=>dbCalls};
}
const request={nextUrl:new URL('https://cms.test/api/repos/leadgen-labs?websites_only=1&type=org&repository_selection=all')};
const context={params:Promise.resolve({owner:'leadgen-labs'})};
test('website endpoint still requires authentication and scopes collaborators to signed-in user',async()=>{
 const denied=api({authenticated:false});assert.equal((await denied.get(request,context)).status,401);assert.equal(denied.dbCalls(),0);
 const allowed=api();const data=await (await allowed.get(request,context)).json();assert.deepEqual(data.data.map(item=>item.repo),['webs-obsah-client']);
});
test('website endpoint fetches all search pages rather than the first five projects',async()=>{
 const h=api({github:true});const response=await h.get(request,context);const payload=await response.json();assert.equal(response.status,200);assert.equal(payload.data.length,102);assert.equal(h.searchCalls.length,2);assert.equal(h.searchCalls[0].per_page,100);assert.match(h.searchCalls[0].q,/webs-obsah-/);
});
