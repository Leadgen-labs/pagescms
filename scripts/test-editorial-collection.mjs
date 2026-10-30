import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import YAML from 'yaml';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const dateModule={exports:{}};
const dateSource=ts.transpileModule(fs.readFileSync(new URL('../fields/core/date/index.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',dateSource)(name=>name.startsWith('./')?{}:require(name),dateModule,dateModule.exports);
const readDate=dateModule.exports.read;

const path = '../app/api/[owner]/[repo]/[branch]/collections/[name]/route.ts';
const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
export function harness({ denied = false, filename = '{title}.md', content = '---\ntitle: Existující článek\nstatus: published\n---\nText' } = {}) {
  const schema = { path: 'blog/cs', extension: 'md', format: 'yaml-frontmatter', filename, fields: [{name:'title',type:'string'},{name:'status',type:'string'},{name:'published_at',type:'date',options:{time:true,format:"yyyy-MM-dd'T'HH:mm"}}] };
  const calls = [];
  const deps = {
    '@/fields/registry': { readFns: {date:readDate} },
    '@/lib/serialization': { parse: text => YAML.parse(text.split('---')[1]) },
    '@/lib/schema': {
      getSchemaByName: () => schema,
      getFieldByPath: (fields, path) => fields.find(field => field.name === path),
      safeAccess: (object, path) => path.split('.').reduce((value, part) => value?.[part], object),
    },
    '@/lib/api-repo-context': { getRepoReadContext: async () => { if (denied) throw Object.assign(new Error('Denied'),{status:403}); return { token:'test',config:{object:{}} }; } },
    '@/lib/utils/file': { normalizePath: path => path },
    '@/lib/github-cache-file': { getCollectionCache: async (...args) => {
      calls.push(args);
      // Simulate stale cache containing only a placeholder, despite an external article commit.
      return args[6]?.force ? [{type:'file',name:'clanek.md',path:'blog/cs/clanek.md',content,sha:'article'}] : [{type:'file',name:'.gitkeep',path:'blog/cs/.gitkeep',content:''}];
    } },
    '@/lib/api-error': { createHttpError:(message,status)=>Object.assign(new Error(message),{status}),toErrorResponse: error => Response.json({error:error.message},{status:error.status??500}) },
  };
  const testModule = { exports:{} };
  new Function('require','module','exports',source)(name => { if (!(name in deps)) throw Error(name); return deps[name]; },testModule,testModule.exports);
  return { get: testModule.exports.GET,calls };
}
const request = (query='') => ({nextUrl:new URL('https://cms.example/api?path=blog/cs&fields=title,status'+query)});
const context = repo => ({params:Promise.resolve({owner:'leadgen-labs',repo,branch:'main',name:'blog-cs'})});

test('editorial list refreshes stale cache and returns the published article',async()=>{
 const h=harness(); const result=await h.get(request(),context('webs-obsah-kesek')); const body=await result.json();
 assert.equal(result.status,200); assert.equal(h.calls[0][6].force,true);
 assert.equal(body.data.contents.length,1); assert.equal(body.data.contents[0].fields.title,'Existující článek');
});
test('other repositories retain cached reads unless refresh is requested',async()=>{
 const h=harness(); const cached=await (await h.get(request(),context('another-repo'))).json();
 assert.equal(h.calls[0][6].force,false); assert.equal(cached.data.contents.length,0);
 const fresh=await (await h.get(request('&refresh=1'),context('another-repo'))).json(); assert.equal(fresh.data.contents.length,1);
});
test('legacy filename object does not hide articles through a server error',async()=>{
 const h=harness({filename:{template:'{title}.md'}}); const result=await h.get(request(),context('webs-obsah-kesek')); assert.equal(result.status,200); assert.equal((await result.json()).data.contents.length,1);
});
test('refresh never bypasses repository access checks',async()=>{
 const h=harness({denied:true}); const result=await h.get(request('&refresh=1'),context('webs-obsah-kesek')); assert.equal(result.status,403); assert.equal(h.calls.length,0);
});


test('forced folder refresh replaces an otherwise valid but stale snapshot', async () => {
  const cacheSource = fs.readFileSync(new URL('../lib/github-cache-file.ts', import.meta.url), 'utf8');
  const block = cacheSource.slice(cacheSource.indexOf('const getCollectionCache = async ('), cacheSource.indexOf('// Attempt to get a media folder from cache'));
  const compiled = ts.transpileModule(block + '\nmodule.exports = getCollectionCache;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const stale = [{name:'.gitkeep',context:'collection',type:'file',updatedAt:new Date()}];
  let reads = 0, replacements = 0;
  const dependencies = {
    db:{query:{cacheFileTable:{findMany:async()=>stale}}},
    cacheFileTable:{},eq:()=>null,and:()=>null,
    ensureFileCacheFreshness:async()=>{},getFolderScope:()=>({}),
    waitForScopeAndBranchMeta:async()=>({scopeMeta:{status:'ok'},branchMeta:{}}),
    hasVerifiedFolderSnapshot:()=>true,FILE_CACHE_EXPIRY_DISABLED:true,
    upsertScopedMeta:async()=>{},getBranchHeadInfo:async()=>({sha:'head',timestamp:Date.now()}),
    fetchCollectionDirectoryEntries:async()=>{reads++;return [{name:'clanek.md',path:'blog/cs/clanek.md',type:'blob',object:{text:'content',oid:'sha',byteSize:7}}];},
    replaceFolderCache:async()=>{replacements++;},markFolderScopeError:async()=>{},
  };
  const testModule={exports:{}};
  new Function(...Object.keys(dependencies),'module',compiled)(...Object.values(dependencies),testModule);
  const get=testModule.exports;
  const cached=await get('leadgen-labs','webs-obsah-kesek','main','blog/cs','test');
  assert.equal(cached[0].name,'.gitkeep');assert.equal(reads,0);
  const refreshed=await get('leadgen-labs','webs-obsah-kesek','main','blog/cs','test',undefined,{force:true});
  assert.equal(refreshed[0].name,'clanek.md');assert.equal(reads,1);assert.equal(replacements,1);
});


test('actual date reader handles tagged YAML timestamps without blanking article fields',async()=>{
 const h=harness({content:'---\ntitle: Viditelný článek\nstatus: published\npublished_at: !!timestamp 2026-10-29T15:27:35.561Z\n---\nText'});
 const response=await h.get({nextUrl:new URL('https://cms.example/api?path=blog/cs&fields=title,status,published_at')},context('webs-obsah-kesek'));
 const body=await response.json();assert.deepEqual(body.data.errors,[]);assert.equal(body.data.contents[0].fields.title,'Viditelný článek');assert.equal(body.data.contents[0].fields.status,'published');assert.match(body.data.contents[0].fields.published_at,/^2026-10-29T\d{2}:27$/);
});


test('date reader supports ISO strings and custom formats and rejects invalid input without throwing',()=>{
 const field={name:'published_at',type:'date',options:{time:true,format:"yyyy-MM-dd'T'HH:mm"}};
 assert.match(readDate('2026-10-29T15:27:35.561Z',field),/^2026-10-29T\d{2}:27$/);
 assert.equal(readDate('29.10.2026',{name:'date',options:{format:'dd.MM.yyyy'}}),'2026-10-29');
 for(const value of [null,undefined,42,{},[],new Date(NaN)]) assert.equal(readDate(value,field),'');
 const raw=YAML.parse('published_at: !!timestamp 2026-10-29T15:27:35.561Z');
 readDate(raw.published_at,field);assert.equal(raw.published_at.toISOString(),'2026-10-29T15:27:35.561Z');
});
