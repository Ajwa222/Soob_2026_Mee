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

