import type { Activity, EventType } from "./eventOptions";

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Booking {
  _id: string;
  parentName: string;
  contact: string;
  childName: string;
  childAge: number;
  numberOfChildren: number;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM", 24h
  durationMinutes: number;
  // Event details; missing on bookings made before they were added.
  eventType?: EventType;
  location?: string;
  activities?: Activity[];
  notes: string;
  status: BookingStatus;
  referenceCode?: string; // e.g. "PT-4F2K"; missing on older bookings
  userId?: string; // set when booked while logged in; guests have none
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type NewBooking = Pick<
  Booking,
  | "parentName"
  | "contact"
  | "childName"
  | "childAge"
  | "numberOfChildren"
  | "date"
  | "time"
  | "durationMinutes"
  | "notes"
> &
  Required<Pick<Booking, "eventType" | "location" | "activities">>;

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  _id: string;
  name: string;
  rating: number; // 1-5
  comment: string;
  status: ReviewStatus;
  createdAt: string; // ISO string
}

export type NewReview = Pick<Review, "name" | "rating" | "comment">;
