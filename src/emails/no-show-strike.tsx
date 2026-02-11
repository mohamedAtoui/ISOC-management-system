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

interface NoShowStrikeEmailProps {
  name: string;
  eventName: string;
  strikeCount: number;
  maxStrikes: number;
}

export default function NoShowStrikeEmail({
  name,
  eventName,
  strikeCount,
  maxStrikes,
}: NoShowStrikeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>ISOC Iftar</Text>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              You did not attend <strong>{eventName}</strong> despite having a
              confirmed booking. This counts as a no-show.
            </Text>
            <Text style={strikeText}>
              Strike {strikeCount} of {maxStrikes}
            </Text>
            <Hr style={hr} />
            <Text style={warningText}>
              {maxStrikes - strikeCount === 1
                ? "Warning: One more no-show will result in your account being suspended."
                : `You have ${maxStrikes - strikeCount} strikes remaining before your account is suspended.`}
            </Text>
            <Text style={footer}>
              If you can&apos;t attend an event, please cancel your booking in
              advance so someone else can take your spot.
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

const strikeText = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  textAlign: "center" as const,
  color: "#dc2626",
  padding: "16px 48px",
  backgroundColor: "#fef2f2",
  margin: "16px 48px",
  borderRadius: "8px",
};

const warningText = {
  fontSize: "14px",
  fontWeight: "bold" as const,
  color: "#ea580c",
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
