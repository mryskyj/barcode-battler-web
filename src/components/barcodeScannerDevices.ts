export type ScannerVideoInputDetails = {
  videoInputCount: number;
  devices: Array<{
    index: number;
    label: string;
    deviceId: string;
    groupId: string;
  }>;
};

export async function getScannerVideoInputDetails(
  mediaDevices: Pick<MediaDevices, "enumerateDevices">,
): Promise<ScannerVideoInputDetails> {
  const devices = await mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((device) => device.kind === "videoinput");

  return {
    videoInputCount: videoInputs.length,
    devices: videoInputs.map((device, index) => ({
      index,
      label: device.label,
      deviceId: device.deviceId,
      groupId: device.groupId,
    })),
  };
}
