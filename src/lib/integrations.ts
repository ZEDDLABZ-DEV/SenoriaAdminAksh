import type { IntegrationsStatus, IntegrationVendorStatus, OutlookSyncResult, StartLeadCallResult } from "@/lib/api/types";

const OFF: IntegrationVendorStatus = { enabled: false, configured: false };

export const DISABLED_INTEGRATIONS: IntegrationsStatus = {
  meta: OFF,
  ringcentral: OFF,
  zoho: OFF,
  outlook: OFF,
};

const PHONE_REASONS: Record<string, string> = {
  ringcentral_not_configured: "Phone is not connected yet.",
  ringcentral_not_enabled: "Phone is not connected.",
  not_configured: "Phone is not connected yet.",
  not_enabled: "Phone is not connected.",
};

const OUTLOOK_REASONS: Record<string, string> = {
  outlook_not_configured: "Outlook is not connected yet.",
  outlook_not_enabled: "Outlook is not connected.",
  not_configured: "Outlook is not connected yet.",
  not_enabled: "Outlook is not connected.",
};

export function callOutcome(result: StartLeadCallResult): { ok: boolean; message: string } {
  if (result.started) return { ok: true, message: "Call started." };
  return { ok: false, message: PHONE_REASONS[result.reason ?? ""] ?? "The call did not start." };
}

export function outlookOutcome(result: OutlookSyncResult): { ok: boolean; message: string } {
  if (result.synced) return { ok: true, message: "Added to Outlook." };
  return { ok: false, message: OUTLOOK_REASONS[result.reason ?? ""] ?? "Outlook did not update." };
}
