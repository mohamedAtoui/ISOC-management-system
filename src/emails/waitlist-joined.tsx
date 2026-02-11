import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface WaitlistJoinedEmailProps {
  name: string;
  eventName: string;
  eventDate: string;
}

export default function WaitlistJoinedEmail({
  name,
  eventName,
  eventDate,
}: WaitlistJoinedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>ISOC Iftar</Text>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              You&apos;ve been added to the waitlist for{" "}
              <strong>{eventName}</strong> on <strong>{eventDate}</strong>.
            </Text>
            <Text style={paragraph}>
              We&apos;ll notify you by email if a spot opens up and your booking
              is confirmed.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              You don&apos;t need to do anything else — we&apos;ll let you know
              as soon as there&apos;s an update.
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
