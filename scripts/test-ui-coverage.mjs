import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join,relative} from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
const mod={exports:{}};new Function('exports',ts.transpileModule(readFileSync(resolve(root,'lib/ui-translations.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports);
const {uiTranslations,formatUi}=mod.exports;
const require=createRequire(import.meta.url);
const invariant=new Set(['Pages CMS','GitHub','Čeština','English','pagescms.org','pagescms.org/docs','pagescms/pagescms','.pages.yml','px','UTC ·','UTC','ID:','GSC','ALT']);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?['email'].includes(e.name)?[]:files(join(dir,e.name)):e.name.endsWith('.tsx')?[join(dir,e.name)]:[])}
test('visible authored UI text is in the bilingual dictionary or a translated expression',()=>{
 const missing=[];
 for(const file of [...files(join(root,'app')),...files(join(root,'components')),...files(join(root,'fields'))]){
  const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(n){if(ts.isJsxText(n)){
   const text=n.text.replace(/\s+/g,' ').trim().replaceAll('&quot;','"').replaceAll('&apos;',"'");
   if(text&&/[A-Za-zÁ-ž]/.test(text)&&!invariant.has(text)&&!Object.hasOwn(uiTranslations,text)&&!Object.values(uiTranslations).includes(text))missing.push(relative(root,file)+': '+text);
  }ts.forEachChild(n,visit)}visit(ast);
 }
 assert.deepEqual(missing,[],'New UI copy must be explicitly localized');
});
test('all translations are nonempty, and no translated placeholder invents a value',()=>{
 for(const [en,cs]of Object.entries(uiTranslations)){
  assert.ok(cs.trim(),en);
  const available=new Set([...en.matchAll(/\{(\d+)\}/g)].map(m=>m[1]));
  for(const match of cs.matchAll(/\{(\d+)\}/g))assert.ok(available.has(match[1]),en);
 }
 assert.equal(formatUi('Save','cs'),'Uložit');
});

test('website access headings preserve the space before the website name in both languages', () => {
 const file=join(root,'components/collaborators.tsx');
 const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let heading;
 function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast)==='h1') heading=node;
  ts.forEachChild(node,visit);
 }
 visit(ast);
 assert.ok(heading);

 let language='cs';
 const {renderToStaticMarkup}=require('react-dom/server');
 const compileJsx=(source,deps={})=>{
  const exports={};
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require',compiled)(exports,id=>deps[id]??require(id));
  return exports;
 };
 const {UiText}=compileJsx(readFileSync(join(root,'components/ui-text.tsx'),'utf8'),{
  '@/contexts/language-context':{useLanguage:()=>({language})},
  '@/lib/ui-translations':mod.exports,
 });
 const {renderHeading}=compileJsx(
  'import { UiText } from "./ui-text"; export const renderHeading = (displayName) => '+heading.getText(ast),
  {'./ui-text':{UiText}},
 );
 assert.match(renderToStaticMarkup(renderHeading('kesek.cz')),/>Přístupy k webu kesek\.cz<\/h1>$/);
 language='en';
 assert.match(renderToStaticMarkup(renderHeading('kesek.cz')),/>Website access for kesek\.cz<\/h1>$/);
});

test('rich text slash commands search in either language and preserve command restrictions',()=>{
 let language='cs';
 const exports={};
 const source=readFileSync(join(root,'components/ui/editor/slash-command/suggestion.tsx'),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('exports','require',compiled)(exports,(id)=>id==='@/components/use-ui'?{ui:(s)=>formatUi(s,language)}:{});
 const suggestion=exports.default();
 const editor={isActive:()=>false};
 const items=(query='')=>suggestion.items({query,editor});
 assert.equal(items()[1].title,'Nadpis 1');
 assert.equal(items('nadpis').length,3);
 assert.equal(items('heading').length,3);
 language='en';
 assert.equal(items()[1].title,'Heading 1');
 assert.equal(items('heading').length,3);
 // Restrictions operate on stable source identifiers before display translation.
 editor.isActive=(name)=>name==='tableCell';
 assert.deepEqual(items().map(x=>x.title),['Image']);
 language='cs';
 assert.deepEqual(items().map(x=>x.title),['Obrázek']);
 assert.deepEqual(exports.default({enableImages:false}).items({query:'',editor}),[]);
});
