import type { RatingTargetKind } from "../family-ratings";

export type QueuedFamilyRating = {
  id: string;
  targetId: string;
  targetKind: RatingTargetKind;
  memberName: string;
  stars: number;
  comment?: string;
  queuedAt: string;
};

export interface OfflineRatingQueueAdapter {
  load(): Promise<QueuedFamilyRating[]>;
  save(values: QueuedFamilyRating[]): Promise<void>;
}

export class MemoryOfflineRatingQueueAdapter implements OfflineRatingQueueAdapter {
  private values: QueuedFamilyRating[] = [];
  async load() { return this.values.map((value) => ({ ...value })); }
  async save(values: QueuedFamilyRating[]) { this.values = values.map((value) => ({ ...value })); }
}

export class LocalStorageOfflineRatingQueueAdapter implements OfflineRatingQueueAdapter {
  private key = "japanTripPendingFamilyRatingsV1";
  async load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.key) ?? "[]");
      return Array.isArray(parsed) ? parsed as QueuedFamilyRating[] : [];
    } catch { return []; }
  }
  async save(values: QueuedFamilyRating[]) {
    if (values.length) localStorage.setItem(this.key, JSON.stringify(values));
    else localStorage.removeItem(this.key);
  }
}

export function createOfflineRatingQueue(adapter: OfflineRatingQueueAdapter) {
  return {
    list: () => adapter.load(),
    async enqueue(input: Omit<QueuedFamilyRating, "id" | "queuedAt">) {
      const values = await adapter.load();
      const key = `${input.targetId}|${input.memberName.trim().toLocaleLowerCase("en-US")}`;
      const next = values.filter((value) => `${value.targetId}|${value.memberName.trim().toLocaleLowerCase("en-US")}` !== key);
      const queued: QueuedFamilyRating = { ...input, memberName: input.memberName.trim(), id: crypto.randomUUID(), queuedAt: new Date().toISOString() };
      next.push(queued);
      await adapter.save(next);
      return queued;
    },
    async complete(id: string) { await adapter.save((await adapter.load()).filter((value) => value.id !== id)); },
  };
}
