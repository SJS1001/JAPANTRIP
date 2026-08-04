import type { AttachmentSummary } from "@/lib/attachments";

export type OfflineAttachment = AttachmentSummary & {
  blob: Blob;
  savedAt: string;
};

const DATABASE = "japan-trip-private-files-v1";
const STORE = "attachments";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline file storage could not be opened."));
  });
}

async function storeRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error("Offline file storage failed."));
      transaction.oncomplete = () => resolve(result!);
      transaction.onerror = () => reject(transaction.error ?? new Error("Offline file storage failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline file storage was interrupted."));
    });
  } finally {
    database.close();
  }
}

export function saveOfflineAttachment(attachment: AttachmentSummary, blob: Blob) {
  const record: OfflineAttachment = {
    ...attachment,
    blob,
    savedAt: new Date().toISOString(),
  };
  return storeRequest("readwrite", (store) => store.put(record));
}

export function getOfflineAttachment(id: string) {
  return storeRequest<OfflineAttachment | undefined>("readonly", (store) => store.get(id));
}

export async function listOfflineAttachments(tripItemId?: string) {
  const records = await storeRequest<OfflineAttachment[]>("readonly", (store) => store.getAll());
  return records.filter((record) => !tripItemId || record.tripItemId === tripItemId);
}

export function removeOfflineAttachment(id: string) {
  return storeRequest("readwrite", (store) => store.delete(id));
}

export function clearOfflineAttachments() {
  return storeRequest("readwrite", (store) => store.clear());
}

export async function reconcileViewerOfflineAttachments(
  authorized: AttachmentSummary[],
) {
  const saved = await listOfflineAttachments();
  const authorizedById = new Map(authorized.map((item) => [item.id, item]));
  await Promise.all(
    saved.map(async (item) => {
      const latest = authorizedById.get(item.id);
      if (!latest && item.viewerApproved) {
        await removeOfflineAttachment(item.id);
      } else if (latest && latest.viewerApproved !== item.viewerApproved) {
        await saveOfflineAttachment(latest, item.blob);
      }
    }),
  );
}
