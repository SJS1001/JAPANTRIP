import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  chooseInitialTripView,
  mayQueueOfflineEdit,
  mayReplayLegacyPending,
} from "../lib/client/trip-ui-policy.ts";

test("an explicit calendar or My Day URL wins over saved editor preferences", () => {
  assert.equal(
    chooseInitialTripView({
      role: "editor",
      requestedView: "calendar",
      savedMode: "my-day",
      duringTrip: true,
    }),
    "full",
  );
  assert.equal(
    chooseInitialTripView({
      role: "editor",
      requestedView: "my-day",
      savedMode: "full",
      duringTrip: false,
    }),
    "my-day",
  );
  assert.equal(
    chooseInitialTripView({
      role: "viewer",
      requestedView: "calendar",
      savedMode: "full",
      duringTrip: false,
    }),
    "my-day",
  );
});

test("offline edits require explicit device-storage consent", () => {
  assert.equal(mayQueueOfflineEdit({ online: false, hasConsent: true }), true);
  assert.equal(mayQueueOfflineEdit({ online: false, hasConsent: false }), false);
  assert.equal(mayQueueOfflineEdit({ online: true, hasConsent: true }), false);
});

test("legacy pending edits replay only with consent and an exact base version", () => {
  assert.equal(
    mayReplayLegacyPending({
      pendingBaseVersion: 7,
      serverVersion: 7,
      hasConsent: true,
    }),
    true,
  );
  assert.equal(
    mayReplayLegacyPending({
      pendingBaseVersion: 6,
      serverVersion: 7,
      hasConsent: true,
    }),
    false,
  );
  assert.equal(
    mayReplayLegacyPending({
      pendingBaseVersion: undefined,
      serverVersion: 7,
      hasConsent: true,
    }),
    false,
  );
  assert.equal(
    mayReplayLegacyPending({
      pendingBaseVersion: 7,
      serverVersion: 7,
      hasConsent: false,
    }),
    false,
  );
});

test("the calendar wires consent, version checks, and save-chain recovery into saves", async () => {
  const source = await readFile(
    new URL("../app/components/TripCalendar.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /mayQueueOfflineEdit\(\{/);
  assert.match(source, /hasConsent: hasOfflineConsent\("editor"\)/);
  assert.match(source, /mayReplayLegacyPending\(\{/);
  assert.match(source, /baseVersion[,\s]*\}\),/);
  assert.match(source, /saveChain\.current[\s\S]*?\.catch\(\(\) => undefined\)[\s\S]*?\.then/);
  assert.match(source, /The connection failed[\s\S]*?shared agenda was not changed/);
});
