import { InviteEmailTemplate } from "@/components/email/invite";
import type { InvitationLocale } from "@/lib/invitation-email";

export const CollaboratorAddedEmailTemplate = (props: {
  email: string;
  repoName: string;
  repoUrl: string;
  invitedByName: string;
  invitedByUrl: string;
  locale?: InvitationLocale;
}) => InviteEmailTemplate({ ...props, inviteUrl: props.repoUrl, accessGranted: true });
