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

interface BookingConfirmedEmailProps {
  name: string;
  eventName: string;
  eventDate: string;
  cancelUrl: string;
  ticketUrl: string;
}

export default function BookingConfirmedEmail({
  name,
  eventName,
  eventDate,
  cancelUrl,
  ticketUrl,
}: BookingConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>ISOC Iftar</Text>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              Your booking for <strong>{eventName}</strong> on{" "}
              <strong>{eventDate}</strong> has been confirmed!
            </Text>
            <Button style={button} href={ticketUrl}>
              View Your Ticket
            </Button>
            <Hr style={hr} />
            <Text style={smallText}>
              Can&apos;t make it? Cancel your booking:
            </Text>
            <Button style={cancelButton} href={cancelUrl}>
              Cancel Booking
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              Please show your ticket at the door. If you don&apos;t attend
              without cancelling, you will receive a strike.
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
  backgroundColor: "#1e40af",
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

const cancelButton = {
  backgroundColor: "#dc2626",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "14px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "10px 20px",
  margin: "8px 48px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 48px",
};

const smallText = {
  fontSize: "14px",
  color: "#666",
  padding: "0 48px",
};

const footer = {
  fontSize: "13px",
  color: "#999",
  padding: "0 48px",
  lineHeight: "22px",
};
