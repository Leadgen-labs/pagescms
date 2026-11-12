import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(file, dependencies = {}) {
  const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function("require", "exports", outputText)((name) => {
    assert.ok(name in dependencies, "Unexpected dependency " + name);
    return dependencies[name];
  }, exports);
  return exports;
}

function harness({ admin = false, invited = false, missing = false, personalOwner = false } = {}) {
  const requests = [];
  const { getToken, listAdminContentRepos } = load("lib/token.ts", {
    react: { cache: (callback) => callback },
    "@octokit/app": {
      App: class {
        octokit = { request: async (route, params) => {
          requests.push({ route, params });
          if (missing || (personalOwner && route === "GET /orgs/{org}/installation")) {
            throw Object.assign(new Error("App is not installed"), { status: 404 });
          }
          return { data: { id: 42 } };
        } };
      },
    },
    "@/lib/crypto": { decrypt: async () => "test-token" },
    "@/lib/utils/octokit": { createOctokitInstance: () => ({
      paginate: async (_route, _params, map) => map({ data: [
        { owner: { login: "Leadgen-labs-cz" }, name: "webs-obsah-demo", default_branch: "main" },
        { owner: { login: "Leadgen-labs-cz" }, name: "private-code" },
        { owner: { login: "Other" }, name: "webs-obsah-other" },
      ] }),
    }) },
    "@/db": { db: { query: {
      githubInstallationTokenTable: { findFirst: async () => ({ expiresAt: new Date(Date.now() + 120_000) }) },
      collaboratorTable: { findFirst: async () => invited },
    } } },
    "@/db/schema": { githubInstallationTokenTable: { installationId: "installationId" } },
    "drizzle-orm": { eq: () => true },
    "@/lib/github-account": { getGithubAccount: async () => null },
    "@/lib/api-error": { createHttpError: (message, status) => Object.assign(new Error(message), { status }) },
    "@/lib/collaborator-access": { collaboratorMatchesUserForRepo: () => true },
    "@/lib/admin": { hasAdminAccess: () => admin },
    "@/lib/webs/content-repositories": load("lib/webs/content-repositories.ts"),
  });
  const user = { id: "user", email: "user@example.test" };
  return { requests, getToken: (owner, repo) => getToken(user, owner, repo), list: (owner) => listAdminContentRepos(user, owner) };
}

test("superadmin without GitHub or invitations opens content in both organizations", async () => {
  const cms = harness({ admin: true });
  for (const owner of ["leadgen-labs", "Leadgen-labs-cz"]) {
    assert.deepEqual(await cms.getToken(owner, "webs-obsah-demo"), { token: "test-token", source: "installation" });
    assert.deepEqual(cms.requests.at(-1).params, { owner, repo: "webs-obsah-demo" });
  }
});

test("ordinary users and unrelated repositories still require existing access", async () => {
  const admin = harness({ admin: true });
  const client = harness();
  await assert.rejects(admin.getToken("Leadgen-labs", "private-code"), { status: 403 });
  await assert.rejects(admin.getToken("Other", "webs-obsah-demo"), { status: 403 });
  await assert.rejects(client.getToken("Leadgen-labs", "webs-obsah-demo"), { status: 403 });
  assert.deepEqual(admin.requests.concat(client.requests), []);
  assert.equal((await harness({ invited: true }).getToken("Leadgen-labs", "webs-obsah-demo")).source, "installation");
});

test("listing uses the app only for superadmins and returns matching content repositories", async () => {
  assert.deepEqual((await harness({ admin: true }).list("Leadgen-labs-cz")).map(({ repo }) => repo), ["webs-obsah-demo"]);
  for (const [cms, owner] of [[harness(), "Leadgen-labs-cz"], [harness({ admin: true }), "Other"]]) {
    assert.deepEqual(await cms.list(owner), []);
    assert.deepEqual(cms.requests, []);
  }
});

test("an uninstalled repository does not grant access", async () => {
  const cms = harness({ admin: true, missing: true });
  await assert.rejects(cms.getToken("Leadgen-labs", "webs-obsah-demo"), { status: 403 });
  assert.deepEqual(await cms.list("Leadgen-labs"), []);
});

test("listing supports a GitHub App installation on a personal owner", async () => {
  const cms = harness({ admin: true, personalOwner: true });
  await cms.list("Leadgen-labs");
  assert.deepEqual(cms.requests.at(-1), {
    route: "GET /users/{username}/installation",
    params: { username: "Leadgen-labs" },
  });
});
