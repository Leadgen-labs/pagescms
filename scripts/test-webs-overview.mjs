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
