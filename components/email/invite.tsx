import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";
import { getBaseUrl } from "@/lib/base-url";
import type { InvitationLocale } from "@/lib/invitation-email";

const mcpUrl = "https://mcp.mobilut.com/mcp";
const paragraph: React.CSSProperties = { fontSize: "16px", lineHeight: "25px", margin: "16px 0" };
const linkStyle: React.CSSProperties = { color: "#5b21b6", textDecoration: "underline" };

export const InviteEmailTemplate = ({ repoName, inviteUrl, locale = "cs", accessGranted = false }: {
  email: string;
  repoName: string;
  inviteUrl: string;
  invitedByName?: string;
  invitedByUrl?: string;
  locale?: InvitationLocale;
  accessGranted?: boolean;
}) => {
  const en = locale === "en";
  const baseUrl = getBaseUrl();
  const host = new URL(baseUrl).host;
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{en ? "Manage your website from your phone or connect it to your AI assistant." : "Upravujte web z mobilu nebo ho propojte se svým AI asistentem."}</Preview>
      <Body style={{ backgroundColor: "#f5f3ff", color: "#18181b", fontFamily: "Arial, sans-serif", margin: "0", padding: "16px 8px" }}>
        <Container style={{ backgroundColor: "#ffffff", width: "100%", maxWidth: "560px", margin: "0 auto", padding: "28px 20px", borderRadius: "16px" }}>
          <Heading style={{ fontSize: "26px", lineHeight: "32px", margin: "0 0 24px" }}>Mobilut</Heading>
          <Text style={paragraph}>{en ? "Hello," : "Ahoj,"}</Text>
          <Text style={paragraph}>
            {en ? <>You now have access to manage <strong>{repoName}</strong> in Mobilut.</> : <>Právě jsme vám zpřístupnili správu webu <strong>{repoName}</strong> v nástroji Mobilut.</>}
          </Text>
          <Text style={paragraph}><strong>{en ? "Mobilut = a secure website you can manage from your phone." : "Mobilut = bezpečný web, který můžete spravovat z mobilu."}</strong></Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={inviteUrl} style={{ backgroundColor: "#009869", color: "#ffffff", fontSize: "16px", fontWeight: 700, lineHeight: "24px", padding: "14px 20px", borderRadius: "8px", textAlign: "center" }}>
              {en ? (accessGranted ? "Open the admin" : "Accept invitation and open the admin") : (accessGranted ? "Otevřít administraci" : "Přijmout pozvánku a otevřít administraci")}
            </Button>
          </Section>
          <Section style={{ backgroundColor: "#4c1d95", color: "#ffffff", borderRadius: "12px", padding: "24px 20px", margin: "28px 0" }}>
            <Heading as="h2" style={{ color: "#ffffff", fontSize: "24px", lineHeight: "31px", margin: "0 0 16px" }}>
              {en ? "✨ MANAGE YOUR WEBSITE DIRECTLY FROM YOUR AI CHAT" : "✨ SPRAVUJTE WEB PŘÍMO ZE SVÉHO AI CHATU"}
            </Heading>
            <Text style={paragraph}>
              <strong>{en ? "Connect Mobilut to Claude or ChatGPT via MCP." : "Propojte Mobilut s Claudem nebo ChatGPT přes MCP."}</strong>{" "}
              {en ? "Your AI assistant can then work directly with your website’s content, prepare articles and request changes to pages." : "Váš AI asistent pak může pracovat přímo s obsahem webu, připravovat články a zadávat úpravy stránek."}
            </Text>
            <Text style={paragraph}>{en ? "Just ask:" : "Stačí mu napsat:"}</Text>
            <Text style={{ ...paragraph, fontStyle: "italic" }}>{en ? "“Prepare a new article about our services and save it in the admin as a draft.”" : "„Připrav nový článek o našich službách a ulož ho do administrace jako koncept.“"}</Text>
            <Text style={{ ...paragraph, fontStyle: "italic" }}>{en ? "“Update the pricing page. First, ask me for the information you need.”" : "„Uprav stránku s ceníkem. Nejdřív se mě zeptej na potřebné informace.“"}</Text>
            <Text style={{ ...paragraph, marginBottom: "0" }}><strong>{en ? "AI prepares the drafts. You confirm article publication or deployment of website changes." : "Koncepty připraví AI. Zveřejnění článku nebo nasazení úpravy potvrdíte vy."}</strong></Text>
          </Section>
          <Heading as="h2" style={{ fontSize: "20px", lineHeight: "28px", margin: "24px 0 12px" }}>{en ? "Connect in a few steps" : "Propojení zvládnete v pár krocích"}</Heading>
          <Text style={paragraph}>{en ? "Copy the connector address:" : "Zkopírujte adresu konektoru:"}</Text>
          <Text style={{ ...paragraph, backgroundColor: "#ede9fe", padding: "12px", borderRadius: "6px", overflowWrap: "anywhere" }}><Link href={mcpUrl} style={{ ...linkStyle, fontSize: "14px", fontFamily: "monospace" }}>{mcpUrl}</Link></Text>
          <ul style={{ paddingLeft: "20px", fontSize: "15px", lineHeight: "24px" }}>
            <li style={{ marginBottom: "16px" }}>
              <strong>Claude:</strong>{" "}<strong>Customize → Connectors → + Add → Add custom connector.</strong>{" "}
              {en ? "Enter Mobilut as the name, paste the address and complete the connection. In your chat, enable it via " : "Zadejte název Mobilut, vložte adresu a dokončete připojení. V chatu ho zapněte přes "}<strong>+ → Connectors.</strong>{" "}
              <Link href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp" style={linkStyle}>{en ? "Guide" : "Návod"}</Link>
            </li>
            <li style={{ marginBottom: "16px" }}>
              <strong>ChatGPT:</strong>{" "}{en ? "Open " : "Otevřete "}<Link href="https://chatgpt.com/plugins" style={linkStyle}>Plugins</Link><strong> → + → Add custom MCP server.</strong>{" "}
              {en ? "Enter Mobilut as the name, paste the address, select " : "Zadejte název Mobilut, vložte adresu, vyberte "}<strong>OAuth</strong>{en ? " and complete the connection. In your chat, select " : " a dokončete připojení. V chatu vyberte "}<strong>@Mobilut.</strong>{" "}
              {en ? "Availability depends on your account. " : "Dostupnost závisí na vašem účtu. "}<Link href="https://developers.openai.com/plugins/deploy/connect-chatgpt" style={linkStyle}>{en ? "Guide" : "Návod"}</Link>
            </li>
            <li>
              <strong>Gemini:</strong>{" "}{en ? "Custom MCP connections are being rolled out. Check " : "Podpora vlastních MCP propojení se postupně zpřístupňuje. V "}<strong>Settings → Connected Apps</strong>{en ? " for the " : " si zkontrolujte, jestli už máte možnost "}<strong>Add a custom app</strong>{en ? " option. If it’s available, paste the Mobilut connector address and complete the connection. " : ". Pokud ano, vložte adresu konektoru Mobilut a dokončete připojení. "}<Link href="https://support.google.com/gemini/answer/17209137?hl=en" style={linkStyle}>{en ? "Guide and current availability" : "Návod a aktuální dostupnost"}</Link>
            </li>
          </ul>
          <Text style={paragraph}>{en ? "Sign in with the same email address that received this invitation and enter the verification code sent to your inbox." : "Přihlaste se stejným e-mailem, na který přišla pozvánka, a zadejte ověřovací kód z e-mailu."}</Text>
          <Heading as="h2" style={{ fontSize: "20px", lineHeight: "28px", margin: "28px 0 12px" }}>{en ? "What’s in the admin" : "Co najdete v administraci"}</Heading>
          <Text style={paragraph}>
            {en ? "Articles, drafts, images and website settings. Use the “Napsat botovi” (Message the bot) button in the bottom right to request changes or ask for help. You’ll find the admin at " : "Články, koncepty, obrázky a nastavení webu. Přes tlačítko „Napsat botovi“ vpravo dole můžete zadávat úpravy nebo požádat o pomoc. Administraci najdete na "}
            <Link href={baseUrl} style={linkStyle}><strong>{host}</strong></Link>.
          </Text>
          <Text style={{ ...paragraph, marginTop: "28px" }}><strong>{en ? "The Mobilut team" : "Tým Mobilut"}</strong></Text>
        </Container>
      </Body>
    </Html>
  );
};
