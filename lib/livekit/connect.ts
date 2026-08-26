import type { RoomOptions } from "livekit-client";

export const defaultRoomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: {
      width: 1280,
      height: 720,
      frameRate: 30,
    },
  },
};
