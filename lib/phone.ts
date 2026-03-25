const DEFAULT_COUNTRY_CODE = "39";

export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith("3")) {
    digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

export function isValidPhoneNumber(input: string): boolean {
  return normalizePhoneNumber(input) !== null;
}

export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return "-";

  const normalized = normalizePhoneNumber(phone) ?? phone.replace(/\D/g, "");
  if (normalized.startsWith("39") && normalized.length === 12) {
    return `+39 ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8)}`;
  }
  return `+${normalized}`;
}
