import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { collaboratorTable, userTable } from "@/db/schema";
import { normalizeEmail } from "@/lib/collaborator-access";

export const dynamic = "force-dynamic";

const input = z.object({
  email: z.string().trim().email().max(200),
  owners: z.array(z.string().regex(/^[a-z0-9-]{1,39}$/i)).min(1).max(2),
});

export async function POST(request: Request) {
  const secret = process.env.WEBS_BOT_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  const raw = await request.text();
  if (raw.length > 1024) return new Response(null, { status: 413 });

  const timestamp = request.headers.get("x-webs-timestamp") ?? "";
  const signature = request.headers.get("x-webs-signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !/^[a-f0-9]{64}$/.test(signature)) {
    return new Response(null, { status: 401 });
  }
  const expected = createHmac("sha256", secret).update(`site-access.${timestamp}.${raw}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return new Response(null, { status: 401 });

  let parsed;
  try {
    parsed = input.safeParse(JSON.parse(raw));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const verifiedUserIds = db.select({ id: userTable.id }).from(userTable).where(and(
    sql`lower(${userTable.email}) = ${email}`,
    eq(userTable.emailVerified, true),
  ));
  const grants = await db.selectDistinct({ owner: collaboratorTable.owner, repo: collaboratorTable.repo })
    .from(collaboratorTable).where(and(
      inArray(sql`lower(${collaboratorTable.owner})`, parsed.data.owners.map((owner) => owner.toLowerCase())),
      sql`lower(${collaboratorTable.repo}) like 'webs-obsah-%'`,
      or(
        inArray(collaboratorTable.userId, verifiedUserIds),
        and(isNull(collaboratorTable.userId), sql`lower(${collaboratorTable.email}) = ${email}`),
      ),
    ));
  return Response.json({ repositories: grants.map(({ owner, repo }) => `${owner}/${repo}`) }, {
    headers: { "cache-control": "no-store" },
  });
}
