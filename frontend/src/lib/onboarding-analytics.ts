/**
 * Shared analytics helpers for the onboarding A/B/C/D test.
 *
 * Why this file exists: classic and chat onboarding share the same logical
 * steps (language → absher → status → ...) but were emitting different event
 * names. Mixpanel funnels need matching event names across variants to compare.
 *
 * Single canonical schema:
 *   event:        "onboarding_step_reached" | "onboarding_answered"
 *                 | "onboarding_completed" | "onboarding_abandoned"
 *                 | "onboarding_carrier_opened" | "onboarding_back_clicked"
 *   properties:   { step, step_number, variant, onboarding_kind, seconds_since_start, ... }
 *
 * Every event automatically carries the variant via Mixpanel super-properties
 * (see analytics.ts → registerSuperProperty in App.tsx).
 */
import { trackEvent } from './analytics';

export type OnboardingStep =
  | 'language'
  | 'intro_carriers'
  | 'intro_match'
  | 'absher'
  | 'status'
  | 'moving'
  | 'visiting_plans'
  | 'completed';

// Canonical ordering for funnel analysis — match the step to its position.
const STEP_ORDER: Record<OnboardingStep, number> = {
  language: 1,
  intro_carriers: 2,
  intro_match: 3,
  absher: 4,
  status: 5,
  moving: 6,
  visiting_plans: 6, // siblings — same funnel depth
  completed: 7,
};

export type OnboardingKind = 'classic' | 'chat';

/** Tracks a step entry. Call when the user first sees a new step/page. */
export function trackStepReached(step: OnboardingStep, kind: OnboardingKind, startedAt: number): void {
  trackEvent('onboarding_step_reached', {
    step,
    step_number: STEP_ORDER[step],
    onboarding_kind: kind,
    seconds_since_start: secondsSince(startedAt),
  });
}

/** Tracks an answer to a question within a step. */
export function trackAnswer(
  step: OnboardingStep,
  question: string,
  answer: string | number | boolean,
  kind: OnboardingKind,
  startedAt: number,
): void {
  trackEvent('onboarding_answered', {
    step,
    step_number: STEP_ORDER[step],
    question,
    answer,
    onboarding_kind: kind,
    seconds_since_start: secondsSince(startedAt),
  });
}

/** Tracks a user clicking a back button (useful to spot confusion). */
export function trackBack(fromStep: OnboardingStep, toStep: OnboardingStep, kind: OnboardingKind, startedAt: number): void {
  trackEvent('onboarding_back_clicked', {
    from_step: fromStep,
    to_step: toStep,
    onboarding_kind: kind,
    seconds_since_start: secondsSince(startedAt),
  });
}

/** Tracks a click into an external carrier site. */
export function trackCarrierOpened(
  carrier: string,
  kind: OnboardingKind,
  startedAt: number,
  extra: Record<string, unknown> = {},
): void {
  trackEvent('onboarding_carrier_opened', {
    carrier,
    onboarding_kind: kind,
    seconds_since_start: secondsSince(startedAt),
    ...extra,
  });
}

/** Tracks completion, with the exit route. */
export function trackCompleted(
  exit: '/' | '/advisor',
  answers: Record<string, unknown>,
  kind: OnboardingKind,
  startedAt: number,
): void {
  trackEvent('onboarding_completed', {
    exit,
    onboarding_kind: kind,
    total_seconds: secondsSince(startedAt),
    ...answers,
  });
}

/** Tracks an unfinished exit (user closed tab / navigated away). */
export function trackAbandoned(lastStep: OnboardingStep, kind: OnboardingKind, startedAt: number): void {
  trackEvent(
    'onboarding_abandoned',
    {
      last_step: lastStep,
      last_step_number: STEP_ORDER[lastStep],
      onboarding_kind: kind,
      seconds_before_abandon: secondsSince(startedAt),
    },
    { useBeacon: true },
  );
}

function secondsSince(startedAt: number): number {
  return Math.round((Date.now() - startedAt) / 100) / 10; // 0.1s precision
}
