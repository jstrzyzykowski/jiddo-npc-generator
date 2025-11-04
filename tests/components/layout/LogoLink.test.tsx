import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LogoLink } from "@/components/layout/LogoLink/LogoLink";

describe("LogoLink", () => {
  it("should render a link to the homepage", () => {
    render(<LogoLink />);

    const linkElement = screen.getByRole("link", {
      name: /Go to homepage/i,
    });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute("href", "/");
  });

  it("should render the logo text", () => {
    render(<LogoLink />);
    const logoText = screen.getByText("JIDDO");
    expect(logoText).toBeInTheDocument();
  });
});
