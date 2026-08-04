import type { DevelopmentScreenshotMediaType } from "../development-notes";

export type QueuedDevelopmentScreenshot = {
  id: string;
  noteId: string;
  displayName: string;
  mediaType: DevelopmentScreenshotMediaType;
  bytes: Uint8Array;
  queuedAt: string;
};

export interface DevelopmentScreenshotQueueAdapter {
  list(): Promise<QueuedDevelopmentScreenshot[]>;
  put(value: QueuedDevelopmentScreenshot): Promise<void>;
  delete(id: string): Promise<void>;
}

export class MemoryDevelopmentScreenshotQueueAdapter implements DevelopmentScreenshotQueueAdapter {
  private values = new Map<string, QueuedDevelopmentScreenshot>();
  async list() { return [...this.values.values()].map((value) => ({ ...value, bytes: value.bytes.slice() })); }
  async put(value: QueuedDevelopmentScreenshot) { this.values.set(value.id, { ...value, bytes: value.bytes.slice() }); }
  async delete(id: string) { this.values.delete(id); }
}

export class IndexedDbDevelopmentScreenshotQueueAdapter implements DevelopmentScreenshotQueueAdapter {
  private async database() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("japan-trip-field-notes", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("screenshot-queue")) request.result.createObjectStore("screenshot-queue", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Offline screenshot storage is unavailable."));
    });
  }
  private async transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void) => void) {
    const db = await this.database();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("screenshot-queue", mode);
      const store = transaction.objectStore("screenshot-queue");
      let value: T;
      action(store, (next) => { value = next; }, reject);
      transaction.oncomplete = () => { db.close(); resolve(value!); };
      transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Offline screenshot storage failed.")); };
      transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Offline screenshot storage was cancelled.")); };
    });
  }
  async list() {
    return this.transaction<QueuedDevelopmentScreenshot[]>("readonly", (store, done, fail) => {
      const request = store.getAll();
      request.onsuccess = () => done((request.result as QueuedDevelopmentScreenshot[]).map((value) => ({ ...value, bytes: new Uint8Array(value.bytes) })));
      request.onerror = () => fail(request.error);
    });
  }
  async put(value: QueuedDevelopmentScreenshot) {
    await this.transaction<void>("readwrite", (store, done, fail) => {
      const request = store.put({ ...value, bytes: value.bytes.slice() });
      request.onsuccess = () => done(undefined);
      request.onerror = () => fail(request.error);
    });
  }
  async delete(id: string) {
    await this.transaction<void>("readwrite", (store, done, fail) => {
      const request = store.delete(id);
      request.onsuccess = () => done(undefined);
      request.onerror = () => fail(request.error);
    });
  }
}

export function createDevelopmentScreenshotQueue(adapter: DevelopmentScreenshotQueueAdapter) {
  return {
    list: () => adapter.list(),
    async enqueue(input: Omit<QueuedDevelopmentScreenshot, "id" | "queuedAt">) {
      const queued: QueuedDevelopmentScreenshot = { ...input, bytes: input.bytes.slice(), id: crypto.randomUUID(), queuedAt: new Date().toISOString() };
      await adapter.put(queued);
      return queued;
    },
    complete: (id: string) => adapter.delete(id),
  };
}
