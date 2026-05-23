import { describe, expect, it } from "vitest";
import { getScannerVideoInputDetails } from "./barcodeScannerDevices";

describe("barcodeScannerDevices", () => {
  it("summarizes video input devices for scanner investigation", async () => {
    const details = await getScannerVideoInputDetails({
      enumerateDevices: async () =>
        [
          createDevice("videoinput", "camera 0", "device-0", "group-a"),
          createDevice("audioinput", "mic", "device-1", "group-b"),
          createDevice("videoinput", "camera 2, facing back", "device-2", "group-a"),
        ] as MediaDeviceInfo[],
    });

    expect(details).toEqual({
      videoInputCount: 2,
      devices: [
        {
          index: 0,
          label: "camera 0",
          deviceId: "device-0",
          groupId: "group-a",
        },
        {
          index: 1,
          label: "camera 2, facing back",
          deviceId: "device-2",
          groupId: "group-a",
        },
      ],
    });
  });
});

function createDevice(
  kind: MediaDeviceKind,
  label: string,
  deviceId: string,
  groupId: string,
): MediaDeviceInfo {
  return {
    kind,
    label,
    deviceId,
    groupId,
    toJSON: () => ({}),
  };
}
