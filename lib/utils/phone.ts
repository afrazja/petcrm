/** Strip all non-digit characters from a phone string */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Check if a normalized phone string is valid (at least 7 digits) */
export function isValidPhone(normalizedPhone: string): boolean {
  return normalizedPhone.length >= 7;
}

/** Format a digit-only phone string for display: (555) 123-4567 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
