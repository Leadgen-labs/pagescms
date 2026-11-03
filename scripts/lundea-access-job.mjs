// One-off operator job: runs only on its named Vercel preview branch.
// No credential export, email, session creation, global role or domain change.
import assert from 'node:assert/strict';
import {createSign} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const target={email:'it@leadmarket.cz',owner:'Leadgen-labs',ownerId:342474396,repo:'webs-obsah-lundea'};
export const shouldRun=env=>env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='codex/lundea-access-job';
export function validateRepo(repo,installation){
 assert.equal(repo.full_name?.toLowerCase(),`${target.owner}/${target.repo}`.toLowerCase());
 assert.equal(repo.owner?.id,target.ownerId);
 assert.equal(installation.account?.id,target.ownerId);
 assert.equal(installation.account?.login?.toLowerCase(),target.owner.toLowerCase());
 assert.ok(Number.isSafeInteger(repo.id)&&repo.id>0);
 assert.ok(Number.isSafeInteger(installation.id)&&installation.id>0);
 return {type:repo.owner.type==='User'?'user':'org',installationId:installation.id,repoId:repo.id};
}
export async function grant(env=process.env){
 if(!shouldRun(env))return {skipped:true};
 for(const key of ['DATABASE_URL','GITHUB_APP_ID','GITHUB_APP_PRIVATE_KEY'])assert.ok(env[key],`Required server configuration missing: ${key}`);
 const dbUrl=new URL(env.DATABASE_URL);
 assert.ok(['postgres:','postgresql:'].includes(dbUrl.protocol)&&dbUrl.hostname.endsWith('.neon.tech'),'Expected CMS database required');
 const now=Math.floor(Date.now()/1000),b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iat:now-30,exp:now+540,iss:env.GITHUB_APP_ID});
 const jwt=unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(env.GITHUB_APP_PRIVATE_KEY,'base64url');
 const github=async(path,token,method='GET',body)=>{
  const response=await fetch('https://api.github.com'+path,{method,headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  assert.ok(response.ok,`CMS GitHub API HTTP ${response.status}`);return response.json();
 };
 const installations=await github('/app/installations?per_page=100',jwt);
 const matches=installations.filter(i=>i.account?.id===target.ownerId&&i.account?.login?.toLowerCase()===target.owner.toLowerCase());
 assert.equal(matches.length,1,'Unique expected CMS installation required');
 const installation=matches[0];
 const {token}=await github(`/app/installations/${installation.id}/access_tokens`,jwt,'POST',{});
 const repo=await github(`/repos/${target.owner}/${target.repo}`,token);
 const identity=validateRepo(repo,installation);
 const {default:postgres}=await import('postgres');
 const sql=postgres(env.DATABASE_URL,{max:1,ssl:'require',connect_timeout:20,prepare:false,onnotice:()=>{}});
 try{
  return await sql.begin(async tx=>{
   const users=await tx`SELECT id FROM "user" WHERE lower(email)=${target.email} AND email_verified=true`;
   assert.ok(users.length<=1,'Ambiguous verified CMS user');
   const userId=users[0]?.id??null;
   const before=await tx`SELECT id,type,installation_id,owner_id,repo_id,user_id FROM collaborator WHERE lower(owner)=${target.owner.toLowerCase()} AND lower(repo)=${target.repo} AND lower(email)=${target.email}`;
   assert.ok(before.length<=1,'Ambiguous collaborator identity');
   await tx`INSERT INTO collaborator(type,installation_id,owner_id,repo_id,owner,repo,email,user_id)
    VALUES (${identity.type},${identity.installationId},${target.ownerId},${identity.repoId},${target.owner},${target.repo},${target.email},${userId})
    ON CONFLICT (lower(owner),lower(repo),lower(email)) DO UPDATE SET type=excluded.type,installation_id=excluded.installation_id,owner_id=excluded.owner_id,repo_id=excluded.repo_id,user_id=excluded.user_id`;
   const rows=await tx`SELECT type,installation_id,owner_id,repo_id,user_id FROM collaborator WHERE lower(owner)=${target.owner.toLowerCase()} AND lower(repo)=${target.repo} AND lower(email)=${target.email}`;
   assert.equal(rows.length,1);assert.equal(rows[0].user_id,userId);assert.equal(rows[0].repo_id,identity.repoId);assert.equal(rows[0].owner_id,target.ownerId);assert.equal(rows[0].installation_id,identity.installationId);assert.equal(rows[0].type,identity.type);
   return {email:target.email,repository:`${target.owner}/${target.repo}`,verifiedUser:users.length===1,accessPrepared:true,binding:userId?'verified-user':'email-awaiting-first-sign-in',existing:before.length===1,globalAdminChanged:false,emailsSent:0,productionActivated:false};
  });
 }finally{await sql.end({timeout:5});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log('LUNDEA_ACCESS_RESULT '+JSON.stringify(await grant()));}
 catch(error){console.error('LUNDEA_ACCESS_FAILED '+(error instanceof assert.AssertionError?error.message:String(error.code||error.name)));process.exitCode=1;}
}
