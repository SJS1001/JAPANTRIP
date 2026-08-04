"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type AccessRole = "viewer" | "editor";

type EmergencyContact = {
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

type ContactDraft = {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone: string;
  email: string;
  notes: string;
};

type LoadState = "loading" | "ready" | "locked" | "offline" | "error";

const EMPTY_DRAFT: ContactDraft = {
  name: "",
  relationship: "",
  phone: "",
  alternatePhone: "",
  email: "",
  notes: "",
};

function contactDraft(contact: EmergencyContact): ContactDraft {
  return {
    name: contact.name,
    relationship: contact.relationship ?? "",
    phone: contact.phone,
    alternatePhone: contact.alternatePhone ?? "",
    email: contact.email ?? "",
    notes: contact.notes ?? "",
  };
}

function callHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

async function responsePayload(response: Response) {
  try {
    return (await response.json()) as {
      contact?: EmergencyContact;
      contacts?: EmergencyContact[];
      role?: AccessRole;
      error?: string;
    };
  } catch {
    return {};
  }
}

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [role, setRole] = useState<AccessRole | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT);

  const loadContacts = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOnline(false);
      setLoadState((current) => (current === "ready" ? current : "offline"));
      return;
    }
    setLoadState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/emergency-contacts", {
        cache: "no-store",
      });
      const payload = await responsePayload(response);
      if (response.status === 401) {
        setContacts([]);
        setRole(null);
        setLoadState("locked");
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error || "Personal contacts could not be loaded.");
      }
      setContacts(payload.contacts ?? []);
      setRole(payload.role === "editor" ? "editor" : "viewer");
      setLoadState("ready");
    } catch (error) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setLoadState("offline");
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "Personal contacts could not be loaded.",
        );
        setLoadState("error");
      }
    }
  }, []);

  useEffect(() => {
    const wentOnline = () => {
      setOnline(true);
      void loadContacts();
    };
    const wentOffline = () => setOnline(false);
    const initialLoad = window.setTimeout(() => void loadContacts(), 0);
    window.addEventListener("online", wentOnline);
    window.addEventListener("offline", wentOffline);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", wentOnline);
      window.removeEventListener("offline", wentOffline);
    };
  }, [loadContacts]);

  function startAdd() {
    setEditingId("new");
    setDeletingId(null);
    setDraft(EMPTY_DRAFT);
    setMessage("");
  }

  function startEdit(contact: EmergencyContact) {
    setEditingId(contact.id);
    setDeletingId(null);
    setDraft(contactDraft(contact));
    setMessage("");
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "editor" || !editingId || busy || !online) return;
    setBusy(true);
    setMessage("");
    try {
      const creating = editingId === "new";
      const response = await fetch(
        creating
          ? "/api/emergency-contacts"
          : `/api/emergency-contacts/${encodeURIComponent(editingId)}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const payload = await responsePayload(response);
      if (!response.ok || !payload.contact) {
        throw new Error(payload.error || "The contact could not be saved.");
      }
      setContacts((current) =>
        creating
          ? [...current, payload.contact!]
          : current.map((contact) =>
              contact.id === payload.contact!.id ? payload.contact! : contact,
            ),
      );
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The contact could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function moveContact(index: number, direction: -1 | 1) {
    if (role !== "editor" || busy || !online) return;
    const target = index + direction;
    if (target < 0 || target >= contacts.length) return;
    const reordered = [...contacts];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const normalizedOrder = reordered.map((contact, sortOrder) => ({
      ...contact,
      sortOrder,
    }));
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/emergency-contacts", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderedIds: normalizedOrder.map((contact) => contact.id),
        }),
      });
      const payload = await responsePayload(response);
      if (!response.ok) {
        throw new Error(payload.error || "The contact order could not be saved.");
      }
      setContacts(normalizedOrder);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The contact order could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteContact(id: string) {
    if (role !== "editor" || busy || !online) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/emergency-contacts/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const payload = await responsePayload(response);
      if (!response.ok) {
        throw new Error(payload.error || "The contact could not be removed.");
      }
      setContacts((current) => current.filter((contact) => contact.id !== id));
      setDeletingId(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The contact could not be removed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="personal-contacts-panel" aria-labelledby="personal-contacts-title">
      <header className="personal-contacts-heading">
        <div>
          <p className="kicker">Private family information</p>
          <h2 id="personal-contacts-title">Personal emergency contacts</h2>
          <p>
            Visible only after unlocking the family trip. These contacts are separate
            from the public emergency numbers above.
          </p>
        </div>
        {loadState === "ready" && (
          <span className="personal-contacts-role">
            {role === "editor" ? "Editor access" : "Read-only family access"}
          </span>
        )}
      </header>

      <div className="personal-contacts-privacy" role="note">
        <strong>Contact details only</strong>
        <span>
          Do not enter passport numbers, medical information, insurance numbers, or
          other sensitive records here.
        </span>
      </div>

      {!online && loadState === "ready" && (
        <p className="personal-contacts-notice" role="status">
          Offline · showing contacts already loaded on this screen. Editing is paused
          until the connection returns.
        </p>
      )}

      {loadState === "loading" && (
        <p className="personal-contacts-state" role="status">
          Loading private contacts…
        </p>
      )}

      {loadState === "locked" && (
        <div className="personal-contacts-state">
          <strong>Private contacts are locked</strong>
          <p>Unlock the family trip to see them. Public emergency numbers remain available on this page.</p>
          <Link href="/" className="personal-contacts-button">Unlock private trip</Link>
        </div>
      )}

      {loadState === "offline" && (
        <div className="personal-contacts-state">
          <strong>Private contacts are not saved on this screen yet</strong>
          <p>Reconnect to load them securely. The official call numbers above still work without app data.</p>
          <button type="button" onClick={() => void loadContacts()} disabled={!online}>
            Try again
          </button>
        </div>
      )}

      {loadState === "error" && (
        <div className="personal-contacts-state personal-contacts-error" role="alert">
          <strong>Contacts are temporarily unavailable</strong>
          <p>{message}</p>
          <button type="button" onClick={() => void loadContacts()}>Try again</button>
        </div>
      )}

      {loadState === "ready" && (
        <>
          <div className="personal-contacts-toolbar">
            <p>
              {contacts.length
                ? `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`
                : "No personal contacts added yet."}
            </p>
            {role === "editor" && !editingId && (
              <button type="button" onClick={startAdd} disabled={busy || !online}>
                Add contact
              </button>
            )}
          </div>

          {message && <p className="personal-contacts-form-error" role="alert">{message}</p>}

          {!contacts.length && !editingId && (
            <div className="personal-contacts-empty">
              <strong>No personal contacts yet</strong>
              <p>
                {role === "editor"
                  ? "Add a trusted person the family can call during an emergency."
                  : "A trip editor can add trusted family contacts here."}
              </p>
            </div>
          )}

          {!!contacts.length && (
            <div className="personal-contacts-list">
              {contacts.map((contact, index) => (
                <article key={contact.id}>
                  <div className="personal-contact-main">
                    <h3>{contact.name}</h3>
                    {contact.relationship && <p>{contact.relationship}</p>}
                    <a href={callHref(contact.phone)}>Call {contact.phone}</a>
                    {contact.alternatePhone && (
                      <a href={callHref(contact.alternatePhone)}>
                        Alternate · {contact.alternatePhone}
                      </a>
                    )}
                    {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                    {contact.notes && <p className="personal-contact-notes">{contact.notes}</p>}
                  </div>

                  {role === "editor" && (
                    <div className="personal-contact-actions" aria-label={`Manage ${contact.name}`}>
                      <div>
                        <button
                          type="button"
                          onClick={() => void moveContact(index, -1)}
                          disabled={busy || !online || index === 0}
                          aria-label={`Move ${contact.name} earlier`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveContact(index, 1)}
                          disabled={busy || !online || index === contacts.length - 1}
                          aria-label={`Move ${contact.name} later`}
                        >
                          ↓
                        </button>
                      </div>
                      <button type="button" onClick={() => startEdit(contact)} disabled={busy || !online}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setDeletingId(contact.id)}
                        disabled={busy || !online}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {deletingId === contact.id && role === "editor" && (
                    <div className="personal-contact-confirm" role="alert">
                      <p>Remove {contact.name} from the family emergency contacts?</p>
                      <div>
                        <button type="button" onClick={() => setDeletingId(null)} disabled={busy}>
                          Keep
                        </button>
                        <button type="button" className="danger" onClick={() => void deleteContact(contact.id)} disabled={busy || !online}>
                          {busy ? "Removing…" : "Remove contact"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {editingId && role === "editor" && (
            <form className="personal-contact-form" onSubmit={saveContact}>
              <header>
                <h3>{editingId === "new" ? "Add an emergency contact" : "Edit emergency contact"}</h3>
                <p>Only name and primary phone are required.</p>
              </header>
              <label>
                Name
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label>
                Relationship
                <input
                  maxLength={80}
                  placeholder="Parent, grandparent, family friend…"
                  value={draft.relationship}
                  onChange={(event) => setDraft({ ...draft, relationship: event.target.value })}
                />
              </label>
              <label>
                Primary phone
                <input
                  required
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  placeholder="Include country code when possible"
                  value={draft.phone}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                />
              </label>
              <label>
                Alternate phone
                <input
                  type="tel"
                  maxLength={40}
                  value={draft.alternatePhone}
                  onChange={(event) => setDraft({ ...draft, alternatePhone: event.target.value })}
                />
              </label>
              <label className="wide">
                Email
                <input
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </label>
              <label className="wide">
                Contact notes
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="When to call or their preferred messaging app. No medical or passport details."
                  value={draft.notes}
                  onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                />
              </label>
              <footer>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(EMPTY_DRAFT);
                    setMessage("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={busy || !online}>
                  {busy ? "Saving…" : "Save contact"}
                </button>
              </footer>
            </form>
          )}
        </>
      )}
    </section>
  );
}
