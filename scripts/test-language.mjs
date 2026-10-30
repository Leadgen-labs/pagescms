import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const cache=new Map();let session={user:{id:'user-1',email:'Me@Example.com'}};const saved=[];
const mockPreferences={getPreferredLanguage:async()=> 'en',setPreferredLanguage:async(email,language)=>saved.push({email,language})};
function load(file, mocks={}){
 const key=file+JSON.stringify(Object.keys(mocks)); if(cache.has(key))return cache.get(key);
 const exp={};const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const resolve=name=>name in mocks?mocks[name]:name==='server-only'?{}:name.startsWith('@/')?load(name.slice(2)+(name.includes('/components/')?'.tsx':'.ts'),mocks):require(name);
 new Function('require','exports','process',compiled)(resolve,exp,process);cache.set(key,exp);return exp;
}
const {emailSubject,isLanguage}=load('lib/language.ts');
const {render}=require('@react-email/render');
const theme=load('components/email/theme.ts');
for(const [file,component] of [['login','LoginEmailTemplate'],['invite','InviteEmailTemplate'],['collaborator-added','CollaboratorAddedEmailTemplate']]){
 for(const language of ['cs','en'])test(`${file} email uses ${language}, keeps links and escapes user data`,async()=>{
  const template=load(`components/email/${file}.tsx`,{'@/components/email/theme':theme})[component];
  const html=await render(template({language,email:'test@example.com',otp:'123456',repoName:'Demo <script>alert(1)</script>',inviteUrl:'https://cms.example/sign-in?token=safe',repoUrl:'https://cms.example/demo',invitedByName:'Team <script>',invitedByUrl:'https://example.com'}));
  assert.ok(html.includes(`lang="${language}"`));assert.ok(!html.includes('<script>'));
  if(file==='login'){assert.ok(html.includes('123456'));assert.ok(html.includes(language==='cs'?'Kód platí 5 minut.':'This code will expire in 5 minutes.'));}
  else assert.ok(html.includes(language==='cs'?'správě webu':'Pages CMS'));
 });
}
test('email subjects and locale validation',()=>{
 assert.match(emailSubject('login','cs','123456'),/přihlašovací kód/);assert.match(emailSubject('login','en','123456'),/temporary code/);
 assert.match(emailSubject('invite','cs','Demo'),/Pozvánka/);assert.match(emailSubject('added','en','Demo'),/You were added/);
 assert.equal(isLanguage('de'),false);assert.equal(isLanguage('en'),true);
});
const route=load('app/api/preferences/language/route.ts',{'@/lib/session-server':{requireApiUserSession:async()=>session},'@/lib/language-server':mockPreferences});
const request=(body,origin='https://cms.example')=>new Request('https://cms.example/api/preferences/language',{method:'PATCH',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('language PATCH uses session identity and ignores a submitted email',async()=>{
 saved.length=0;const res=await route.PATCH(request({language:'en',email:'victim@example.com'}));
 assert.equal(res.status,200);assert.deepEqual(saved,[{email:'Me@Example.com',language:'en'}]);
});
test('language PATCH rejects invalid locale and cross-origin requests',async()=>{
 saved.length=0;assert.equal((await route.PATCH(request({language:'de'}))).status,400);
 assert.equal((await route.PATCH(request({language:'cs'},'https://attacker.example'))).status,403);assert.equal(saved.length,0);
});
test('unauthenticated language requests cannot read or write preferences',async()=>{
 const previous=session;session={response:Response.json({error:'Unauthorized'},{status:401})};saved.length=0;
 try{assert.equal((await route.PATCH(request({language:'en'}))).status,401);assert.equal((await route.GET()).status,401);assert.equal(saved.length,0);}finally{session=previous;}
});
const dialect=new (require('drizzle-orm/pg-core').PgDialect)();
const schema=load('db/schema.ts');
const preferences=new Map();
const fakeDb={query:{languagePreferenceTable:{findFirst:async({where})=>preferences.get(dialect.sqlToQuery(where).params[0])}},insert:()=>({values:value=>({onConflictDoNothing:async()=>{if(!preferences.has(value.email))preferences.set(value.email,value)},onConflictDoUpdate:async({set})=>preferences.set(value.email,{...value,...set})})})};
const preferenceStore=load('lib/language-server.ts',{'@/db':{db:fakeDb},'@/db/schema':schema});
test('invitation language becomes the normalized account default and existing choices are preserved',async()=>{
 preferences.clear();assert.equal(await preferenceStore.getPreferredLanguage('new@example.com'),'cs');
 assert.equal(await preferenceStore.initializePreferredLanguage(' NEW@Example.com ','en'),'en');
 assert.equal(await preferenceStore.getPreferredLanguage('new@example.com'),'en');
 assert.equal(await preferenceStore.initializePreferredLanguage('new@example.com','cs'),'en');
 await preferenceStore.setPreferredLanguage(' NEW@example.com ','cs');
 assert.equal(await preferenceStore.getPreferredLanguage('new@example.com'),'cs');assert.equal(preferences.size,1);
 await assert.rejects(preferenceStore.setPreferredLanguage('new@example.com','de'));
});
const uiModule=load('lib/ui-translations.ts');
test('UI labels and dynamic server messages switch both ways without translating user values',()=>{
 assert.equal(uiModule.translateUiText('Save','cs'),'Uložit');assert.equal(uiModule.translateUiText('Uložit','en'),'Save');
 assert.equal(uiModule.translateUiText('Web','en'),'Website');assert.equal(uiModule.translateUiText('Website','en'),'Website');
 assert.equal(uiModule.translateUiText('File "Moje česká firma.md" already exists.','cs'),'Soubor "Moje česká firma.md" již existuje.');
 assert.equal(uiModule.translateUiText('Pozvánka byla znovu odeslána na test@example.com.','en'),'Invitation email resent to test@example.com.');
 assert.equal(uiModule.translateUiText('Custom customer content','cs'),'Custom customer content');
 assert.equal(uiModule.formatUi('File "{0}" already exists.','cs',['my {0} file.md']),'Soubor "my {0} file.md" již existuje.');
});
const internal=load('app/api/internal/language/route.ts',{'@/lib/language-server':mockPreferences});
const {createHmac}=require('node:crypto');
test('internal bot lookup requires a fresh signature over the entire body; verified changes may update preference',async()=>{
 const previous=process.env.WEBS_BOT_SECRET;process.env.WEBS_BOT_SECRET='internal-test';saved.length=0;
 const make=(payload,stamp=String(Math.floor(Date.now()/1000)),signature)=>{
  const body=typeof payload==='string'?payload:JSON.stringify(payload);
  return new Request('https://cms.example/api/internal/language',{method:'POST',headers:{'content-type':'application/json','x-webs-timestamp':stamp,'x-webs-signature':signature??createHmac('sha256','internal-test').update(`${stamp}.${body}`).digest('hex')},body});
 };
 try {
  assert.equal((await internal.POST(make({email:'me@example.com'}))).status,200);
  assert.equal((await internal.POST(make({email:'me@example.com'},'1000000000'))).status,401);
  assert.equal((await internal.POST(make({email:'me@example.com'},undefined,'0'.repeat(64)))).status,401);
  assert.equal((await internal.POST(make('{'))).status,400);
  assert.equal((await internal.POST(make({email:'me@example.com',language:'de'}))).status,400);
  assert.equal((await internal.POST(make({email:'me@example.com',language:'en'}))).status,200);
  assert.deepEqual(saved,[{email:'me@example.com',language:'en'}]);
 } finally { if(previous===undefined)delete process.env.WEBS_BOT_SECRET;else process.env.WEBS_BOT_SECRET=previous; }
});
test('internal signed lookup reaches its route without Origin while browser mutations remain protected',()=>{
 const {NextRequest}=require('next/server');const {proxy}=load('proxy.ts');
 const internalRequest=new NextRequest('https://cms.example/api/internal/language',{method:'POST',body:'{}'});
 const browserRequest=new NextRequest('https://cms.example/api/preferences/language',{method:'PATCH',body:'{}'});
 assert.equal(proxy(internalRequest).headers.get('x-middleware-next'),'1');
 assert.equal(proxy(browserRequest).status,403);
});
