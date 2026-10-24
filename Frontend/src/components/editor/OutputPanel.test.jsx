import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OutputPanel from "./OutputPanel";

describe("OutputPanel", () => {
  it("renders output text in terminal", () => {
    render(<OutputPanel output="Hello Antigravity!" />);

    expect(screen.getByTestId("terminal-output")).toHaveTextContent("Hello Antigravity!");
  });

  it("renders AI-simulated badge and disclaimer when isSimulated is true", () => {
    render(
      <OutputPanel
        output="Result computed"
        isSimulated={true}
      />
    );

    expect(screen.getByTestId("ai-simulated-badge")).toHaveTextContent("AI-Simulated (Gemini)");
    expect(screen.getByTestId("ai-simulated-disclaimer")).toBeInTheDocument();
  });

  it("does not render AI-simulated badge when isSimulated is false", () => {
    render(
      <OutputPanel
        output="Native output"
        isSimulated={false}
      />
    );

    expect(screen.queryByTestId("ai-simulated-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-simulated-disclaimer")).not.toBeInTheDocument();
  });

  it("renders error state when error is provided", () => {
    render(
      <OutputPanel
        output="Partial output"
        error="Execution timed out"
      />
    );

    expect(screen.getByTestId("output-error-banner")).toHaveTextContent("Error: Execution timed out");
  });

  it("triggers onClear when clear button is clicked", () => {
    const handleClear = vi.fn();
    render(
      <OutputPanel
        output="Some text"
        onClear={handleClear}
      />
    );

    const clearBtn = screen.getByTitle("Clear Output");
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("shows cancel button and invokes onCancel when running", () => {
    const handleCancel = vi.fn();
    render(
      <OutputPanel
        output="Starting..."
        isRunning={true}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByTitle("Cancel Execution");
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
