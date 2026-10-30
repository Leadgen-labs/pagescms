/** The signed-in email is the sole visible account identifier. */
export function accountLabel(user: { email: string }) {
  return user.email;
}
