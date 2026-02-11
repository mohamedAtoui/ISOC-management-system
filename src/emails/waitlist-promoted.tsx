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

interface WaitlistPromotedEmailProps {
  name: string;
  eventName: string;
  eventDate: string;
  bookUrl: string;
}

export default function WaitlistPromotedEmail({
  name,
  eventName,
  eventDate,
  bookUrl,
}: WaitlistPromotedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>ISOC Iftar</Text>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              Great news! You&apos;ve been promoted from the waitlist and your
              spot for <strong>{eventName}</strong> on{" "}
              <strong>{eventDate}</strong> is now confirmed.
            </Text>
            <Text style={paragraph}>
              Log in to view your ticket and show it at the door.
            </Text>
            <Button style={button} href={bookUrl}>
              View Your Bookings
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              If you can no longer attend, please log in and cancel your booking
              so someone else can take your spot. No-shows receive a strike.
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

const button = {
  backgroundColor: "#16a34a",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
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
