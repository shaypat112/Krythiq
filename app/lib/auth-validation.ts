export const MIN_PASSWORD_LENGTH = 12;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(value));
}

export function passwordRequirements(password: string) {
  return [
    {
      id: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "case",
      label: "Uppercase and lowercase letters",
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "At least one number",
      met: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "At least one symbol",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isStrongPassword(password: string) {
  return passwordRequirements(password).every((requirement) => requirement.met);
}
