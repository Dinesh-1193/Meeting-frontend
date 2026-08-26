export function getLiveKitUrl(serverUrlFromToken?: string): string {
  return (
    serverUrlFromToken ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    "wss://your-livekit-server.livekit.cloud"
  );
}
