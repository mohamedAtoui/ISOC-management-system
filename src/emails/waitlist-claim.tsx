import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface WaitlistClaimEmailProps {
  name: string;
  eventName: string;
  eventDate: string;
  claimUrl: string;
}

export default function WaitlistClaimEmail({
  name,
  eventName,
  eventDate,
  claimUrl,
}: WaitlistClaimEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>ISOC Iftar</Text>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              A spot has opened up for <strong>{eventName}</strong> on{" "}
              <strong>{eventDate}</strong>!
            </Text>
            <Text style={urgentText}>
              Click the button below to claim your spot. First come, first
              served!
            </Text>
            <Button style={button} href={claimUrl}>
              Claim Your Spot
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              This spot will be given to the first person who claims it. If
              someone else claims it before you, you&apos;ll remain on the
              waitlist.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "560px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  textAlign: "center" as const,
  color: "#1e40af",
  padding: "0 48px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333",
  padding: "0 48px",
};

const urgentText = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#dc2626",
  fontWeight: "bold" as const,
  padding: "0 48px",
};

const button = {
  backgroundColor: "#16a34a",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "18px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "16px 24px",
  margin: "16px 48px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 48px",
};

const footer = {
  fontSize: "13px",
  color: "#999",
  padding: "0 48px",
  lineHeight: "22px",
};
