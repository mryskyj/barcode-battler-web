import type { FormEvent } from "react";

type BarcodeFormProps = {
  barcode: string;
  errorMessage: string | null;
  canSubmit: boolean;
  onBarcodeChange: (barcode: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  label?: string;
};

export function BarcodeForm({
  barcode,
  errorMessage,
  canSubmit,
  onBarcodeChange,
  onSubmit,
  submitLabel = "生成して戦う",
  label = "バーコード",
}: BarcodeFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit();
  }

  return (
    <form className="barcode-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>{label}</span>
        <input
          value={barcode}
          onChange={(event) => onBarcodeChange(event.target.value)}
          inputMode="numeric"
          placeholder="4901234567894"
          aria-invalid={errorMessage === null ? undefined : true}
          aria-describedby={errorMessage === null ? undefined : "barcode-error"}
        />
      </label>
      {errorMessage === null ? null : (
        <p className="field-error" id="barcode-error">
          {errorMessage}
        </p>
      )}
      <button type="submit" disabled={!canSubmit}>
        {submitLabel}
      </button>
    </form>
  );
}
