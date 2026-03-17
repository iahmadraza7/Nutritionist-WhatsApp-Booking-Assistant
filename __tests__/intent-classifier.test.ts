import { ruleBasedIntent } from "@/lib/ai/intent-classifier";

describe("ruleBasedIntent", () => {
  it("detects MEDICAL_QUERY for diet questions", () => {
    expect(ruleBasedIntent("Che dieta devo seguire per il diabete?")).toBe("MEDICAL_QUERY");
    expect(ruleBasedIntent("What diet for diabetes?")).toBe("MEDICAL_QUERY");
  });

  it("detects MEDICAL_QUERY for symptom questions", () => {
    expect(ruleBasedIntent("Ho mal di stomaco, cosa devo mangiare?")).toBe("MEDICAL_QUERY");
    expect(ruleBasedIntent("Can I take this supplement?")).toBe("MEDICAL_QUERY");
  });

  it("detects BOOK_APPOINTMENT", () => {
    expect(ruleBasedIntent("Voglio prenotare un appuntamento")).toBe("BOOK_APPOINTMENT");
    expect(ruleBasedIntent("Vorrei una visita")).toBe("BOOK_APPOINTMENT");
  });

  it("detects ORGANIZATIONAL", () => {
    expect(ruleBasedIntent("Quali sono gli orari?")).toBe("ORGANIZATIONAL");
    expect(ruleBasedIntent("Dove si trova la clinica?")).toBe("ORGANIZATIONAL");
  });

  it("detects CANCEL_BOOKING", () => {
    expect(ruleBasedIntent("Voglio annullare la prenotazione")).toBe("CANCEL_BOOKING");
  });

  it("returns null for ambiguous", () => {
    expect(ruleBasedIntent("Ciao")).toBe(null);
  });
});
