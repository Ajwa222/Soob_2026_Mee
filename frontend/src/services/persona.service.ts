import { apiFetch } from "./apiClient";
import type { PersonaProfile, PersonaSignals } from "../types";

export const getPersona = async (): Promise<{ persona: PersonaProfile | null }> => {
  return apiFetch<{ persona: PersonaProfile | null }>("/api/persona");
};

export const updatePersona = async (persona: PersonaProfile): Promise<void> => {
  await apiFetch("/api/persona", {
    method: "PUT",
    body: JSON.stringify({ persona }),
  });
};

export const deletePersona = async (): Promise<void> => {
  await apiFetch("/api/persona", { method: "DELETE" });
};

export const flushSignals = async (signals: Partial<PersonaSignals>): Promise<void> => {
  await apiFetch("/api/persona/signals", {
    method: "POST",
    body: JSON.stringify({ signals }),
  });
};
