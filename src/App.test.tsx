import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("shows a battle mode selector", () => {
    render(<App />);

    expect(screen.getByRole("radio", { name: "CPU戦" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "2人ローカル対戦" })).toBeInTheDocument();
  });

  it("disables CPU battle start in local mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "2人ローカル対戦" }));

    expect(screen.getByText("2人ローカル対戦は次のタスクで実装します")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "生成して戦う" }),
    ).toBeDisabled();
  });

  it("keeps primary battle controls available for compact layouts", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "生成して戦う" }));

    for (const command of ["たたかう", "ためる", "まもる", "必殺"]) {
      expect(screen.getByRole("button", { name: command })).toBeEnabled();
    }
    expect(screen.getByRole("region", { name: "戦闘ログ" })).toBeInTheDocument();
  });

  it("disables battle start while barcode is empty", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("バーコード"));

    expect(
      screen.getByRole("button", { name: "生成して戦う" }),
    ).toBeDisabled();
    expect(screen.getByText("バーコードを入力してください")).toBeInTheDocument();
  });

  it("shows a warning while barcode is too short", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("バーコード"));
    await user.type(screen.getByLabelText("バーコード"), "123");

    expect(screen.getByText("4文字以上で入力してください")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "生成して戦う" }),
    ).toBeDisabled();
  });

  it("updates the battle log after a command", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "生成して戦う" }));
    await user.click(screen.getByRole("button", { name: "たたかう" }));

    expect(screen.getByText(/プレイヤーの「たたかう」/)).toBeInTheDocument();
  });

  it("can rematch with the same barcode after a battle result", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("バーコード"));
    await user.type(screen.getByLabelText("バーコード"), "9999999999999");
    await user.click(screen.getByRole("button", { name: "生成して戦う" }));

    for (let i = 0; i < 40; i += 1) {
      const attackButton = screen.queryByRole("button", { name: "たたかう" });
      if (attackButton === null) {
        break;
      }
      await user.click(attackButton);
    }

    expect(screen.getByRole("button", { name: "同じバーコードで再戦" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "同じバーコードで再戦" }));

    expect(screen.getByRole("button", { name: "たたかう" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "同じバーコードで再戦" })).not.toBeInTheDocument();
  });

  it("can return to barcode input after a battle result", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("バーコード"));
    await user.type(screen.getByLabelText("バーコード"), "9999999999999");
    await user.click(screen.getByRole("button", { name: "生成して戦う" }));

    for (let i = 0; i < 40; i += 1) {
      const attackButton = screen.queryByRole("button", { name: "たたかう" });
      if (attackButton === null) {
        break;
      }
      await user.click(attackButton);
    }

    await user.click(screen.getByRole("button", { name: "入力へ戻る" }));

    expect(screen.getByLabelText("バーコード")).toHaveValue("9999999999999");
  });
});
