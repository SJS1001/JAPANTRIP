import type {
  OfflineTripAdapter,
  OfflineTripConflict,
  OfflineTripItem,
  OfflineTripMutation,
  OfflineTripSnapshot,
} from "./offline-trip";

function clone<Value>(value: Value): Value {
  return structuredClone(value);
}

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

export class MemoryTripAdapter<Item extends OfflineTripItem = OfflineTripItem>
implements OfflineTripAdapter<Item> {
  private snapshot: OfflineTripSnapshot<Item> | null = null;
  private mutations: OfflineTripMutation<Item>[] = [];
  private conflict: OfflineTripConflict<Item> | null = null;

  async readSnapshot() {
    return this.snapshot ? clone(this.snapshot) : null;
  }

  async writeSnapshot(snapshot: OfflineTripSnapshot<Item>) {
    this.snapshot = clone(snapshot);
  }

  async readMutations() {
    return clone(this.mutations);
  }

  async appendMutation(mutation: OfflineTripMutation<Item>) {
    const existing = this.mutations.find((candidate) => candidate.id === mutation.id);
    if (existing) {
      if (JSON.stringify(comparableMutation(existing)) !== JSON.stringify(comparableMutation(mutation))) {
        throw duplicateMutationError(mutation.id);
      }
      return clone(existing);
    }
    this.mutations.push(clone(mutation));
    return clone(mutation);
  }

  async removeMutation(id: string) {
    this.mutations = this.mutations.filter((mutation) => mutation.id !== id);
  }

  async readConflict() {
    return this.conflict ? clone(this.conflict) : null;
  }

  async writeConflict(conflict: OfflineTripConflict<Item>) {
    this.conflict = clone(conflict);
  }

  async clearAll() {
    this.snapshot = null;
    this.mutations = [];
    this.conflict = null;
  }
}
