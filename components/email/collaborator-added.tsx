import type { Language } from "@/lib/language";
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import { emailTheme } from "@/components/email/theme";

export const CollaboratorAddedEmailTemplate = ({
  language = "cs",
  email,
  repoName,
  repoUrl,
  invitedByName,
  invitedByUrl,
}: {
  language?: Language;
  email: string;
  repoName: string;
  repoUrl: string;
  invitedByName: string;
  invitedByUrl: string;
}) => {
  const t = (cs: string, en: string) => language === "cs" ? cs : en;
  const baseUrl = process.env.BASE_URL
    ? process.env.BASE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "";

  return (
    <Html lang={language}>
      <Head />
      <Preview>
        {language === "cs" ? `Máte přístup ke správě webu „${repoName}“` : `You were added to "${repoName}" on Pages CMS`}
      </Preview>
      <Tailwind>
        <Body
          className="my-auto mx-auto font-sans px-2 antialiased"
          style={{
            backgroundColor: emailTheme.background,
            color: emailTheme.foreground,
          }}
        >
          <Container className="my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[24px]">
              <Img
                src={`${baseUrl}/images/email-logo.png`}
                width="42"
                height="42"
                alt="Pages CMS"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading
              className="text-[24px] font-semibold p-0 my-[30px] mx-0 text-center tracking-tight"
              style={{ color: emailTheme.foreground }}
            >
              {language === "cs" ? `Máte přístup ke správě webu „${repoName}“` : `You were added to "${repoName}"`}
            </Heading>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              <Link
                href={invitedByUrl}
                className="underline rounded-md"
                style={{ color: emailTheme.link }}
              >
                {invitedByName}
              </Link>{" "}
              {language === "cs" ? `vám udělil(a) přístup ke správě webu „${repoName}“. Přístup už je aktivní, nemusíte nic potvrzovat.` : `added you to the "${repoName}" project on Pages CMS. You already have access, so there is nothing to accept.`}
            </Text>
            <Section className="text-center mt-[24px] mb-[24px]">
              <Button
                className="rounded-lg text-[14px] font-medium no-underline text-center px-5 py-3"
                href={repoUrl}
                style={{
                  backgroundColor: emailTheme.buttonBackground,
                  border: `1px solid ${emailTheme.buttonBorder}`,
                  color: emailTheme.buttonForeground,
                }}
              >
                {t("Otevřít administraci webu", "Open website administration")}
              </Button>
            </Section>
            <Text
              className="text-[14px] leading-[24px] mt-[36px]"
              style={{ color: emailTheme.mutedForeground }}
            >
              {t("Tento e-mail je určen pro", "This email was intended for")}{" "}
              <Link
                href={`mailto:${email}`}
                className="underline"
                style={{ color: emailTheme.mutedLink }}
              >
                {email}
              </Link>
              .
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
