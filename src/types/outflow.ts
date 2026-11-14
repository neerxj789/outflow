export type LeadStatus =
  | "New"
  | "Contacted"
  | "Follow Up"
  | "Interested"
  | "Not Interested";

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Follow Up",
  "Interested",
  "Not Interested",
];

export interface Business {
  id: string;
  name: string;
  status: LeadStatus | string;
  number: string;
  website: string;
  email: string;
  followUpDate?: string;
}

export interface TabData {
  id: string;
  name: string;
  businesses: Business[];
}

export type ContactFilter = "all" | "phone" | "website" | "email";

export type AppView = "landing" | "workspace" | "legal";

export type LegalDocType = "terms" | "privacy" | "cookies";

export interface StageCount {
  status: LeadStatus;
  count: number;
  percentage: number;
}

export interface DerivedAnalytics {
  total: number;
  withPhone: number;
  phoneRate: number;
  withWebsite: number;
  websiteRate: number;
  withEmail: number;
  activePipeline: number;
  stages: StageCount[];
}
