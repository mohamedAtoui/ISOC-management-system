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

interface BlacklistedEmailProps {
  name: string;
}

export default function BlacklistedEmail({ name }: BlacklistedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>ISOC Iftar</Text>
            <Text style={paragraph}>Hi {name},</Text>
            <Text style={paragraph}>
              Due to repeated no-shows, your account has been{" "}
              <strong>suspended</strong>. You will no longer be able to book Iftar
              events.
            </Text>
            <Text style={alertText}>Account Suspended</Text>
            <Hr style={hr} />
            <Text style={footer}>
              If you believe this is an error, please contact the ISOC committee
              to appeal.
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

const alertText = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  textAlign: "center" as const,
  color: "#ffffff",
  padding: "16px 48px",
  backgroundColor: "#dc2626",
  margin: "16px 48px",
  borderRadius: "8px",
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
