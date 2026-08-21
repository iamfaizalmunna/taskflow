import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders the priority label", () => {
    render(<Badge>high</Badge>);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("applies the red tone for high priority", () => {
    render(<Badge tone="red">urgent</Badge>);
    expect(screen.getByText("urgent")).toHaveClass("text-red-700");
  });
});
