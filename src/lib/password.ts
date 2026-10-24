export interface PasswordRule {
  id: "length" | "lower" | "upper" | "digit" | "symbol";
  label: string;
  met: boolean;
}

const RULES: Array<{ id: PasswordRule["id"]; label: string; test: (value: string) => boolean }> = [
  { id: "length", label: "At least 8 characters", test: (value) => value.length >= 8 },
  { id: "lower", label: "A lowercase letter", test: (value) => /[a-z]/.test(value) },
  { id: "upper", label: "An uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { id: "digit", label: "A number", test: (value) => /\d/.test(value) },
  { id: "symbol", label: "A symbol, such as ! @ # $", test: (value) => /[^A-Za-z0-9\s]/.test(value) },
];

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function passwordRules(password: string): PasswordRule[] {
  return RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(password) }));
}

export function strongPasswordError(password: string): string {
  if (!password) return "Password is required.";
  const missing = passwordRules(password)
    .filter((rule) => !rule.met)
    .map((rule) => rule.label.charAt(0).toLowerCase() + rule.label.slice(1));
  if (password !== password.trim()) missing.push("no space at the start or end");
  if (password.length > 128) missing.push("128 characters or fewer");
  if (missing.length === 0) return "";
  return `Password needs ${joinList(missing)}.`;
}

export function confirmPasswordError(password: string, confirm: string): string {
  if (!confirm) return "Confirm the password.";
  if (password !== confirm) return "Passwords do not match.";
  return "";
}

export function caregiverPasswordError(password: string): string {
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
}
