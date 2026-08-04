export type TripViewMode = "full" | "my-day";

export function chooseInitialTripView(options: {
  role: "viewer" | "editor";
  requestedView: string | null;
  savedMode: string | null;
  duringTrip: boolean;
}): TripViewMode {
  if (options.role === "viewer") return "my-day";
  if (options.requestedView === "calendar") return "full";
  if (options.requestedView === "my-day") return "my-day";
  if (options.duringTrip) return "my-day";
  return options.savedMode === "my-day" ? "my-day" : "full";
}

export function mayQueueOfflineEdit(options: {
  online: boolean;
  hasConsent: boolean;
}) {
  return !options.online && options.hasConsent;
}

export function mayReplayLegacyPending(options: {
  pendingBaseVersion: unknown;
  serverVersion: number;
  hasConsent: boolean;
}) {
  return (
    options.hasConsent &&
    Number.isInteger(options.pendingBaseVersion) &&
    options.pendingBaseVersion === options.serverVersion
  );
}
