import type {
  OfflineTripAdapter,
  OfflineTripConflict,
  OfflineTripItem,
  OfflineTripMutation,
  OfflineTripSnapshot,
} from "./offline-trip";

const RECORDS_STORE = "records";
const MUTATIONS_STORE = "mutations";
const MUTATION_ID_INDEX = "by-id";
const SNAPSHOT_KEY = "snapshot";
const CONFLICT_KEY = "conflict";

type StoredRecord<Value> = {
  key: string;
  value: Value;
};

type StoredMutation<Item extends OfflineTripItem> = {
  sequence?: number;
  id: string;
  mutation: OfflineTripMutation<Item>;
};

function comparableMutation<Item extends OfflineTripItem>(mutation: OfflineTripMutation<Item>) {
  return {
    id: mutation.id,
    baseVersion: mutation.baseVersion,
    action: mutation.action,
    changedIds: mutation.changedIds,
    items: mutation.items,
  };
}

function duplicateMutationError(id: string) {
  return Object.assign(
    new Error(`Mutation ID ${id} is already used for different trip data.`),
    { name: "OfflineTripDuplicateMutationError", code: "DUPLICATE_MUTATION_ID" },
  );
}

export type IndexedDbTripAdapterOptions = {
  databaseName?: string;
  indexedDB?: IDBFactory;
};

function requestResult<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error ?? new Error("IndexedDB transaction was aborted."),
    );
    transaction.onerror = () => reject(
      transaction.error ?? new Error("IndexedDB transaction failed."),
    );
  });
}

export class IndexedDbTripAdapter<Item extends OfflineTripItem = OfflineTripItem>
implements OfflineTripAdapter<Item> {
  private readonly databaseName: string;
  private readonly factory: IDBFactory;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbTripAdapterOptions = {}) {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) {
      throw new Error("IndexedDB is unavailable in this browser.");
    }
    this.databaseName = options.databaseName ?? "japan-trip-offline";
    this.factory = factory;
  }

  async readSnapshot() {
    return this.readRecord<OfflineTripSnapshot<Item>>(SNAPSHOT_KEY);
  }

  async writeSnapshot(snapshot: OfflineTripSnapshot<Item>) {
    await this.writeRecord(SNAPSHOT_KEY, snapshot);
  }

  async readMutations() {
    return this.withTransaction([MUTATIONS_STORE], "readonly", async (transaction) => {
      const records = await requestResult(
        transaction.objectStore(MUTATIONS_STORE).getAll() as IDBRequest<StoredMutation<Item>[]>,
      );
      return records.map((record) => record.mutation);
    });
  }

  async appendMutation(mutation: OfflineTripMutation<Item>) {
    return this.withTransaction([MUTATIONS_STORE], "readwrite", async (transaction) => {
      const store = transaction.objectStore(MUTATIONS_STORE);
      const existing = await requestResult(
        store.index(MUTATION_ID_INDEX).get(mutation.id) as IDBRequest<StoredMutation<Item> | undefined>,
      );
      if (existing) {
        if (
          JSON.stringify(comparableMutation(existing.mutation)) !==
          JSON.stringify(comparableMutation(mutation))
        ) {
          throw duplicateMutationError(mutation.id);
        }
        return existing.mutation;
      }
      await requestResult(store.add({ id: mutation.id, mutation }));
      return mutation;
    });
  }

  async removeMutation(id: string) {
    await this.withTransaction([MUTATIONS_STORE], "readwrite", async (transaction) => {
      const store = transaction.objectStore(MUTATIONS_STORE);
      const key = await requestResult(store.index(MUTATION_ID_INDEX).getKey(id));
      if (key !== undefined) await requestResult(store.delete(key));
    });
  }

  async readConflict() {
    return this.readRecord<OfflineTripConflict<Item>>(CONFLICT_KEY);
  }

  async writeConflict(conflict: OfflineTripConflict<Item>) {
    await this.writeRecord(CONFLICT_KEY, conflict);
  }

  async clearAll() {
    await this.withTransaction(
      [RECORDS_STORE, MUTATIONS_STORE],
      "readwrite",
      async (transaction) => {
        await Promise.all([
          requestResult(transaction.objectStore(RECORDS_STORE).clear()),
          requestResult(transaction.objectStore(MUTATIONS_STORE).clear()),
        ]);
      },
    );
  }

  private async readRecord<Value>(key: string): Promise<Value | null> {
    return this.withTransaction([RECORDS_STORE], "readonly", async (transaction) => {
      const record = await requestResult(
        transaction.objectStore(RECORDS_STORE).get(key) as IDBRequest<StoredRecord<Value> | undefined>,
      );
      return record?.value ?? null;
    });
  }

  private async writeRecord<Value>(key: string, value: Value) {
    await this.withTransaction([RECORDS_STORE], "readwrite", async (transaction) => {
      await requestResult(transaction.objectStore(RECORDS_STORE).put({ key, value }));
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.factory.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(RECORDS_STORE)) {
          database.createObjectStore(RECORDS_STORE, { keyPath: "key" });
        }
        if (!database.objectStoreNames.contains(MUTATIONS_STORE)) {
          const mutations = database.createObjectStore(MUTATIONS_STORE, {
            keyPath: "sequence",
            autoIncrement: true,
          });
          mutations.createIndex(MUTATION_ID_INDEX, "id", { unique: true });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.databasePromise = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error("The offline trip database could not be opened."));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error("The offline trip database upgrade is blocked by another tab."));
      };
    });
    return this.databasePromise;
  }

  private async withTransaction<Result>(
    stores: string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => Promise<Result>,
  ): Promise<Result> {
    const database = await this.openDatabase();
    const transaction = database.transaction(stores, mode);
    const completed = transactionComplete(transaction);
    try {
      const result = await operation(transaction);
      await completed;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The request may already have aborted the transaction.
      }
      try {
        await completed;
      } catch {
        // Preserve the original operation error.
      }
      throw error;
    }
  }
}
