export interface Business {
  id: number;
  name: string;
  slug: string;
  previousSlugs?: string[];
  previousNames?: string[];
  description: string;
  shortDescription?: string;
  category?: string;
  categories: string[];
  categorySlugs: string[];
  categoryIds?: number[];
  address: string;
  colonia?: string;
  postalCode?: string;
  phone: string;
  whatsapp: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  image: string;
  gallery?: string[];
  hasDelivery?: boolean;
  deliveryOption?: string;
  delivery?: string;
  hasWhatsapp?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
  paymentMethods?: string[];
  payment?: string;
  openingHours?: string;
  schedule?: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  featured?: boolean;
  verified?: boolean;
  isNew?: boolean;
  isNewSubmission?: boolean;
  isTopBusiness?: boolean;
  isRecommended?: boolean;
  rating?: number;
  reviewCount?: number;
  permalink?: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: string;
  isPending?: boolean;
  isLocallyEdited?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent?: number;
  icon?: string;
  image?: string | null;
  description?: string;
  subcategories?: any[];
}

export interface DirectoryStats {
  totalBusinesses: number;
  totalCategories: number;
  withWhatsapp: number;
  withDelivery: number;
  withPhone: number;
  withAddress?: number;
  featured?: number;
  coloniasCount?: number;
  lastSyncTimestamp?: string | number;
  lastSyncStatus?: string;
  wpSiteUrl?: string;
}

export interface WpHealth {
  connected: boolean;
  url?: string;
  siteUrl?: string;
  status: string;
  latency?: number;
  productCount?: number;
  error?: string;
}

export interface BusinessReport {
  id: string;
  type?: 'classified' | 'business' | string;
  businessId?: number;
  businessName?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  classifiedId?: string;
  classifiedTitle?: string;
  requesterName?: string;
  requesterContact?: string;
  reason: string;
  details?: string;
  comment?: string;
  contactEmail?: string;
  createdAt?: string;
  date?: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface BusinessAnalyticsItem {
  businessId: number;
  businessName: string;
  views: number;
  whatsappClicks: number;
  callClicks: number;
  lastInteraction?: string;
  phoneClicks?: number;
  mapsClicks?: number;
  totalInteractions?: number;
  [key: string]: any;
}

export interface SiteAnalytics {
  pageViews: number;
  whatsappClicks: number;
  callClicks: number;
  uniqueVisitors: number;
  totalUniqueVisitors?: number;
  totalVisits?: number;
  totalBusinessViews?: number;
  totalWhatsappClicks?: number;
  totalPhoneClicks?: number;
  totalMapsClicks?: number;
  activeNow?: number;
  today?: any;
  yesterday?: any;
  last7Days?: any;
  devices?: any;
  operatingSystems?: any;
  browsers?: any;
  peakHours?: any;
  trafficSources?: any[];
  topSearches?: any[];
  recentEvents?: any[];
  cityEstimate?: any;
  retentionRate?: number;
  businesses?: Record<number, { views: number; whatsappClicks: number; callClicks: number }>;
  topBusinesses?: BusinessAnalyticsItem[];
  events?: Array<{
    type: string;
    businessId?: number;
    businessName?: string;
    timestamp: string;
  }>;
  [key: string]: any;
}

export interface BusinessSubmission {
  id?: string;
  name: string;
  description: string;
  category: string;
  categorySlug?: string;
  colonia: string;
  postalCode?: string;
  address: string;
  phone: string;
  whatsapp: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  schedule?: string;
  payment?: string;
  delivery?: string;
  deliveryOption?: string;
  image?: string;
  gallery?: string[];
  contactName?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerEmail?: string;
  submittedAt?: string;
  allowDuplicate?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ClassifiedAd {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  description: string;
  price?: number | null;
  priceType?: 'consult' | 'fixed' | 'negotiable' | string;
  currency?: string;
  phone?: string;
  whatsapp?: string;
  image?: string;
  images?: string[];
  location?: string;
  noLocation?: boolean;
  colonia?: string;
  contactName?: string;
  email?: string;
  contactMethods?: any;
  deliveryCondition?: string;
  videoUrl?: string;
  userToken?: string;
  createdAt: string;
  status: 'active' | 'sold' | 'expired';
  views?: number;
}

export interface Promotion {
  id: string;
  businessId: number;
  businessName: string;
  businessSlug?: string;
  businessWhatsapp?: string;
  businessPhone?: string;
  businessImage?: string;
  ownerEmail?: string;
  promoImage?: string;
  promoImageData?: string;
  title: string;
  description: string;
  discount: string;
  couponCode?: string;
  expiresAt: string;
  validUntil?: string;
  image?: string;
  terms?: string;
  claimedCount?: number;
  maxClaims?: number;
  totalCoupons?: number;
  isActive?: boolean;
}

export interface ClaimedCoupon {
  id: string;
  promotionId: string;
  promotionTitle?: string;
  businessId: number;
  businessName?: string;
  businessWhatsapp?: string;
  businessPhone?: string;
  discount?: string;
  code: string;
  claimedAt: string;
  customerName?: string;
  customerPhone?: string;
  status: 'active' | 'redeemed' | 'cancelled';
}

export interface EventItem {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  date: string;
  time: string;
  location: string;
  cost: string;
  description: string;
  organizer: string;
  badge: string;
  icon: string;
  image?: string;
  sourceUrl?: string;
  aiDetected?: boolean;
  updatedAt?: string;
}

export interface AutoBusinessCandidate {
  id: string;
  name: string;
  category: string;
  categories?: string[];
  categorySlugs?: string[];
  delivery: string;
  hasDelivery?: boolean;
  description: string;
  phone: string;
  whatsapp: string;
  address?: string;
  colonia?: string;
  schedule?: string;
  payment?: string;
  image: string;
  source: string;
  sourceUrl: string;
  alreadyRegistered?: boolean;
  matchedExistingName?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'modified';
}
