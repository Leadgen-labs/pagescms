import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const scope = require('../lib/github-owner-scope.ts');
function loadTypeScript(relativeUrl, imports) {
  const source = ts.transpileModule(fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => imports[name] ?? require(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const urls = loadTypeScript('../lib/project-url.ts', { '@/lib/github-owner-scope': scope });
const { internalProjectPath, publicProjectPath } = urls;
const { NextRequest } = require('next/server');
const { proxy } = loadTypeScript('../proxy.ts', { '@/lib/project-url': urls });
const base = '/leadgen-labs-cz/webs-obsah-kesek/main';
const legacyBase = '/leadgen-labs/webs-obsah-kesek/main';

test('short overview, access section, nested entries and other projects round-trip', () => {
  for (const [short, internal] of [['/kesek',base+'/prehled'],['/kesek/pristupy',base+'/collaborators'],['/kesek/collection/blog/cs/clanek.md',base+'/collection/blog/cs/clanek.md'],['/kesek/media/default',base+'/media/default'],['/demo/submissions','/leadgen-labs-cz/webs-obsah-demo/main/submissions'],['/nevolame','/leadgen-labs/webs-obsah-nevolame/main/prehled']]) {
    assert.equal(internalProjectPath(short), internal);
    assert.equal(publicProjectPath(internal), short);
  }
  assert.equal(internalProjectPath('/kesek/'),base+'/prehled');
  assert.equal(publicProjectPath(base),'/kesek');
});

test('system pages, API, unrelated repositories and non-main branches stay untouched', () => {
  for (const path of ['/','/sign-in','/auth/callback','/settings','/admin/weby','/api/repos/leadgen-labs','/_next/static/chunk.js','/leadgen-labs/repo/main','/another/webs-obsah-kesek/main',base.replace('/main','/draft')]) {
    assert.equal(internalProjectPath(path),path);
    assert.equal(publicProjectPath(path),path);
  }
});

test('old page URL redirects without dropping query parameters', () => {
  const response=proxy(new NextRequest('https://cms.mobilut.com'+legacyBase+'/collaborators?tab=users'));
  assert.equal(response.status,307);
  assert.equal(response.headers.get('location'),'https://cms.mobilut.com/kesek/pristupy?tab=users');
});

test('short URLs rewrite to existing authorized pages and preserve login return URL', () => {
  const response=proxy(new NextRequest('https://cms.mobilut.com/kesek/?view=all'));
  assert.equal(response.headers.get('x-middleware-rewrite'),'https://cms.mobilut.com'+base+'/prehled?view=all');
  assert.equal(response.headers.get('x-middleware-request-x-return-to'),'/kesek/?view=all');
});

test('entries with file extensions are rewritten, assets are not', () => {
  const response=proxy(new NextRequest('https://cms.mobilut.com/kesek/file/nastaveni/web.json'));
  assert.equal(response.headers.get('x-middleware-rewrite'),'https://cms.mobilut.com'+base+'/file/nastaveni/web.json');
  const asset=proxy(new NextRequest('https://cms.mobilut.com/icon.svg'));
  assert.equal(asset.headers.get('x-middleware-rewrite'),null);
});

test('server action POST is rewritten without a redirect and old POST is preserved', () => {
  const response=proxy(new NextRequest('https://cms.mobilut.com/kesek/pristupy',{method:'POST',headers:{origin:'https://cms.mobilut.com','next-action':'example'}}));
  assert.equal(response.headers.get('location'),null);
  assert.equal(response.headers.get('x-middleware-rewrite'),'https://cms.mobilut.com'+base+'/collaborators');
  const old=proxy(new NextRequest('https://cms.mobilut.com'+base+'/collaborators',{method:'POST'}));
  assert.equal(old.headers.get('location'),null);
  assert.equal(old.headers.get('x-middleware-rewrite'),null);
});

test('API origin checks and original API paths remain in effect', () => {
  const path='/api/leadgen-labs/webs-obsah-kesek/main/webs-submissions';
  const unsafe=proxy(new NextRequest('https://cms.mobilut.com'+path,{method:'POST',headers:{host:'cms.mobilut.com',origin:'https://other.example'}}));
  assert.equal(unsafe.status,403);
  const safe=proxy(new NextRequest('https://cms.mobilut.com'+path,{method:'POST',headers:{host:'cms.mobilut.com',origin:'https://cms.mobilut.com'}}));
  assert.equal(safe.headers.get('x-middleware-next'),'1');
  assert.equal(safe.headers.get('x-middleware-rewrite'),null);
});

test('export/import short URLs reach the original authorized project route', () => {
  for (const slug of ['kesek', 'demo']) {
    const internal = `/leadgen-labs-cz/webs-obsah-${slug}/main/transfer`;
    const short = `/${slug}/transfer`;
    assert.equal(publicProjectPath(internal), short);
    assert.equal(internalProjectPath(short), internal);
    assert.equal(internalProjectPath(short + '/'), internal);
    const redirect = proxy(new NextRequest('https://cms.mobilut.com' + internal + '?tab=content'));
    assert.equal(redirect.status, 307);
    assert.equal(redirect.headers.get('location'), 'https://cms.mobilut.com' + short + '?tab=content');
    const rewritten = proxy(new NextRequest(redirect.headers.get('location')));
    assert.equal(rewritten.headers.get('x-middleware-rewrite'), 'https://cms.mobilut.com' + internal + '?tab=content');
    assert.equal(rewritten.headers.get('x-middleware-request-x-return-to'), short + '?tab=content');
  }
});

test('organization installations do not open unrelated GitHub accounts or repositories', () => {
  assert.equal(scope.isCmsGithubOwner('Leadgen-labs'), true);
  assert.equal(scope.isCmsGithubOwner('Leadgen-labs-cz'), true);
  assert.equal(scope.isCmsGithubOwner('unrelated'), false);
  assert.equal(scope.isCmsGithubRepository('Leadgen-labs', 'webs-obsah-nevolame'), true);
  assert.equal(scope.isCmsGithubRepository('Leadgen-labs-cz', 'webs-obsah-demo'), true);
  assert.equal(scope.isCmsGithubRepository('Leadgen-labs-cz', 'webs'), false);
  assert.equal(scope.isCmsGithubRepository('unrelated', 'webs-obsah-demo'), false);
});

test('repository discovery cannot fall back to another installation', async () => {
  const permitted = { id: 1, account: { login: 'Leadgen-labs' } };
  const foreign = { id: 2, account: { login: 'unrelated' } };
  const { getInstallations, getInstallationRepos } = loadTypeScript('../lib/github-app.ts', {
    '@/lib/github-owner-scope': scope,
    '@/lib/utils/octokit': {
      createOctokitInstance: () => ({
        rest: { apps: {
          listInstallationsForAuthenticatedUser: async () => ({
            data: { installations: [permitted, foreign], total_count: 2 },
          }),
          listInstallationReposForAuthenticatedUser: async () => ({
            data: { repositories: [
              { owner: { login: 'Leadgen-labs-cz' }, name: 'webs-obsah-demo' },
              { owner: { login: 'Leadgen-labs-cz' }, name: 'webs' },
              { owner: { login: 'unrelated' }, name: 'webs-obsah-foreign' },
            ], total_count: 3 },
          }),
        }},
      }),
    },
  });
  assert.deepEqual(await getInstallations('token'), [permitted]);
  assert.deepEqual(await getInstallations('token', ['Leadgen-labs-cz']), []);
  assert.deepEqual((await getInstallationRepos('token', 1)).map(repo => repo.name), ['webs-obsah-demo']);
});
