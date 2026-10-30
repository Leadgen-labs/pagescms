import {callWebsBot} from '@/lib/webs/bot';
import {getToken} from '@/lib/token';
import {createHttpError,toErrorResponse} from '@/lib/api-error';
import {requireApiUserSession} from '@/lib/session-server';
import {canManageSubmissions} from '@/lib/webs/submissions-access';

export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{owner:string;repo:string;branch:string}>}){
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)throw createHttpError('Neplatný původ požadavku.',403);
  const bot=(process.env.WEBS_BOT_URL??'').replace(/\/+$/,'');
  const secret=process.env.WEBS_BOT_SECRET;
  if(!bot||!secret)throw createHttpError('Evidence formulářů není připojena.',503);
  const session=await requireApiUserSession();if('response' in session)return session.response;
  const params=await context.params;
  const access=await getToken(session.user,params.owner,params.repo);
  if(!session.user.email)throw createHttpError('Účet nemá e-mail.',403);
  const input=await request.json();
  if(!['forms','list','detail','stats','enable','status','settings','access'].includes(input.op))throw createHttpError('Neplatná operace.',400);
  const manager=await canManageSubmissions(session.user,params.owner,params.repo,access);
  const body=JSON.stringify({repo:`${params.owner}/${params.repo}`,email:session.user.email,...(manager?{cmsRole:'manager'}:{}),op:input.op,args:input.args??{}});
  if(body.length>30000)throw createHttpError('Požadavek je příliš velký.',413);
  const response=await callWebsBot('/cms/submissions',JSON.parse(body));
  return Response.json(response.data,{status:response.status,headers:{'cache-control':'no-store'}});
 }catch(error){return toErrorResponse(error);}
}
