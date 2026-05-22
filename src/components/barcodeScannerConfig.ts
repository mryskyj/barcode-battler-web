export const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
  {
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  },
  {
    video: true,
    audio: false,
  },
];

export const CAMERA_UNAVAILABLE_MESSAGE =
  "この端末ではカメラ読み取りを使えません";
export const SCAN_INTERVAL_MS = 120;
export const SCAN_MAX_LONG_SIDES = [1920, 1280] as const;
