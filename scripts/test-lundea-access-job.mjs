import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shouldRun,grant,validateRepo,target} from './lundea-access-job.mjs';
test('operator job never runs on production, main or another preview',async()=>{
 for(const env of [{},{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'codex/lundea-access-job'},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'main'},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/other'}]){
  assert.equal(shouldRun(env),false);assert.deepEqual(await grant(env),{skipped:true});
 }
});
test('grant accepts only the exact repository and owner verified by the CMS installation',()=>{
 const repo={id:100,full_name:'Leadgen-labs/webs-obsah-lundea',owner:{id:target.ownerId,type:'User'}};
 const installation={id:50,account:{id:target.ownerId,login:'Leadgen-labs'}};
 assert.equal(validateRepo(repo,installation).type,'user');
 for(const changed of [{...repo,full_name:'Leadgen-labs/webs-obsah-lundea-copy'},{...repo,owner:{id:1}},{...repo,id:null}])assert.throws(()=>validateRepo(changed,installation));
 assert.throws(()=>validateRepo(repo,{...installation,account:{id:1,login:'Other'}}));
});
