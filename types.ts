// Legacy types (keeping for backward compatibility)
export interface Album {
  id: string;
  title: string;
  location: string;
  date: string;
  coverUrl: string;
  photoCount: number;
  rating?: number;
  description?: string;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
}

// New types for v2.0

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  status: UserStatus;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  lastLoginAt?: Date;
  retentionPeriod?: number; // Days, default 30
}

export interface PhotoMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  width: number;
  height: number;
}

export interface Photo {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string;
  location: string;
  caption: string;
  aiSuggestions?: string[];
  date: Date;
  uploadedAt: Date;
  metadata: PhotoMetadata;
  expiresAt: Date;
}

export interface Place {
  name: string;
  address?: string;
  visitTime?: string;
}

export interface Restaurant {
  name: string;
  address?: string;
  cuisine?: string;
}

export interface Route {
  id: string;
  day: number;
  departure: string;
  destination: string;
  visitedPlaces: Place[];
  restaurants: Restaurant[];
  notes?: string;
}

export interface Itinerary {
  id: string;
  userId: string;
  tripName: string;
  startDate: Date;
  endDate: Date;
  routes: Route[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  participantCount?: number;
}

export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'shopping' | 'activity' | 'flight' | 'other';
export type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';

export interface Expense {
  id: string;
  userId: string;
  itineraryId?: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  receiptUrl?: string;
  isOCR: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface ReceiptData {
  merchantName: string;
  date: string;
  items: Array<{ name: string; price: number }>;
  total: number;
  currency: string;
}

export type StoryboardLayout = 'grid' | 'timeline' | 'magazine';

export interface StoryboardContent {
  photoId: string;
  position: number;
  caption?: string;
  location?: string;
}

export interface Storyboard {
  id: string;
  userId: string;
  title: string;
  date: Date;
  photoIds: string[];
  layout: StoryboardLayout;
  content: StoryboardContent[];
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface EmojiSet {
  id: string;
  userId: string;
  sourcePhotoId: string;
  emojis: string[];
  collectionUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AdminSettings {
  id: string;
  adminEmails: string[];
  dataRetentionDays: number;
  maxUploadSize: number;
  allowedImageTypes: string[];
}