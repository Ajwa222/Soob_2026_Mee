/**
 * Shared TypeScript interfaces used across the frontend.
 *
 * These types mirror the backend data shapes:
 *  - Plan          — a Saudi telecom plan (from the static in-memory catalog)
 *  - SOOBUser     — the currently authenticated user (Google Sign-In)
 *  - PlanReaction  — aggregated like/dislike counts for a plan
 *  - PlanComment   — a single user comment on a plan
 */

/** A single telecom plan from one of the 8 Saudi carriers. */
export interface Plan {
  id: number;                      // Unique numeric plan ID
  provider: string;                // Carrier name (e.g. "STC", "Mobily", "Zain")
  planName: string;                // Display name of the plan
  planType: 'Prepaid' | 'Postpaid' | 'Data-only';
  priceSAR: number;                // Monthly price in Saudi Riyals
  dataGB: string;                  // Data allowance (e.g. "50 GB", "Unlimited")
  socialMediaData: string;         // Separate social-media data quota, if any
  localCallMinutes: string;        // Local call minutes included
  internationalCallMinutes: string; // International call minutes included
  sms: string;                     // SMS allowance
  roamingDataGB: string;           // Roaming data included, if any
  contractTerms: string;           // Billing cycle / contract length (e.g. "1 month", "1 year")
  specialFeatures: string;         // Carrier-specific extras (e.g. "Free Netflix", "5G")
  url: string;                     // Link to the plan on the carrier's website
}

/** Authenticated user profile — populated after Google or OTP sign-in. */
export interface SOOBUser {
  name: string;
  email: string;
  photoURL: string | null;         // Google profile photo URL (null for OTP users)
  uid: string;                     // Firebase UID (or otp-{phone|email} for OTP users)
  provider: 'google' | 'otp';      // Auth provider
  phone: string | null;             // Optional phone number
}

/** Aggregated reaction counts for a plan, plus arrays of user IDs who reacted. */
export interface PlanReaction {
  likes: number;
  dislikes: number;
  likedBy: string[];               // Firebase UIDs of users who liked
  dislikedBy: string[];            // Firebase UIDs of users who disliked
}

/** A single user comment on a plan detail page. */
export interface PlanComment {
  id: string;                      // Firestore document ID
  userId: string;                  // Firebase UID of the comment author
  userName: string;                // Display name of the author
  userPhoto: string | null;        // Author's profile photo URL
  text: string;                    // Comment body (max 500 chars, enforced server-side)
  createdAt: number;               // Milliseconds timestamp (Date.now())
}

