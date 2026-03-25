import {
  computeScheduledFor,
  isTemplateApplicable,
  offsetToMinutes,
  renderTemplateMessage,
} from "@/lib/follow-up-scheduler";

describe("follow-up scheduler helpers", () => {
  it("converts offsets into minutes", () => {
    expect(offsetToMinutes(30, "MINUTES")).toBe(30);
    expect(offsetToMinutes(2, "HOURS")).toBe(120);
    expect(offsetToMinutes(5, "DAYS")).toBe(7200);
  });

  it("computes reminder time before appointment", () => {
    const appointment = new Date("2026-03-30T15:00:00.000Z");
    const scheduled = computeScheduledFor(appointment, 1, "DAYS", "BEFORE");
    expect(scheduled.toISOString()).toBe("2026-03-29T15:00:00.000Z");
  });

  it("applies first-visit scope correctly", () => {
    expect(isTemplateApplicable("FIRST_VISIT", "FIRST_VISIT_ONLY")).toBe(true);
    expect(isTemplateApplicable("WEIGHING", "FIRST_VISIT_ONLY")).toBe(false);
  });

  it("renders placeholders into WhatsApp-ready content", () => {
    const message = renderTemplateMessage(
      "Ciao {{patient_name}}, ti ricordo {{service_name}} del {{appointment_date}} alle {{appointment_time}}.",
      {
        id: "b1",
        appointmentAt: new Date("2026-03-30T15:00:00.000Z"),
        status: "CONFIRMED",
        patient: { fullName: "Mario Rossi", phone: "393331234567" },
        service: { name: "First Visit", nameIt: "Prima visita", serviceType: "FIRST_VISIT" },
      },
      "Europe/Rome"
    );

    expect(message).toContain("Mario Rossi");
    expect(message).toContain("Prima visita");
    expect(message).not.toContain("{{");
  });
});
