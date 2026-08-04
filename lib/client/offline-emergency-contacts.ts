export type OfflineEmergencyContact = {
  id: string;
  name: string;
  relationship?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type OfflineEmergencyContactsSnapshot = {
  schemaVersion: 1;
  savedAt: string;
  contacts: OfflineEmergencyContact[];
};

export interface EmergencyContactsOfflineAdapter {
  read(): Promise<OfflineEmergencyContactsSnapshot | null>;
  write(snapshot: OfflineEmergencyContactsSnapshot): Promise<void>;
  clear(): Promise<void>;
}

function copy<Value>(value: Value): Value {
  return structuredClone(value);
}

export class MemoryEmergencyContactsOfflineAdapter
implements EmergencyContactsOfflineAdapter {
  private snapshot: OfflineEmergencyContactsSnapshot | null = null;

  async read() {
    return this.snapshot ? copy(this.snapshot) : null;
  }

  async write(snapshot: OfflineEmergencyContactsSnapshot) {
    this.snapshot = copy(snapshot);
  }

  async clear() {
    this.snapshot = null;
  }
}

export function createOfflineEmergencyContacts(
  adapter: EmergencyContactsOfflineAdapter,
  options: { now?: () => Date } = {},
) {
  const now = options.now ?? (() => new Date());
  return {
    async load() {
      return adapter.read();
    },
    async save(
      contacts: readonly OfflineEmergencyContact[],
      confirmation: string,
    ) {
      if (confirmation !== "KEEP_CONTACTS_ON_DEVICE") {
        throw new Error("Saving contacts requires KEEP_CONTACTS_ON_DEVICE confirmation.");
      }
      const snapshot: OfflineEmergencyContactsSnapshot = {
        schemaVersion: 1,
        savedAt: now().toISOString(),
        contacts: copy([...contacts]),
      };
      await adapter.write(snapshot);
      return copy(snapshot);
    },
    async clear(confirmation: string) {
      if (confirmation !== "REMOVE_CONTACTS_FROM_DEVICE") {
        throw new Error("Removing contacts requires REMOVE_CONTACTS_FROM_DEVICE confirmation.");
      }
      await adapter.clear();
    },
  };
}
