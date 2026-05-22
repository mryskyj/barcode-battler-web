import { render, screen, within } from "@testing-library/react";
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
    expect(screen.getByRole("radio", { name: "通信対戦" })).toBeInTheDocument();
  });

  it("shows local battle setup and keeps the start button locked until both players are ready", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "2人ローカル対戦" }));

    expect(screen.getByLabelText("プレイヤー1のバーコード")).toBeInTheDocument();
    expect(screen.getByLabelText("プレイヤー2のバーコード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "プレイヤー1を準備" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "プレイヤー2を準備" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "対戦を始める" })).toBeDisabled();
  });

  it("keeps local player barcode inputs independent", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "2人ローカル対戦" }));
    await user.clear(screen.getByLabelText("プレイヤー1のバーコード"));
    await user.type(screen.getByLabelText("プレイヤー1のバーコード"), "1234");
    await user.clear(screen.getByLabelText("プレイヤー2のバーコード"));
    await user.type(screen.getByLabelText("プレイヤー2のバーコード"), "5678");

    expect(screen.getByLabelText("プレイヤー1のバーコード")).toHaveValue("1234");
    expect(screen.getByLabelText("プレイヤー2のバーコード")).toHaveValue("5678");
  });

  it("starts a local battle after both players are prepared", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "2人ローカル対戦" }));
    await user.click(screen.getByRole("button", { name: "プレイヤー1を準備" }));
    await user.click(screen.getByRole("button", { name: "プレイヤー2を準備" }));
    await user.click(screen.getByRole("button", { name: "対戦を始める" }));

    expect(
      screen.getByRole("region", { name: "プレイヤー1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "プレイヤー2" }),
    ).toBeInTheDocument();
    expect(screen.getByText("プレイヤー1の選択")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "たたかう" })).toBeEnabled();
  });

  it("advances local battle turns after both players choose commands", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "2人ローカル対戦" }));
    await user.click(screen.getByRole("button", { name: "プレイヤー1を準備" }));
    await user.click(screen.getByRole("button", { name: "プレイヤー2を準備" }));
    await user.click(screen.getByRole("button", { name: "対戦を始める" }));

    await user.click(screen.getByRole("button", { name: "たたかう" }));

    expect(screen.getByText("プレイヤー2の選択")).toBeInTheDocument();
    expect(screen.getByText("プレイヤー1は選択済み")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ためる" }));

    expect(screen.getByText("プレイヤー1の選択")).toBeInTheDocument();
    expect(screen.getByText(/プレイヤー1の「たたかう」/)).toBeInTheDocument();
    expect(screen.getByText(/プレイヤー2は「ためる」/)).toBeInTheDocument();
  });

  it("does not reveal the first local command before the second player selects", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "2人ローカル対戦" }));
    await user.click(screen.getByRole("button", { name: "プレイヤー1を準備" }));
    await user.click(screen.getByRole("button", { name: "プレイヤー2を準備" }));
    await user.click(screen.getByRole("button", { name: "対戦を始める" }));
    await user.click(screen.getByRole("button", { name: "必殺" }));

    const battleLog = screen.getByRole("region", { name: "戦闘ログ" });
    expect(within(battleLog).getByText("プレイヤー1はコマンドを選択した")).toBeInTheDocument();
    expect(within(battleLog).queryByText(/プレイヤー1.*必殺/)).not.toBeInTheDocument();
  });

  it("shows remote battle room creation and join controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "通信対戦" }));

    expect(screen.getByRole("region", { name: "部屋を作る" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "部屋に参加する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "参加する" })).toBeDisabled();
  });

  it("shows remote character setup after creating a room", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "通信対戦" }));
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(screen.getByText("ホストとして参加中")).toBeInTheDocument();
    expect(screen.getByText("接続準備中")).toBeInTheDocument();
    expect(screen.getByText("自分のキャラクター準備待ち")).toBeInTheDocument();
    expect(screen.getByLabelText("自分のバーコード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeEnabled();
  });

  it("marks the remote character as ready", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "通信対戦" }));
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(screen.getByRole("button", { name: "キャラクター準備" }));

    expect(screen.getByText("キャラクター準備完了")).toBeInTheDocument();
    expect(screen.getByText("ゲストの参加・準備待ち")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeDisabled();
  });

  it("can leave remote setup and return to room selection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "通信対戦" }));
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));
    await user.click(screen.getByRole("button", { name: "退出して戻る" }));

    expect(screen.getByRole("region", { name: "部屋を作る" })).toBeInTheDocument();
  });

  it("keeps remote setup controls available for compact layouts", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "通信対戦" }));
    await user.click(screen.getByRole("button", { name: "部屋を作る" }));

    expect(screen.getByRole("status")).toHaveTextContent("接続準備中");
    expect(screen.getByRole("button", { name: "キャラクター準備" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "退出して戻る" })).toBeEnabled();
  });

  it("normalizes remote room ids before joining", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "通信対戦" }));
    await user.type(screen.getByLabelText("部屋ID"), " ab12cd ");
    await user.click(screen.getByRole("button", { name: "参加する" }));

    expect(screen.getByText("AB12CD")).toBeInTheDocument();
    expect(screen.getByText("ゲストとして参加中")).toBeInTheDocument();
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
