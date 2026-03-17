export type Intent =
  | "ORGANIZATIONAL"
  | "BOOK_APPOINTMENT"
  | "CHECK_BOOKING"
  | "RESCHEDULE_BOOKING"
  | "CANCEL_BOOKING"
  | "MEDICAL_QUERY"
  | "HUMAN_HANDOFF"
  | "OTHER";

export type BookingFlowState =
  | "idle"
  | "awaiting_name"
  | "awaiting_service"
  | "awaiting_date"
  | "awaiting_time"
  | "awaiting_confirmation"
  | "booked"
  | "handoff";

export interface BookingData {
  name?: string;
  phone?: string;
  serviceId?: string;
  serviceName?: string;
  date?: string;
  time?: string;
}

export interface WorkingHours {
  [day: string]: { open: string; close: string } | null;
}
