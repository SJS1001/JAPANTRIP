export type OfflineTripRole = "editor" | "viewer";

export type OfflineTripItem = {
  id: string;
  [field: string]: unknown;
};

export type OfflineTripSnapshot<Item extends OfflineTripItem = OfflineTripItem> = {
  version: number;
  savedAt: string;
  items: Item[];
};

export type OfflineTripMutation<Item extends OfflineTripItem = OfflineTripItem> = {
  id: string;
  baseVersion: number;
  createdAt: string;
  action: string;
  changedIds: string[];
  items: Item[];
};

export type OfflineTripMutationInput<Item extends OfflineTripItem = OfflineTripItem> =
  Omit<OfflineTripMutation<Item>, "createdAt">;

export type OfflineTripSyncSuccess = {
  kind: "applied" | "already-applied";
  version: number;
};

export type OfflineTripSyncConflict<Item extends OfflineTripItem = OfflineTripItem> = {
  kind: "conflict";
  serverSnapshot: OfflineTripSnapshot<Item>;
  conflictingItemIds: string[];
};

export type OfflineTripConflict<Item extends OfflineTripItem = OfflineTripItem> = {
  mutationId: string;
  baseVersion: number;
  detectedAt: string;
  conflictingItemIds: string[];
  serverSnapshot: OfflineTripSnapshot<Item>;
};

export type OfflineTripSyncSender<Item extends OfflineTripItem = OfflineTripItem> = (
  mutation: OfflineTripMutation<Item>,
) => Promise<OfflineTripSyncSuccess | OfflineTripSyncConflict<Item>>;

export type OfflineTripStatus<Item extends OfflineTripItem = OfflineTripItem> = {
  state: "empty" | "ready" | "pending" | "syncing" | "conflict";
  hasSnapshot: boolean;
  pendingCount: number;
  pendingMutationIds: string[];
  conflict: OfflineTripConflict<Item> | null;
};

export class OfflineTripPermissionError extends Error {
  readonly code = "EDITOR_REQUIRED";

  constructor() {
    super("Editor access is required to change the shared trip.");
    this.name = "OfflineTripPermissionError";
  }
}

export class OfflineTripClearError extends Error {
  readonly code: "CONFIRMATION_REQUIRED" | "PENDING_CHANGES" | "SYNC_IN_PROGRESS";

  constructor(
    code: "CONFIRMATION_REQUIRED" | "PENDING_CHANGES" | "SYNC_IN_PROGRESS",
    message: string,
  ) {
    super(message);
    this.name = "OfflineTripClearError";
    this.code = code;
  }
}

export interface OfflineTripAdapter<Item extends OfflineTripItem = OfflineTripItem> {
  readSnapshot(): Promise<OfflineTripSnapshot<Item> | null>;
  writeSnapshot(snapshot: OfflineTripSnapshot<Item>): Promise<void>;
  readMutations(): Promise<OfflineTripMutation<Item>[]>;
  appendMutation(mutation: OfflineTripMutation<Item>): Promise<OfflineTripMutation<Item>>;
  removeMutation(id: string): Promise<void>;
  readConflict(): Promise<OfflineTripConflict<Item> | null>;
  writeConflict(conflict: OfflineTripConflict<Item>): Promise<void>;
  clearAll(): Promise<void>;
}

export type OfflineTripOptions<Item extends OfflineTripItem = OfflineTripItem> = {
  adapter: OfflineTripAdapter<Item>;
  role: OfflineTripRole;
  now?: () => string;
};

export type OfflineTripClearOptions = {
  confirmation: string;
  discardPending?: boolean;
};

export interface OfflineTrip<Item extends OfflineTripItem = OfflineTripItem> {
  load(): Promise<OfflineTripSnapshot<Item> | null>;
  save(snapshot: OfflineTripSnapshot<Item>): Promise<void>;
  enqueue(input: OfflineTripMutationInput<Item>): Promise<OfflineTripMutation<Item>>;
  sync(send: OfflineTripSyncSender<Item>): Promise<OfflineTripStatus<Item>>;
  clear(options: OfflineTripClearOptions): Promise<void>;
  status(): Promise<OfflineTripStatus<Item>>;
}

export function createOfflineTrip<Item extends OfflineTripItem = OfflineTripItem>({
  adapter,
  role,
  now = () => new Date().toISOString(),
}: OfflineTripOptions<Item>): OfflineTrip<Item> {
  let syncing = false;
  let activeSync: Promise<OfflineTripStatus<Item>> | null = null;

  async function status(): Promise<OfflineTripStatus<Item>> {
    const [saved, mutations, conflict] = await Promise.all([
      adapter.readSnapshot(),
      adapter.readMutations(),
      adapter.readConflict(),
    ]);
    return {
      state: syncing
        ? "syncing"
        : conflict
          ? "conflict"
          : mutations.length
            ? "pending"
            : saved
              ? "ready"
              : "empty",
      hasSnapshot: saved !== null,
      pendingCount: mutations.length,
      pendingMutationIds: mutations.map((mutation) => mutation.id),
      conflict,
    };
  }

  function sync(send: OfflineTripSyncSender<Item>) {
    if (role !== "editor") return Promise.reject(new OfflineTripPermissionError());
    if (activeSync) return activeSync;
    activeSync = (async () => {
      if (await adapter.readConflict()) return status();
      syncing = true;
      try {
        const mutations = await adapter.readMutations();
        for (const mutation of mutations) {
          const result = await send(mutation);
          if (result.kind === "conflict") {
            await adapter.writeConflict({
              mutationId: mutation.id,
              baseVersion: mutation.baseVersion,
              detectedAt: now(),
              conflictingItemIds: result.conflictingItemIds,
              serverSnapshot: result.serverSnapshot,
            });
            break;
          }
          await adapter.writeSnapshot({
            version: result.version,
            savedAt: now(),
            items: mutation.items,
          });
          await adapter.removeMutation(mutation.id);
        }
      } finally {
        syncing = false;
      }
      return status();
    })().finally(() => {
      activeSync = null;
    });
    return activeSync;
  }

  return {
    load: () => adapter.readSnapshot(),
    save: (snapshot: OfflineTripSnapshot<Item>) => adapter.writeSnapshot(snapshot),
    async enqueue(input: OfflineTripMutationInput<Item>) {
      if (role !== "editor") throw new OfflineTripPermissionError();
      const mutation: OfflineTripMutation<Item> = { ...input, createdAt: now() };
      return adapter.appendMutation(mutation);
    },
    status,
    sync,
    async clear(options: OfflineTripClearOptions) {
      if (options.confirmation !== "REMOVE_OFFLINE_COPY") {
        throw new OfflineTripClearError(
          "CONFIRMATION_REQUIRED",
          "Removing the offline trip requires explicit confirmation.",
        );
      }
      if (activeSync) {
        throw new OfflineTripClearError(
          "SYNC_IN_PROGRESS",
          "Wait for synchronization to finish before removing the offline trip.",
        );
      }
      const mutations = await adapter.readMutations();
      if (mutations.length && !options.discardPending) {
        throw new OfflineTripClearError(
          "PENDING_CHANGES",
          "Unsynced trip changes require separate discard confirmation.",
        );
      }
      await adapter.clearAll();
    },
  };
}
