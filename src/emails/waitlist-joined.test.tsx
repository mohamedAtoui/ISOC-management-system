// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WaitlistJoinedEmail from "./waitlist-joined";

describe("WaitlistJoinedEmail", () => {
  it("renders recipient name", () => {
    const { container } = render(
      <WaitlistJoinedEmail name="Alice" eventName="Friday Iftar" eventDate="2026-03-15" />
    );
    expect(container.textContent).toContain("Hi Alice,");
  });

  it("renders event name and date", () => {
    const { container } = render(
      <WaitlistJoinedEmail name="Alice" eventName="Friday Iftar" eventDate="2026-03-15" />
    );
    expect(container.textContent).toContain("Friday Iftar");
    expect(container.textContent).toContain("2026-03-15");
  });

  it("contains 'added to the waitlist' text", () => {
    const { container } = render(
      <WaitlistJoinedEmail name="Alice" eventName="Friday Iftar" eventDate="2026-03-15" />
    );
    expect(container.textContent).toContain("added to the waitlist");
  });

  it("contains 'notify you by email' reassurance", () => {
    const { container } = render(
      <WaitlistJoinedEmail name="Alice" eventName="Friday Iftar" eventDate="2026-03-15" />
    );
    expect(container.textContent).toContain("notify you by email");
  });

  it("contains ISOC Iftar heading", () => {
    const { container } = render(
      <WaitlistJoinedEmail name="Alice" eventName="Friday Iftar" eventDate="2026-03-15" />
    );
    expect(container.textContent).toContain("ISOC Iftar");
  });

  it("does not crash with empty string props", () => {
    const { container } = render(
      <WaitlistJoinedEmail name="" eventName="" eventDate="" />
    );
    expect(container).toBeTruthy();
  });
});
