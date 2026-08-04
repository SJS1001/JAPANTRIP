import type {
  EmergencyContactsOfflineAdapter,
  OfflineEmergencyContactsSnapshot,
} from "./offline-emergency-contacts";

const STORE = "private-emergency-contacts";
const SNAPSHOT_KEY = "snapshot-v1";

type StoredSnapshot = {
  key: string;
  value: OfflineEmergencyContactsSnapshot;
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
    transaction.onerror = () => reject(
      transaction.error ?? new Error("The emergency contact transaction failed."),
    );
    transaction.onabort = () => reject(
      transaction.error ?? new Error("The emergency contact transaction was aborted."),
    );
  });
}

export class IndexedDbEmergencyContactsAdapter
implements EmergencyContactsOfflineAdapter {
  private databasePromise: Promise<IDBDatabase> | null = null;
  private readonly factory: IDBFactory;
  private readonly databaseName: string;

  constructor(options: { indexedDB?: IDBFactory; databaseName?: string } = {}) {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) throw new Error("IndexedDB is unavailable in this browser.");
    this.factory = factory;
    this.databaseName = options.databaseName ?? "japan-trip-private-emergency-v1";
  }

  async read() {
    return this.withStore("readonly", async (store) => {
      const record = await requestResult(
        store.get(SNAPSHOT_KEY) as IDBRequest<StoredSnapshot | undefined>,
      );
      return record?.value ?? null;
    });
  }

  async write(snapshot: OfflineEmergencyContactsSnapshot) {
    await this.withStore("readwrite", async (store) => {
      await requestResult(store.put({ key: SNAPSHOT_KEY, value: snapshot }));
    });
  }

  async clear() {
    await this.withStore("readwrite", async (store) => {
      await requestResult(store.delete(SNAPSHOT_KEY));
    });
  }

  private open() {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE, { keyPath: "key" });
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
        reject(request.error ?? new Error("The emergency contact database could not be opened."));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error("The emergency contact database is blocked by another tab."));
      };
    });
    return this.databasePromise;
  }

  private async withStore<Result>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<Result>,
  ) {
    const database = await this.open();
    const transaction = database.transaction(STORE, mode);
    const completed = transactionComplete(transaction);
    try {
      const result = await operation(transaction.objectStore(STORE));
      await completed;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The browser may already have aborted the transaction.
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
