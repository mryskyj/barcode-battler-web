import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Barcode Battler Web" }),
    ).toBeInTheDocument();
  });

  it("starts a CPU battle from a barcode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "生成して戦う" }));

    expect(
      screen.getByRole("region", { name: "プレイヤー" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "敵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "たたかう" })).toBeInTheDocument();
  });

  it("disables battle start while barcode is empty", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("バーコード"));

    expect(
      screen.getByRole("button", { name: "生成して戦う" }),
    ).toBeDisabled();
  });

  it("updates the battle log after a command", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "生成して戦う" }));
    await user.click(screen.getByRole("button", { name: "たたかう" }));

    expect(screen.getByText(/プレイヤーの攻撃/)).toBeInTheDocument();
  });
});
