import "server-only";
import { db } from "@/db";
import { collaboratorMatchesUserForRepo } from "@/lib/collaborator-access";
import { createOctokitInstance } from "@/lib/utils/octokit";
import { hasAdminAccess } from "@/lib/admin";
import type { User } from "@/types/user";

/** Called after getToken checks this exact repository. Public/private read alone is insufficient. */
export async function canManageSubmissions(
 user: User, owner: string, repo: string,
 access: {token:string;source:"user"|"installation"},
):Promise<boolean>{
 if(hasAdminAccess(user))return true;
 // CMS invitations give the website manager access. Check the current record
 // even if getToken chose a linked GitHub token instead of the installation.
 const collaborator=await db.query.collaboratorTable.findFirst({where:collaboratorMatchesUserForRepo(user,owner,repo)});
 if(collaborator)return true;
 if(access.source!=="user")return false;
 try{
  const {data}=await createOctokitInstance(access.token).rest.repos.get({owner,repo});
  return data.permissions?.push===true;
 }catch{return false;}
}
