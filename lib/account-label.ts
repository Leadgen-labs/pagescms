/** Human label for display; never changes stored identity or permissions. */
export function accountLabel(user: { name?: string | null; githubUsername?: string | null; email: string }) {
  const name = user.name?.trim();
  return name && name.toLowerCase() !== user.githubUsername?.trim().toLowerCase() ? name : user.email;
}
