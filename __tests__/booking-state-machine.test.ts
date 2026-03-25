import { processBookingStep } from "@/lib/booking/state-machine";

const mockServices = [
  { id: "s1", name: "First Consultation", nameIt: "Prima visita", durationMin: 60, order: 0 },
  { id: "s2", name: "Follow-up", nameIt: "Visita di controllo", durationMin: 45, order: 1 },
];

describe("processBookingStep", () => {
  it("idle -> awaiting_name", () => {
    const r = processBookingStep({
      currentState: "idle",
      bookingData: null,
      userMessage: "prenotare",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_name");
    expect(r.reply).toContain("nome");
  });

  it("awaiting_name -> awaiting_service", () => {
    const r = processBookingStep({
      currentState: "awaiting_name",
      bookingData: {},
      userMessage: "Mario Rossi",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_contact");
    expect(r.bookingData.name).toBe("Mario Rossi");
    expect(r.reply).toContain("WhatsApp");
  });

  it("awaiting_contact asks for formatted phone input", () => {
    const r = processBookingStep({
      currentState: "awaiting_contact",
      bookingData: { name: "Mario Rossi" },
      userMessage: "3331234567",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_contact");
    expect(r.reply).toContain("numero WhatsApp");
  });

  it("awaiting_service rejects invalid", () => {
    const r = processBookingStep({
      currentState: "awaiting_service",
      bookingData: { name: "Mario" },
      userMessage: "qualcosa di strano",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_service");
  });

  it("awaiting_service accepts Prima visita", () => {
    const r = processBookingStep({
      currentState: "awaiting_service",
      bookingData: { name: "Mario" },
      userMessage: "Prima visita",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_date");
    expect(r.bookingData.serviceId).toBe("s1");
  });

  it("awaiting_date parses domani", () => {
    const r = processBookingStep({
      currentState: "awaiting_date",
      bookingData: { name: "Mario", serviceId: "s1", serviceName: "Prima visita" },
      userMessage: "domani",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_time");
    expect(r.bookingData.date).toBeDefined();
  });

  it("awaiting_time parses 10:00", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    const r = processBookingStep({
      currentState: "awaiting_time",
      bookingData: { name: "Mario", serviceId: "s1", serviceName: "Prima visita", date: dateStr },
      userMessage: "10:00",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_confirmation");
    expect(r.bookingData.time).toBe("10:00");
  });

  it("awaiting_confirmation yes -> booked", () => {
    const r = processBookingStep({
      currentState: "awaiting_confirmation",
      bookingData: { name: "Mario", serviceId: "s1", serviceName: "Prima visita", date: "2025-03-20", time: "10:00" },
      userMessage: "sì",
      services: mockServices,
    });
    expect(r.nextState).toBe("booked");
    expect(r.done).toBe(true);
  });

  it("awaiting_confirmation no -> idle", () => {
    const r = processBookingStep({
      currentState: "awaiting_confirmation",
      bookingData: { name: "Mario", date: "2025-03-20", time: "10:00" },
      userMessage: "no",
      services: mockServices,
    });
    expect(r.nextState).toBe("idle");
  });

  it("awaiting_reschedule_selection accepts numeric choice", () => {
    const r = processBookingStep({
      currentState: "awaiting_reschedule_selection",
      bookingData: {
        rescheduleOptions: [
          {
            id: "b1",
            label: "Prima visita - 30/03/2026 15:00",
            serviceId: "s1",
            serviceName: "Prima visita",
          },
        ],
      },
      userMessage: "1",
      services: mockServices,
    });
    expect(r.nextState).toBe("awaiting_reschedule_date");
    expect(r.bookingData.selectedBookingId).toBe("b1");
  });

  it("awaiting_reschedule_confirmation yes -> rescheduled", () => {
    const r = processBookingStep({
      currentState: "awaiting_reschedule_confirmation",
      bookingData: {
        selectedBookingId: "b1",
        selectedBookingLabel: "Prima visita - 30/03/2026 15:00",
        date: "2026-04-02",
        time: "16:00",
      },
      userMessage: "sì",
      services: mockServices,
    });
    expect(r.nextState).toBe("rescheduled");
    expect(r.done).toBe(true);
  });
});
