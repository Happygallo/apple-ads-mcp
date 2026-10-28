export interface Money {
  amount: string;
  currency: string;
}

export interface Campaign {
  id: number;
  orgId: number;
  name: string;
  budgetAmount: Money | null;
  dailyBudgetAmount: Money | null;
  adamId: number;
  countriesOrRegions: string[] | null;
  status: "ENABLED" | "PAUSED";
  servingStatus: "RUNNING" | "NOT_RUNNING";
  displayStatus: "RUNNING" | "ON_HOLD" | "PAUSED" | "DELETED";
  supplySources: string[] | null;
  adChannelType: string;
  billingEvent: string;
  paymentModel?: "LOC" | "PAYG";
  deleted: boolean;
  startTime: string;
  endTime?: string | null;
  modificationTime: string;
}

export interface AdGroup {
  id: number;
  campaignId: number;
  name: string;
  status: "ENABLED" | "PAUSED";
  servingStatus: string;
  displayStatus: string;
  defaultBidAmount: Money | null;
  cpaGoal?: Money | null;
  automatedKeywordsOptIn: boolean;
  targetingDimensions?: TargetingDimensions;
  deleted: boolean;
  startTime: string;
  endTime?: string | null;
  pricingModel: string;
}

export interface Keyword {
  id: number;
  campaignId: number;
  adGroupId: number;
  text: string;
  matchType: "BROAD" | "EXACT";
  status: "ACTIVE" | "PAUSED";
  bidAmount: Money | null;
  deleted: boolean;
  modificationTime: string;
}

export interface NegativeKeyword {
  id: number;
  campaignId: number;
  adGroupId?: number;
  text: string;
  matchType: "BROAD" | "EXACT";
  status: "ACTIVE" | "PAUSED";
  deleted: boolean;
  modificationTime: string;
}

export interface PageDetail {
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: PageDetail;
  error?: ApiError;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination?: PageDetail;
  error?: ApiError;
}

export interface Ad {
  id: number;
  orgId: number;
  campaignId: number;
  adGroupId: number;
  name: string;
  creativeId: number;
  status: "ENABLED" | "PAUSED";
  servingStatus: string;
  creationTime: string;
  modificationTime: string;
  deleted: boolean;
  rejectionReasons?: Array<{ reason: string; message: string }>;
}

export interface BudgetOrder {
  id: number;
  name: string;
  budget: Money | null;
  status: "ACTIVE" | "INACTIVE" | "EXHAUSTED" | "CANCELLED";
  startDate: string;
  endDate?: string | null;
  orderNumber?: string | null;
  supplySources?: string[] | null;
  modificationTime: string;
}

export interface Creative {
  id: number;
  orgId: number;
  adamId: number;
  name: string;
  type: string;
  state: string;
  creationTime: string;
  modificationTime: string;
}

export interface ProductPage {
  id: string;
  adamId: number;
  name: string;
  isDefault: boolean;
  state: string;
}

export interface AppInfo {
  adamId: number;
  appName: string;
  developerName: string;
  countryOrRegionCodes: string[];
}

export interface AppEligibility {
  adamId: number;
  deviceClass: string;
  state: string;
  minAge: number;
  countryOrRegion: string;
  supplySource: string;
}

export interface GeoLocation {
  id: string;
  entity: "Country" | "AdminArea" | "Locality";
  displayName: string;
  countryOrRegion: string;
}

export interface OrgAcl {
  orgId: number;
  orgName: string;
  currency: string;
  roleNames: string[];
  parentOrgId?: number;
}

export interface ApiError {
  errors: Array<{
    messageCode: string;
    message: string;
    field?: string;
  }>;
}

export interface MeDetail {
  userId: number;
  parentOrgId: number;
  [key: string]: unknown;
}

export interface CountryOrRegion {
  countryOrRegion: string;
  displayName?: string;
  [key: string]: unknown;
}

export interface CustomReport {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  granularity: string;
  state: string;
  [key: string]: unknown;
}

// --- Targeting Dimensions ---

export interface TargetingDimensions {
  age?: { included: Array<{ minAge: number; maxAge?: number }> } | null;
  gender?: { included: ("M" | "F")[] } | null;
  deviceClass?: { included: ("IPHONE" | "IPAD")[] } | null;
  daypart?: { userTime: { included: number[] } } | null;
  country?: { included: string[] } | null;
  adminArea?: { included: string[] } | null;
  locality?: { included: string[] } | null;
  appDownloaders?: { included: number[]; excluded: number[] } | null;
}

// --- Create / Update request types ---

export interface CampaignCreate {
  name: string;
  adamId: number;
  countriesOrRegions: string[];
  /** Omit for orgs that reject a lifetime budget (LIFETIME_BUDGET_NOT_SUPPORTED). */
  budgetAmount?: Money;
  dailyBudgetAmount: Money;
  supplySources?: string[];
  adChannelType?: string;
  status?: "ENABLED" | "PAUSED";
  billingEvent?: string;
}

export interface CampaignUpdate {
  name?: string;
  budgetAmount?: Money;
  dailyBudgetAmount?: Money;
  countriesOrRegions?: string[];
  status?: "ENABLED" | "PAUSED";
}

export interface AdGroupCreate {
  name: string;
  defaultBidAmount: Money;
  startTime: string;
  endTime?: string;
  cpaGoal?: Money;
  automatedKeywordsOptIn?: boolean;
  targetingDimensions?: TargetingDimensions;
  status?: "ENABLED" | "PAUSED";
  pricingModel?: string;
}

export interface AdGroupUpdate {
  name?: string;
  defaultBidAmount?: Money;
  cpaGoal?: Money;
  startTime?: string;
  endTime?: string;
  automatedKeywordsOptIn?: boolean;
  status?: "ENABLED" | "PAUSED";
}

export interface KeywordCreate {
  text: string;
  matchType: "BROAD" | "EXACT";
  bidAmount?: Money;
  status?: "ACTIVE" | "PAUSED";
}

export interface KeywordUpdate {
  id: number;
  bidAmount?: Money;
  status?: "ACTIVE" | "PAUSED";
}

export interface NegativeKeywordCreate {
  text: string;
  matchType: "BROAD" | "EXACT";
}

export interface NegativeKeywordUpdate {
  id: number;
  status?: "ACTIVE" | "PAUSED";
  matchType?: "BROAD" | "EXACT";
  text?: string;
}

export interface BudgetOrderCreate {
  name: string;
  budget: Money;
  startDate: string;
  endDate?: string;
  clientName?: string;
  orderNumber?: string;
  primaryBuyerName?: string;
  primaryBuyerEmail?: string;
  billingEmail?: string;
  supplySources?: string[];
}

export interface BudgetOrderUpdate {
  name?: string;
  budget?: Money;
  endDate?: string;
  status?: string;
}
