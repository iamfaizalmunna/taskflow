import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders the label", () => {
    render(<Button>Save task</Button>);
    expect(screen.getByRole("button", { name: "Save task" })).toBeEnabled();
  });

  it("uses the danger styles when asked", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-red-600");
  });

  it("can be disabled", () => {
    render(<Button disabled>Saving…</Button>);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
