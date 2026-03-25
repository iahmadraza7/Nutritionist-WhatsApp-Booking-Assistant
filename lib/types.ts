export type Intent =
  | "ORGANIZATIONAL"
  | "BOOK_APPOINTMENT"
  | "CHECK_BOOKING"
  | "RESCHEDULE_BOOKING"
  | "CANCEL_BOOKING"
  | "MEDICAL_QUERY"
  | "HUMAN_HANDOFF"
  | "OTHER";

export type ConversationChannel = "whatsapp" | "web";

export type BookingFlowState =
  | "idle"
  | "awaiting_name"
  | "awaiting_contact"
  | "awaiting_service"
  | "awaiting_date"
  | "awaiting_time"
  | "awaiting_confirmation"
  | "awaiting_reschedule_contact"
  | "awaiting_reschedule_selection"
  | "awaiting_reschedule_date"
  | "awaiting_reschedule_time"
  | "awaiting_reschedule_confirmation"
  | "booked"
  | "rescheduled"
  | "handoff";

export type ServiceType = "FIRST_VISIT" | "WEIGHING" | "GENERAL";

export type FollowUpOffsetDirection = "BEFORE" | "AFTER";
export type FollowUpOffsetUnit = "MINUTES" | "HOURS" | "DAYS";
export type FollowUpServiceScope = "ALL" | "FIRST_VISIT_ONLY";

export interface BookingData {
  name?: string;
  phone?: string;
  serviceId?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  selectedBookingId?: string;
  selectedBookingLabel?: string;
  selectedBookingServiceId?: string;
  selectedBookingServiceName?: string;
  rescheduleOptions?: BookingChoice[];
}

export interface WorkingHours {
  [day: string]: { open: string; close: string } | null;
}

export interface BookingChoice {
  id: string;
  label: string;
  serviceId: string;
  serviceName: string;
}
