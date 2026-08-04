export const metadata = {
  title: "Offline · Japan Trip",
};

export default function OfflinePage() {
  return (
    <main className="access-screen">
      <section className="access-box" aria-labelledby="offline-title">
        <div className="enso" aria-hidden="true">旅</div>
        <p className="kicker">Japan Trip · Offline</p>
        <h1 id="offline-title">You’re offline</h1>
        <p>The saved trip will open here after this device has completed <strong>Make trip available offline</strong>.</p>
        <p>Emergency numbers remain available from the saved emergency page.</p>
        <p><a href="/">Try the trip again</a> · <a href="/emergency">Emergency help</a></p>
      </section>
    </main>
  );
}
