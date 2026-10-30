import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(file,mocks={},extra={}){
 const exp={};const output=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','exports',...Object.keys(extra),output)(name=>name in mocks?mocks[name]:require(name),exp,...Object.values(extra));return exp;
}
const {accountLabel}=load('lib/account-label.ts');
const {getInitialsFromName}=load('lib/utils/avatar.ts');
const {formatUi}=load('lib/ui-translations.ts');

test('account identity always uses the signed-in email, never an editable name or GitHub login',()=>{
 assert.equal(accountLabel({name:'Leadgen-labs',githubUsername:'leadgen-labs',email:'me@example.com'}),'me@example.com');
 assert.equal(accountLabel({name:' Jana Nováková ',githubUsername:'jnovak',email:'me@example.com'}),'me@example.com');
 assert.equal(accountLabel({email:'me@example.com'}),'me@example.com');
});
for(const language of ['cs','en'])test(`account control is a direct localized settings link in ${language}`,()=>{
 const user={name:'Leadgen-labs',githubUsername:'Leadgen-labs',email:'me@example.com'};
 const span=({children})=>React.createElement('span',null,children);
 const {User}=load('components/user.tsx',{
  '@/contexts/user-context':{useUser:()=>({user})},
  '@/components/use-ui':{useUi:()=>source=>formatUi(source,language)},
  '@/lib/account-label':{accountLabel},'@/lib/utils/avatar':{getInitialsFromName},
  '@/components/ui/button':{Button:({children})=>children},
  '@/components/ui/avatar':{Avatar:span,AvatarFallback:span,AvatarImage:()=>null},
  '@/lib/utils':{cn:(...values)=>values.filter(Boolean).join(' ')},
  'next/link':{__esModule:true,default:props=>React.createElement('a',props)},
 });
 const html=renderToStaticMarkup(React.createElement(User,{showLabel:true}));
 assert.match(html,/href="\/settings"/);assert.ok(html.includes(language==='cs'?'Nastavení účtu':'Account settings'));assert.match(html,/me@example.com/);assert.doesNotMatch(html,/>Leadgen-labs</);assert.doesNotMatch(html,/aria-haspopup/);
});
test('failed sign-out retains the session page and enables retry; success redirects to sign-in',async()=>{
 for(const success of [false,true]){
  const states=[];let index=0,redirect=null;
  const hooks={...React,useState:initial=>{const at=index++;states[at]=initial;return [initial,value=>{states[at]=value;}];}};
  const {SignOut}=load('components/settings/sign-out.tsx',{
   react:hooks,'@/lib/auth-client':{signOut:async()=>success?{error:null}:{error:{message:'Unavailable'}}},
   '@/components/use-ui':{useUi:()=>source=>source},'@/components/ui/button':{Button:()=>null},
  },{window:{location:{assign:url=>{redirect=url;}}}});
  const element=SignOut();const button=element.props.children[0];await button.props.onClick();
  if(success)assert.equal(redirect,'/sign-in');else{assert.equal(redirect,null);assert.equal(states[0],false);assert.equal(states[1],true);}
 }
});


test('account profile is read-only identity and preferences, without name, email or avatar editing',()=>{
 const span=({children})=>React.createElement('div',null,children);
 const {Profile}=load('components/settings/profile.tsx',{
  '@/components/use-ui':{useUi:()=>source=>formatUi(source,'cs')},
  '@/contexts/language-context':{useLanguage:()=>({t:cs=>cs})},
  '@/components/webs/language-switcher':{LanguageSwitcher:()=>React.createElement('span',null,'CZ / EN')},
  '@/components/ui/card':{Card:span,CardHeader:span,CardTitle:span,CardDescription:span,CardContent:span},
 });
 const html=renderToStaticMarkup(React.createElement(Profile,{email:'info@leadmarket.cz'}));
 assert.match(html,/info@leadmarket.cz/);assert.match(html,/Přihlášený účet/);assert.doesNotMatch(html,/<input|<form|<img|Uložit profil|Leadgen-labs/);
});
