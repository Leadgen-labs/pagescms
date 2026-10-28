import {createHmac} from 'node:crypto';
import {getToken} from '@/lib/token';
import {createHttpError,toErrorResponse} from '@/lib/api-error';
import {requireApiUserSession} from '@/lib/session-server';

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
  await getToken(session.user,params.owner,params.repo);
  if(!session.user.email)throw createHttpError('Účet nemá e-mail.',403);
  const input=await request.json();
  if(!['forms','list','detail','stats','enable','status','settings','access'].includes(input.op))throw createHttpError('Neplatná operace.',400);
  const body=JSON.stringify({repo:`${params.owner}/${params.repo}`,email:session.user.email,op:input.op,args:input.args??{}});
  if(body.length>30000)throw createHttpError('Požadavek je příliš velký.',413);
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
  const response=await fetch(`${bot}/cms/submissions`,{method:'POST',headers:{'content-type':'application/json','x-webs-timestamp':timestamp,'x-webs-signature':signature},body,cache:'no-store',signal:AbortSignal.timeout(25000),redirect:'error'});
  const result=await response.json();
  return Response.json(result,{status:response.status,headers:{'cache-control':'no-store'}});
 }catch(error){return toErrorResponse(error);}
}
