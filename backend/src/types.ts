export interface Plan {
  id: number;
  provider: string;
  planName: string;
  planType: "Prepaid" | "Postpaid" | "Data-only";
  priceSAR: number;
  dataGB: string;
  socialMediaData: string;
  localCallMinutes: string;
  internationalCallMinutes: string;
  sms: string;
  roamingDataGB: string;
  contractTerms: string;
  specialFeatures: string;
  url: string;
}

export interface PlanReaction {
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
}

export interface PlanComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  text: string;
  createdAt: number;
}

export type Priority =
  | "unlimited_data"
  | "cheap_price"
  | "international_calls"
  | "social_media"
  | "five_g"
  | "no_contract"
  | "local_calls"
  | "roaming";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  planIds?: number[];
}
