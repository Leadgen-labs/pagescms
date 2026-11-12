import "server-only";
import { createHash } from "node:crypto";

export function articleRevision(content: Buffer) {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}
