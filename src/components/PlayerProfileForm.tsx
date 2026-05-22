import { useState } from "react";
import type { FormEvent } from "react";
import {
  validatePlayerDisplayName,
  type PlayerProfile,
} from "../domain/playerProfile";

type PlayerProfileFormProps = {
  profile: PlayerProfile | null;
  storageErrorMessage: string | null;
  onSave: (displayName: string) => void;
};

export function PlayerProfileForm({
  profile,
  storageErrorMessage,
  onSave,
}: PlayerProfileFormProps) {
  const [displayNameInput, setDisplayNameInput] = useState(
    profile?.displayName ?? "",
  );
  const validation = validatePlayerDisplayName(displayNameInput);
  const errorMessage = validation.message ?? storageErrorMessage;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validation.isValid) {
      return;
    }

    onSave(validation.displayName);
    setDisplayNameInput(validation.displayName);
  }

  return (
    <section className="profile-panel" aria-label="プロフィール">
      <div className="profile-summary">
        <h2>プロフィール</h2>
        {profile === null ? (
          <p className="mode-note">ユーザー名を設定してください</p>
        ) : (
          <p className="room-id-display">
            <span>ユーザー名</span>
            <strong>{profile.displayName}</strong>
          </p>
        )}
      </div>
      <form className="barcode-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>ユーザー名</span>
          <input
            value={displayNameInput}
            onChange={(event) => setDisplayNameInput(event.target.value)}
            placeholder="プレイヤー"
            aria-invalid={errorMessage === null ? undefined : true}
            aria-describedby={errorMessage === null ? undefined : "profile-error"}
          />
        </label>
        {errorMessage === null ? null : (
          <p className="field-error" id="profile-error">
            {errorMessage}
          </p>
        )}
        <button type="submit" disabled={!validation.isValid}>
          {profile === null ? "ユーザー名を保存" : "変更を保存"}
        </button>
      </form>
    </section>
  );
}
