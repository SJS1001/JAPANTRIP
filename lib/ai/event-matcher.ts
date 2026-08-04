import {
  InboxValidationError,
  type InboxCandidateEvent,
} from "./inbox-schemas";

export function projectCandidateEvents(
  candidates: readonly InboxCandidateEvent[],
): InboxCandidateEvent[] {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    for (const required of ["id", "date", "title", "category"] as const) {
      if (typeof candidate[required] !== "string" || !candidate[required].trim()) {
        throw new InboxValidationError(`Candidate event ${required} is required.`);
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)) {
      throw new InboxValidationError("Candidate event dates must use YYYY-MM-DD.");
    }
    for (const optional of ["time", "location", "notes"] as const) {
      if (candidate[optional] !== undefined && typeof candidate[optional] !== "string") {
        throw new InboxValidationError(`Candidate event ${optional} must be text.`);
      }
    }
    if (ids.has(candidate.id)) {
      throw new InboxValidationError("Candidate event IDs must be unique.");
    }
    ids.add(candidate.id);
  }
  return candidates.map(({ id, date, title, category, time, location, notes }) => ({
    id,
    date,
    title,
    category,
    ...(time !== undefined ? { time } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }));
}

export function validateCandidateReferences(
  referencedIds: unknown,
  candidates: readonly InboxCandidateEvent[],
): string[] {
  if (!Array.isArray(referencedIds) || referencedIds.some((id) => typeof id !== "string")) {
    throw new InboxValidationError("candidateEventIds must be an array of event IDs.");
  }

  const allowed = new Set(candidates.map(({ id }) => id));
  const unique = [...new Set(referencedIds)];
  if (unique.some((id) => !allowed.has(id))) {
    throw new InboxValidationError("The analysis referenced an event outside the candidate set.");
  }
  return unique;
}

export function requireCandidate(
  eventId: unknown,
  candidates: readonly InboxCandidateEvent[],
): string {
  if (typeof eventId !== "string" || !candidates.some(({ id }) => id === eventId)) {
    throw new InboxValidationError("The proposed target is not an allowed candidate event.");
  }
  return eventId;
}
