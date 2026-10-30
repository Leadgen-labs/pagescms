import { createHmac, timingSafeEqual } from "node:crypto";
import { getPreferredLanguage, setPreferredLanguage } from "@/lib/language-server";
import { z } from "zod";
export const dynamic = "force-dynamic";
/** Server-to-server lookup. A browser cannot read another person's preference. */
export async function POST(request: Request) {
  const secret = process.env.WEBS_BOT_SECRET;
  if (!secret) return new Response(null, {status:404});
  const raw = await request.text();
  if (raw.length > 1024) return new Response(null,{status:413});
  const timestamp = request.headers.get("x-webs-timestamp") ?? "";
  const signature = request.headers.get("x-webs-signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now()/1000 - Number(timestamp)) > 300 || !/^[a-f0-9]{64}$/.test(signature)) return new Response(null,{status:401});
  const expected = createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest();
  if (!timingSafeEqual(expected,Buffer.from(signature,"hex"))) return new Response(null,{status:401});
  const parsed = z.object({email:z.string().trim().email().max(200),language:z.enum(["cs","en"]).optional()}).safeParse(await Promise.resolve().then(() => JSON.parse(raw || "null")).catch(() => null));
  if (!parsed.success) return Response.json({error:"Invalid request"},{status:400});
  if (parsed.data.language) await setPreferredLanguage(parsed.data.email,parsed.data.language);
  return Response.json({language:await getPreferredLanguage(parsed.data.email)}, {headers:{"cache-control":"no-store"}});
}
