import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import YAML from 'yaml';
const require=createRequire(import.meta.url);
function load(file, dependencies={}) {
 const output=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const compiledModule = {exports:{}};
 new Function('require','module','exports',output)(name=>name in dependencies?dependencies[name]:require(name),compiledModule,compiledModule.exports);
 return compiledModule.exports;
}
const actions=load('lib/actions.ts');
const date=load('fields/core/date/index.ts',{'./edit-component':{},'./view-component':{}});
const {preserveUnchangedDateFields}=load('lib/preserve-date-fields.ts');
const {parse,stringify}=load('lib/serialization.ts');
const field={name:'published_at',type:'date',options:{time:true,format:"yyyy-MM-dd'T'HH:mm"}};
const config={repo:'webs-obsah-kesek'};

test('generated boolean/string action fields become actual checkbox/text controls at every scope',()=>{
 const action={name:'import',label:'Import',workflow:'import.yml',fields:[{name:'checked',label:'Potvrzuji',type:'boolean',default:false,required:true},{name:'file',label:'Soubor',type:'string'}]};
 const [root]=actions.getRootActions({actions:[action]});assert.equal(root.fields[0].type,'checkbox');assert.equal(root.fields[0].default,false);assert.equal(root.fields[0].required,true);assert.equal(root.fields[1].type,'text');
 const [entry]=actions.getSchemaActions({actions:[{...action,scope:'entry'}]},'entry');assert.equal(entry.fields[0].type,'checkbox');assert.equal(action.fields[0].type,'boolean');
});
test('config validator accepts legacy generator action types and retains required checks',()=>{
 const {ConfigSchema}=load('lib/config-schema.ts',{'@/fields/registry':{fieldTypes:new Set(['string','date','boolean'])},'@/lib/actions':actions});
 const result=ConfigSchema.safeParse({actions:[{name:'import',label:'Import',workflow:'import.yml',fields:[{name:'checked',label:'Potvrzuji',type:'boolean',required:true,default:false},{name:'file',label:'Soubor',type:'string'}]}]});
 assert.equal(result.success,true,JSON.stringify(result.error));assert.equal(result.data.actions[0].fields[0].type,'checkbox');
});
test('publication dates display Prague wall time for both winter and summer UTC timestamps',()=>{
 assert.equal(date.read(new Date('2026-10-29T15:27:35.561Z'),field,config),'2026-10-29T16:27');
 assert.equal(date.read('2026-07-01T15:27:35.561Z',field,config),'2026-07-01T17:27');
 assert.equal(date.read('2026-10-29T16:27',field,config),'2026-10-29T16:27');
});
test('editing title keeps original publication instant and millisecond precision through YAML save',()=>{
 const original=parse('---\ntitle: Původní\npublished_at: !!timestamp 2026-10-29T15:27:35.561Z\n---\nText',{format:'yaml-frontmatter'});
 const submitted={title:'Nový titulek',published_at:date.read(original.published_at,field,config),body:'Text'};
 const written={...submitted,published_at:date.write(submitted.published_at,field)};
 const preserved=preserveUnchangedDateFields(original,submitted,written,[field],(value,field)=>date.read(value,field,config));
 const saved=parse(stringify(preserved,{format:'yaml-frontmatter'}),{format:'yaml-frontmatter'});
 assert.equal(saved.title,'Nový titulek');assert.equal(new Date(saved.published_at).toISOString(),'2026-10-29T15:27:35.561Z');
});
test('explicit publication date change or clearing is preserved as an edit',()=>{
 const original={published_at:new Date('2026-10-29T15:27:35.561Z')};
 const changed={published_at:'2026-11-01T09:00'};
 assert.equal(preserveUnchangedDateFields(original,changed,changed,[field],(v,f)=>date.read(v,f,config)).published_at,changed.published_at);
 assert.equal(preserveUnchangedDateFields(original,{published_at:''},{published_at:''},[field],(v,f)=>date.read(v,f,config)).published_at,'');
 assert.equal(date.write('',field),'');assert.equal(date.write({},field),'');
});


test('generated publication sort is normalized and explicit CMS defaults take precedence',()=>{
 const {ConfigSchema}=load('lib/config-schema.ts',{'@/fields/registry':{fieldTypes:new Set(['string','date'])},'@/lib/actions':actions});
 const configModule=load('lib/config.ts',{'@/lib/utils/file':load('lib/utils/file.ts'),'@/lib/config-schema':{ConfigSchema}});
 const legacy={content:[{name:'blog-cs',type:'collection',path:'blog/cs',view:{fields:['title','published_at'],sort:['published_at','title'],order:'desc'},fields:[{name:'title',type:'string'},{name:'published_at',type:'date'}]}]};
 assert.equal(ConfigSchema.safeParse(legacy).success,true);
 const normalized=configModule.normalizeConfig(legacy);assert.deepEqual(normalized.content[0].view.default,{sort:'published_at',order:'desc'});assert.equal(normalized.content[0].view.order,undefined);
 legacy.content[0].view.default={sort:'title',order:'asc'};
 assert.deepEqual(configModule.normalizeConfig(legacy).content[0].view.default,{sort:'title',order:'asc'});
});

test('chat sending retains the draft on unavailable service and network failure',async()=>{
 const component=fs.readFileSync(new URL('../components/webs/bot-chat.tsx',import.meta.url),'utf8');
 const start=component.indexOf('  const send = async () => {'),end=component.indexOf('  const press = async',start);
 const code=ts.transpileModule(component.slice(start,end)+'\nreturn send;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const call of [async()=>null,async()=>{throw Error('Network');}]){
  let text='Moje nové zadání',error=null;
  const send=new Function('text','sending','setSending','setError','append','now','call','setText',code)(text,false,()=>{},value=>{error=value;},()=>{},()=>'',call,update=>{text=typeof update==='function'?update(text):update;});
  await send();assert.equal(text,'Moje nové zadání');assert.ok(error);
 }
});
test('successful chat send does not erase a newer draft typed while waiting',async()=>{
 const component=fs.readFileSync(new URL('../components/webs/bot-chat.tsx',import.meta.url),'utf8');
 const start=component.indexOf('  const send = async () => {'),end=component.indexOf('  const press = async',start);
 const code=ts.transpileModule(component.slice(start,end)+'\nreturn send;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let text='Původní zadání';
 const call=async()=>{text='Další rozepsané zadání';return {};};
 const send=new Function('text','sending','setSending','setError','append','now','call','setText',code)(text,false,()=>{},()=>{},()=>{},()=>'',call,update=>{text=typeof update==='function'?update(text):update;});
 await send();assert.equal(text,'Další rozepsané zadání');
});
