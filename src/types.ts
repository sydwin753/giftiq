export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

export interface Person {
  id: string;
  name: string;
  relationship: string;
  birthday?: string;
  notes?: string;
  budget?: number;
  interests?: string[];
  dislikes?: string[];
  sizes?: Record<string, string>;
  favoriteBrands?: string[];
  bio?: string;
  ownerId: string;
}

export interface Occasion {
  id: string;
  personId: string;
  title: string;
  date: string;
  type: 'birthday' | 'anniversary' | 'holiday' | 'other';
  ownerId: string;
}

export interface Gift {
  id: string;
  personId: string;
  itemName: string;
  date: string;
  cost?: number;
  source?: string;
  store?: string;
  occasion?: string;
  isSurprise?: boolean;
  wrappingStatus?: 'needs_wrapping' | 'wrapped' | 'shipped' | 'ready';
  isRegift?: boolean;
  fromPersonId?: string;
  ownerId: string;
}

export interface Idea {
  id: string;
  personId: string;
  itemName: string;
  image?: string;
  description?: string;
  price?: number;
  buyLink?: string;
  store?: string;
  occasion?: string;
  status: 'pending' | 'purchased' | 'dismissed';
  ownerId: string;
}

export interface CardNote {
  id: string;
  personId: string;
  giftId?: string;
  content: string;
  occasion?: string;
  ownerId: string;
  createdAt?: unknown;
}
