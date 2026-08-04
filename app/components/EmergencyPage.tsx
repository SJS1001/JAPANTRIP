import type {
  EmergencyCall,
  EmergencyLiveLink,
  FamilyEmergencyContext,
} from "@/lib/emergency";

type EmergencyPageProps = {
  calls: readonly EmergencyCall[];
  liveLinks: readonly EmergencyLiveLink[];
  family?: FamilyEmergencyContext | null;
};

export default function EmergencyPage({ calls, liveLinks, family }: EmergencyPageProps) {
  return (
    <main className="emergency-page">
      <header className="emergency-hero">
        <a href="/" className="emergency-back">← Trip</a>
        <div>
          <p className="kicker">Emergency help · Japan</p>
          <h1>Get help now</h1>
          <p>Call the service you need. The three-digit numbers work while you are in Japan.</p>
        </div>
      </header>

      <section aria-labelledby="emergency-call-title">
        <h2 id="emergency-call-title">Emergency calls</h2>
        <div className="emergency-call-grid">
          {calls.map((entry) => (
            <article className={`emergency-call emergency-call-${entry.id}`} key={entry.id}>
              <div>
                <h3>{entry.label}</h3>
                <p>{entry.purpose}</p>
              </div>
              <a href={entry.href} aria-label={`Call ${entry.label} at ${entry.number}`}>
                <span>Call</span>
                <strong>{entry.number}</strong>
              </a>
              <small>{entry.availability} {entry.languageNote}</small>
            </article>
          ))}
        </div>
        <div className="emergency-note">
          <strong>Phone reminder</strong>
          <p>A data-only eSIM may not make voice calls. Japanese public phones can call 110, 119, and 118 without coins. Never test an emergency number.</p>
        </div>
      </section>

      {family && (
        <section className="emergency-family" aria-labelledby="family-help-title">
          <h2 id="family-help-title">Our family information</h2>
          {family.hotel && (
            <article>
              <p className="kicker">Current planned hotel</p>
              <h3>{family.hotel.name}</h3>
              <p>{family.hotel.address}</p>
              {family.hotel.nearestStation && <p>Nearest station: {family.hotel.nearestStation}</p>}
              {family.hotel.phone && <a href={`tel:${family.hotel.phone.replace(/[^+\d]/g, "")}`}>Call hotel · {family.hotel.phone}</a>}
            </article>
          )}
          {family.instructions && <p className="emergency-instructions">{family.instructions}</p>}
          <div className="emergency-contacts">
            {family.contacts.map((contact) => (
              <article key={contact.id}>
                <h3>{contact.name}</h3>
                <p>{contact.relationship}</p>
                <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>Call {contact.phone}</a>
              </article>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="live-help-title">
        <h2 id="live-help-title">Live official information</h2>
        <p className="emergency-online-warning">Internet required · these sites show current information and are not available from the saved offline page.</p>
        <div className="emergency-live-links">
          {liveLinks.map((entry) => (
            <a href={entry.href} target="_blank" rel="noreferrer" key={entry.id}>
              <strong>{entry.label}</strong>
              <span>{entry.publisher} · {entry.purpose}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="emergency-verified">Official resources last verified 2026-08-04. Live conditions can change.</footer>
    </main>
  );
}
