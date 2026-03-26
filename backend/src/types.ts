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

