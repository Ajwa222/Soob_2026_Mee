/**
 * Shared TypeScript interfaces used across the backend.
 * These define the shape of data for plans, user interactions, AI chat, and the persona system.
 */

// ── Plan Data ──

/** A single telecom plan from one of the 8 Saudi carriers. Stored in-memory (not Firestore). */
export interface Plan {
  id: number;                           // Unique plan ID (1-154)
  provider: string;                     // Carrier name (STC, Mobily, Zain, etc.)
  planName: string;                     // Display name of the plan
  planType: "Prepaid" | "Postpaid" | "Data-only";
  priceSAR: number;                     // Monthly price in SAR (includes 15% VAT)
  dataGB: string;                       // Data allowance — number or "Unlimited"
  socialMediaData: string;              // Dedicated social media data — number or "Unlimited"
  localCallMinutes: string;             // Local call minutes — number or "Unlimited"
  internationalCallMinutes: string;     // International call minutes
  sms: string;                          // SMS allowance
  roamingDataGB: string;                // Roaming data allowance
  contractTerms: string;                // Contract duration / terms
  specialFeatures: string;              // Extra features (e.g., "5G", "Free roaming")
  url: string;                          // Link to the carrier's plan page
}

// ── User Interactions (Firestore) ──

/** Like/dislike counts and user lists for a single plan. Stored in "planReactions" collection. */
export interface PlanReaction {
  likes: number; // Same as likedBy.length
  dislikes: number;
  likedBy: string[];                    // Array of Firebase UIDs who liked this plan
  dislikedBy: string[];                 // Array of Firebase UIDs who disliked this plan
}

/** A single user comment on a plan. Stored in "planComments/{planId}/comments" subcollection. */
export interface PlanComment {
  id: string;                           // Firestore document ID (comment ID)
  userId: string;                       // Firebase UID of the commenter
  userName: string;
  userPhoto: string | null;
  text: string;                         // Comment body (max 500 chars, enforced by controller)
  createdAt: number;                    // Unix timestamp (ms)
}

// ── AI Advisor Chat ──

/** A single message in the advisor conversation history. Sent from the frontend for context. */
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  planIds?: number[];                   // Plan IDs referenced in an assistant reply (extracted from [#ID] tags)
}

// ── Persona System ──
// The persona system classifies users into segments to personalize plan recommendations.
// Segment is determined by a quiz and/or behavioral signals from the frontend.

/** The 8 user segments — each has different plan-scoring weights and AI advisor tone. */
export type PersonaSegment =
  | "gamer"
  | "student"
  | "family"
  | "business"
  | "expat"
  | "budget"
  | "streamer"
  | "power_user";

// /** Answers from the persona quiz on the frontend. Used to determine initial segment. */
// export interface PersonaQuizAnswers {
//   usage: "gaming" | "streaming" | "social" | "work" | "calls" | "basic";
//   budget: "low" | "mid" | "high" | "unlimited";
//   priority: "data" | "calls" | "international" | "price" | "speed";
//   household: "solo" | "family" | "shared";
//   location: "local" | "expat" | "traveler";
// }

/** Behavioral signals collected from the frontend (browsing patterns, filter usage, etc.). */
export interface PersonaSignals {
  categoriesViewed: Record<string, number>;   // e.g., { "Prepaid": 5, "Postpaid": 3 }
  priceRangeClicks: { low: number; mid: number; high: number };
  filtersUsed: Record<string, number>;        // e.g., { "5G": 2, "Unlimited": 4 }
  planTypesViewed: Record<string, number>;
  totalPlanViews: number;
  compareCount: number;                       // How many times user used the compare feature
}

/** A user's complete persona profile. Stored in "users/{uid}.persona" in Firestore. */
export interface PersonaProfile {
  segment: PersonaSegment;
  confidence: number;                   // 0-1, how confident we are about the segment classification
  // quizAnswers?: PersonaQuizAnswers;     // Present if user completed the quiz
  signals: PersonaSignals;              // Accumulated behavioral data
  updatedAt: number;                    // Unix timestamp (ms)
  createdAt: number;
}

/** Aggregated stats for a segment — which plans are popular among users in this segment. */
export interface SegmentStats {
  segment: PersonaSegment;
  totalUsers: number;                   // Number of users in this segment
  topPlanIds: number[];                 // Top 10 most-liked plan IDs
  planLikeRates: Record<number, number>; // planId → like percentage (0-100)
  updatedAt: number;
}

/** Weights used by the scoring algorithm to rank plans for a given segment. */
export interface SegmentWeights {
  data: number;           // How much the segment values data
  calls: number;          // How much the segment values local calls
  international: number;  // How much the segment values international calls
  social: number;         // How much the segment values social media data
  price: number;          // How much the segment values low price (inverse scoring)
  fiveG: number;          // Bonus weight for 5G plans
  roaming: number;        // Bonus weight for roaming features
  unlimited: number;      // Bonus weight for unlimited data/calls
}
