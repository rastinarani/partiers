export type BookingStatus = "pending" | "confirmed" | "declined";

export interface Booking {
  _id: string;
  parentName: string;
  contact: string;
  childName: string;
  childAge: number;
  numberOfChildren: number;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM", 24h
  notes: string;
  status: BookingStatus;
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
  | "notes"
>;

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
