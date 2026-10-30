import { InviteEmailTemplate } from "@/components/email/invite";
import type { InvitationLocale } from "@/lib/invitation-email";

export const CollaboratorAddedEmailTemplate = (props: {
  email: string;
  repoName: string;
  repoUrl: string;
  invitedByName: string;
  invitedByUrl: string;
  locale?: InvitationLocale;
  language?: InvitationLocale;
}) => InviteEmailTemplate({ ...props, language: props.language ?? props.locale, inviteUrl: props.repoUrl, accessGranted: true });
