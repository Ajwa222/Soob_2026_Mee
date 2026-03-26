export interface Plan {
  id: number;
  provider: string;
  planName: string;
  planType: 'Prepaid' | 'Postpaid' | 'Data-only';
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

export interface SimbaUser {
  name: string;
  email: string;
  photoURL: string | null;
  uid: string;
  provider: 'google';
  phone: string | null;
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
  createdAt: number; // milliseconds timestamp
}

// ── Persona System ──

export type PersonaSegment =
  | 'gamer'
  | 'student'
  | 'family'
  | 'business'
  | 'expat'
  | 'budget'
  | 'streamer'
  | 'power_user';

// export interface PersonaQuizAnswers {
//   usage: 'gaming' | 'streaming' | 'social' | 'work' | 'calls' | 'basic';
//   budget: 'low' | 'mid' | 'high' | 'unlimited';
//   priority: 'data' | 'calls' | 'international' | 'price' | 'speed';
//   household: 'solo' | 'family' | 'shared';
//   location: 'local' | 'expat' | 'traveler';
// }

export interface PersonaSignals {
  categoriesViewed: Record<string, number>;
  priceRangeClicks: { low: number; mid: number; high: number };
  filtersUsed: Record<string, number>;
  planTypesViewed: Record<string, number>;
  totalPlanViews: number;
  compareCount: number;
}

export interface PersonaProfile {
  segment: PersonaSegment;
  confidence: number;
  // quizAnswers?: PersonaQuizAnswers;
  signals: PersonaSignals;
  updatedAt: number;
  createdAt: number;
}

export interface SegmentStats {
  segment: PersonaSegment;
  totalUsers: number;
  topPlanIds: number[];
  planLikeRates: Record<number, number>;
  updatedAt: number;
}

export interface SegmentWeights {
  data: number;
  calls: number;
  international: number;
  social: number;
  price: number;
  fiveG: number;
  roaming: number;
  unlimited: number;
}
