import type { FormEvent } from "react";

type BarcodeFormProps = {
  barcode: string;
  onBarcodeChange: (barcode: string) => void;
  onSubmit: () => void;
};

export function BarcodeForm({
  barcode,
  onBarcodeChange,
  onSubmit,
}: BarcodeFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="barcode-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>バーコード</span>
        <input
          value={barcode}
          onChange={(event) => onBarcodeChange(event.target.value)}
          inputMode="numeric"
          placeholder="4901234567894"
        />
      </label>
      <button type="submit" disabled={barcode.trim().length === 0}>
        生成して戦う
      </button>
    </form>
  );
}
