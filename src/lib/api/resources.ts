import { apiRequest } from "@/lib/api/client";
import { ApiError, asRecord } from "@/lib/api/errors";
import {
  dietConfirmed,
  extractCarePlanId,
  extractId,
  parseAccountDeletionRequestPage,
  parseAppointmentDetail,
  parseAppointmentPage,
  parseAppointmentTypes,
  parseCaregiver,
  parseCaregiverAvailability,
  parseCaregiverPage,
  parseCaregiverPositions,
  parseClientEnvelope,
  parseClientPage,
  parseCreateAppointmentResult,
  parseDashboard,
  parseDoctorAppointmentEnvelope,
  parseDoctorAppointmentPage,
  parseHazards,
  parseLogin,
  parseNamedEnvelope,
  parseNamedList,
  parseCallDetailEnvelope,
  parseCallPage,
  parseLeadAssignmentState,
  parseLeadDetailEnvelope,
  parseLeadPage,
  parseLeadQueueSummary,
  parseIntegrationsStatus,
  parseOutlookSync,
  parseStartLeadCall,
  parseSales,
  parseSalesDashboard,
  parseSalesMeetingEnvelope,
  parseSalesMeetings,
  parseSalesPage,
  parseSalespeople,
  parseSalespersonDetail,
  parseScheduleRange,
  parseScheduleSummary,
  parseTimeOffCreateResult,
  parseTimeOffList,
  parseVisitHoursCorrection,
  parseVisitReport,
  parseVisitSeriesCreateResult,
  parseVisitSeriesDetail,
  parseVisitSeriesEndResult,
  parseVisitSeriesList,
  parseVisitSeriesUpdateResult,
  shouldLoadNextPage,
} from "@/lib/api/parse";
import { clearSession, getRefreshToken, saveSession } from "@/lib/api/session";
import type {
  AccountDeletionRequest,
  AccountDeletionStatus,
  AppointmentDetail,
  AppointmentListItem,
  AppointmentTypeOption,
  AvailabilityWindow,
  CaregiverAvailability,
  CaregiverPosition,
  CaregiverRecord,
  ClientRecord,
  CreateCaregiverInput,
  CreateSalesInput,
  ClientUpdate,
  CreateAppointmentInput,
  CreateAppointmentResult,
  CreateCarePlanInput,
  CreateClientInput,
  CreateDoctorAppointmentInput,
  CreateVisitSeriesInput,
  DashboardStats,
  DoctorAppointment,
  Hazard,
  AddLeadNoteInput,
  CallDetail,
  CallListItem,
  CallListQuery,
  CreateLeadInput,
  CreateMeetingInput,
  LeadAssignmentState,
  LeadDetail,
  LeadListItem,
  LeadListQuery,
  LeadQueueSummary,
  IntegrationsStatus,
  LogCallInput,
  OutlookSyncResult,
  StartLeadCallResult,
  MeetingListQuery,
  NamedCatalogItem,
  PageMeta,
  SalesMeeting,
  SalesRecord,
  SalesDashboard,
  SalespersonDetail,
  SalespersonListItem,
  UpdateMeetingInput,
  ScheduleRange,
  ScheduleSummary,
  TimeOff,
  TimeOffCreateResult,
  TimeOffInput,
  UpdateAppointmentInput,
  UpdateDoctorAppointmentInput,
  UpdateVisitSeriesInput,
  VisitReport,
  VisitReportRow,
  VisitSeries,
  VisitSeriesCreateResult,
  VisitSeriesDetail,
  VisitSeriesEndResult,
  VisitSeriesQuery,
  VisitSeriesUpdateResult,
} from "@/lib/api/types";
import { browserTimeZone, browserTimeZoneOffset } from "@/lib/format";
import { SCHEDULE_HEADERS } from "@/lib/schedule";
import { VISIT_REPORT_HEADERS, visitReportQuery, type VisitReportRequest } from "@/lib/visit-report";

export const CLIENT_PAGE_SIZE = 50;
export const LIST_PAGE_SIZE = 100;
export const DOCTOR_APPOINTMENT_PAGE_SIZE = 50;

const PAGE_CAP = 200;

async function collectPages<T>(
  load: (page: number) => Promise<{ items: T[]; meta: ReturnType<typeof parseClientPage>["meta"] }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= PAGE_CAP; page += 1) {
    const result = await load(page);
    all.push(...result.items);
    if (!shouldLoadNextPage(result.meta, all.length, page, result.items.length)) break;
  }
  return all;
}

export async function login(email: string, password: string): Promise<
  | { ok: true; message: string }
  | { ok: false; reason: "denied" | "expired" | "error"; message: string; fields: Record<string, string> }
> {
  try {
    const body = await apiRequest("/auth/login", {
      method: "POST",
      authenticate: false,
      body: { email: email.trim(), password },
    });
    const result = parseLogin(body);
    if (result.expiresIn <= 0) {
      return { ok: false, reason: "expired", message: "Sign-in did not start a session. Please try again.", fields: {} };
    }
    const role = result.user.role.toUpperCase();
    if (role !== "ADMIN" && role !== "SALES") {
      return {
        ok: false,
        reason: "denied",
        message: "Access denied. This account cannot sign in here.",
        fields: {},
      };
    }
    saveSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
    return { ok: true, message: result.message };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { ok: false, reason: "error", message: "Invalid email or password", fields: {} };
    }
    if (error instanceof ApiError) {
      return { ok: false, reason: "error", message: error.message, fields: error.fields };
    }
    const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
    return { ok: false, reason: "error", message, fields: {} };
  }
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  await apiRequest("/auth/logout", {
    method: "POST",
    body: refreshToken ? { refreshToken } : {},
  });
}

export async function forgotPassword(email: string): Promise<string> {
  const body = await apiRequest("/auth/forgot-password", {
    method: "POST",
    body: { email: email.trim() },
  });
  const message =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message.trim()
      : "";
  return message || "Request submitted.";
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const body = await apiRequest("/auth/reset-password", {
    method: "POST",
    body: { token: token.trim(), password },
  });
  const message =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message.trim()
      : "";
  return message || "Password updated. You can sign in.";
}

export async function endLocalSession(): Promise<void> {
  clearSession();
}

export async function getDashboardStats(timeZoneOffset: string): Promise<DashboardStats> {
  const body = await apiRequest("/dashboard/stats", { query: { timeZoneOffset } });
  return parseDashboard(body);
}

export async function listAllClients(search?: string): Promise<ClientRecord[]> {
  return collectPages((page) =>
    apiRequest("/clients", {
      query: { page, pageSize: CLIENT_PAGE_SIZE, search: search?.trim() || undefined },
    }).then(parseClientPage),
  );
}

export async function listClientPreview(): Promise<ClientRecord[]> {
  const page = parseClientPage(
    await apiRequest("/clients", { query: { page: 1, pageSize: CLIENT_PAGE_SIZE } }),
  );
  return page.items;
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  const body = await apiRequest(`/clients/${encodeURIComponent(id)}`);
  return parseClientEnvelope(body);
}

export async function createClient(input: CreateClientInput): Promise<string | null> {
  const body = await apiRequest("/clients", { method: "POST", body: input });
  return parseClientEnvelope(body)?.id || extractId(body);
}

export async function updateClient(id: string, input: ClientUpdate): Promise<void> {
  await apiRequest(`/clients/${encodeURIComponent(id)}`, { method: "PUT", body: input });
}

export async function listHazards(clientId: string): Promise<Hazard[]> {
  const body = await apiRequest(`/clients/${encodeURIComponent(clientId)}/hazards`);
  return parseHazards(body);
}

export async function createHazard(clientId: string, type: string, description: string): Promise<void> {
  await apiRequest(`/clients/${encodeURIComponent(clientId)}/hazards`, {
    method: "POST",
    body: { type, description },
  });
}

export async function updateHazard(
  clientId: string,
  hazardId: string,
  type: string,
  description: string,
): Promise<void> {
  await apiRequest(`/clients/${encodeURIComponent(clientId)}/hazards/${encodeURIComponent(hazardId)}`, {
    method: "PUT",
    body: { type, description },
  });
}

export async function deleteHazard(clientId: string, hazardId: string): Promise<void> {
  await apiRequest(`/clients/${encodeURIComponent(clientId)}/hazards/${encodeURIComponent(hazardId)}`, {
    method: "DELETE",
  });
}

export async function createCarePlan(input: CreateCarePlanInput): Promise<string | null> {
  const body: Record<string, unknown> = {
    clientId: input.clientId,
    name: input.name.trim(),
    description: input.description.trim(),
    goals: input.goals.map((goal) => goal.trim()).filter(Boolean),
    status: input.status,
  };
  if (input.startDate) body.startDate = input.startDate;
  if (input.endDate) body.endDate = input.endDate;
  const response = await apiRequest("/care-plans", { method: "POST", body });
  return extractCarePlanId(response);
}

export async function addCarePlanTask(
  carePlanId: string,
  input: { name: string; frequency: string; description: string },
): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/tasks`, {
    method: "POST",
    body: input,
  });
}

export async function addCarePlanMedication(
  carePlanId: string,
  input: { medicationName: string; dosage: string; schedule: string; description: string },
): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/medications`, {
    method: "POST",
    body: input,
  });
}

export async function addCarePlanDiet(
  carePlanId: string,
  input: { meal: string; restrictions: string; description: string },
): Promise<void> {
  const body = await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/diet`, {
    method: "POST",
    body: input,
  });
  if (!dietConfirmed(body)) {
    throw new ApiError(200, "The diet row was not confirmed.");
  }
}

export async function addCarePlanHygiene(
  carePlanId: string,
  input: { activity: string; frequency: string; description: string },
): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/hygiene`, {
    method: "POST",
    body: input,
  });
}

export async function updateCarePlanTask(
  carePlanId: string,
  taskId: string,
  input: { name: string; frequency: string; description: string },
): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    body: input,
  });
}

export async function deleteCarePlanTask(carePlanId: string, taskId: string): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
}

export async function updateCarePlanMedication(
  carePlanId: string,
  medicationId: string,
  input: { medicationName: string; dosage: string; description: string; schedule?: string },
): Promise<void> {
  await apiRequest(
    `/care-plans/${encodeURIComponent(carePlanId)}/medications/${encodeURIComponent(medicationId)}`,
    { method: "PUT", body: input },
  );
}

export async function deleteCarePlanMedication(carePlanId: string, medicationId: string): Promise<void> {
  await apiRequest(
    `/care-plans/${encodeURIComponent(carePlanId)}/medications/${encodeURIComponent(medicationId)}`,
    { method: "DELETE" },
  );
}

export async function updateCarePlanDiet(
  carePlanId: string,
  dietId: string,
  input: { meal: string; restrictions: string; description: string },
): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/diet/${encodeURIComponent(dietId)}`, {
    method: "PUT",
    body: input,
  });
}

export async function deleteCarePlanDiet(carePlanId: string, dietId: string): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/diet/${encodeURIComponent(dietId)}`, {
    method: "DELETE",
  });
}

export async function updateCarePlanHygiene(
  carePlanId: string,
  hygieneId: string,
  input: { activity: string; frequency: string; description: string },
): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/hygiene/${encodeURIComponent(hygieneId)}`, {
    method: "PUT",
    body: input,
  });
}

export async function deleteCarePlanHygiene(carePlanId: string, hygieneId: string): Promise<void> {
  await apiRequest(`/care-plans/${encodeURIComponent(carePlanId)}/hygiene/${encodeURIComponent(hygieneId)}`, {
    method: "DELETE",
  });
}

export async function listAllCaregivers(): Promise<CaregiverRecord[]> {
  return collectPages((page) =>
    apiRequest("/users/caregivers", { query: { page, pageSize: LIST_PAGE_SIZE } }).then(parseCaregiverPage),
  );
}

export async function listCaregiverPositions(): Promise<CaregiverPosition[]> {
  const body = await apiRequest("/caregiver-positions");
  return parseCaregiverPositions(body);
}

export async function createCaregiver(input: CreateCaregiverInput): Promise<string | null> {
  const body = await apiRequest("/users/caregivers", { method: "POST", body: input });
  return parseCaregiver(asRecord(asRecord(body)?.data))?.id || extractId(body);
}

export async function deactivateCaregiver(id: string): Promise<void> {
  await apiRequest(`/users/caregivers/${encodeURIComponent(id)}/deactivate`, { method: "POST" });
}

export async function getSalesDashboard(): Promise<SalesDashboard> {
  return parseSalesDashboard(await apiRequest("/sales/dashboard"));
}

export type SalesAccountStatus = "active" | "inactive" | "all";

/** `all` returns active and inactive accounts. Inactive accounts still cannot sign in. */
export async function listAllSales(status: SalesAccountStatus = "all"): Promise<SalesRecord[]> {
  return collectPages((page) =>
    apiRequest("/users/sales", { query: { page, pageSize: LIST_PAGE_SIZE, status } }).then(parseSalesPage),
  );
}

export async function createSales(input: CreateSalesInput): Promise<string | null> {
  const body = await apiRequest("/users/sales", { method: "POST", body: input });
  return parseSales(asRecord(asRecord(body)?.data))?.id || extractId(body);
}

export async function deactivateSales(id: string): Promise<void> {
  await apiRequest(`/users/sales/${encodeURIComponent(id)}/deactivate`, { method: "POST" });
}

export async function changeSalesPassword(
  id: string,
  password: string,
): Promise<{ message: string; sales: SalesRecord | null }> {
  const body = await apiRequest(`/users/sales/${encodeURIComponent(id)}/password`, {
    method: "POST",
    body: { password },
  });
  const root = asRecord(body);
  const message =
    root && typeof root.message === "string" && root.message.trim() ? root.message.trim() : "Password updated";
  const sales = parseSales(asRecord(root?.data));
  return { message, sales: sales?.id ? sales : null };
}

export async function revokeSalesSessions(id: string): Promise<{ message: string; sales: SalesRecord | null }> {
  const body = await apiRequest(`/users/sales/${encodeURIComponent(id)}/sessions/revoke`, { method: "POST" });
  const root = asRecord(body);
  const message =
    root && typeof root.message === "string" && root.message.trim() ? root.message.trim() : "Session revoked";
  const sales = parseSales(asRecord(root?.data));
  return { message, sales: sales?.id ? sales : null };
}

export async function changeCaregiverPassword(
  id: string,
  password: string,
): Promise<{ message: string; caregiver: CaregiverRecord | null }> {
  const body = await apiRequest(`/users/caregivers/${encodeURIComponent(id)}/password`, {
    method: "POST",
    body: { password },
  });
  const root = asRecord(body);
  const message =
    root && typeof root.message === "string" && root.message.trim() ? root.message.trim() : "Password updated";
  const caregiver = parseCaregiver(asRecord(root?.data));
  return { message, caregiver: caregiver?.id ? caregiver : null };
}

export async function listAllAppointments(search?: string): Promise<AppointmentListItem[]> {
  return collectPages((page) =>
    apiRequest("/appointments", {
      query: { page, pageSize: LIST_PAGE_SIZE, search: search?.trim() || undefined },
    }).then(parseAppointmentPage),
  );
}

export async function listAppointmentTypes(): Promise<AppointmentTypeOption[]> {
  const body = await apiRequest("/appointments/types");
  return parseAppointmentTypes(body);
}

export async function getAppointment(id: string): Promise<AppointmentDetail | null> {
  const body = await apiRequest(`/appointments/${encodeURIComponent(id)}`);
  return parseAppointmentDetail(body);
}

export async function createAppointment(input: CreateAppointmentInput): Promise<CreateAppointmentResult> {
  const body = await apiRequest("/appointments", { method: "POST", body: input });
  return parseCreateAppointmentResult(body);
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<void> {
  await apiRequest(`/appointments/${encodeURIComponent(id)}`, { method: "PUT", body: input });
}

/** PUT is a merge on the server, so sending only the status leaves everything else unchanged. */
export async function cancelAppointment(id: string): Promise<void> {
  await apiRequest(`/appointments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { appointmentStatus: "cancelled" },
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  await apiRequest(`/appointments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Caregiver schedule: availability and time off
// ---------------------------------------------------------------------------

function caregiverPath(id: string, suffix: string): string {
  return `/users/caregivers/${encodeURIComponent(id)}${suffix}`;
}

export async function getCaregiverAvailability(caregiverId: string): Promise<CaregiverAvailability> {
  const body = await apiRequest(caregiverPath(caregiverId, "/availability"), { headers: { ...SCHEDULE_HEADERS } });
  return parseCaregiverAvailability(body, caregiverId);
}

export async function saveCaregiverAvailability(
  caregiverId: string,
  windows: AvailabilityWindow[],
): Promise<CaregiverAvailability> {
  const body = await apiRequest(caregiverPath(caregiverId, "/availability"), {
    method: "PUT",
    headers: { ...SCHEDULE_HEADERS },
    body: { windows },
  });
  return parseCaregiverAvailability(body, caregiverId);
}

export async function listCaregiverTimeOff(
  caregiverId: string,
  range: { from?: string; to?: string } = {},
): Promise<TimeOff[]> {
  const body = await apiRequest(caregiverPath(caregiverId, "/time-off"), {
    query: { from: range.from, to: range.to },
    headers: { ...SCHEDULE_HEADERS },
  });
  return parseTimeOffList(body);
}

export async function createCaregiverTimeOff(caregiverId: string, input: TimeOffInput): Promise<TimeOffCreateResult> {
  const payload: Record<string, string> = { startDate: input.startDate };
  if (input.endDate) payload.endDate = input.endDate;
  if (input.startTime && input.endTime) {
    payload.startTime = input.startTime;
    payload.endTime = input.endTime;
  }
  const reason = input.reason?.trim();
  if (reason) payload.reason = reason;
  const body = await apiRequest(caregiverPath(caregiverId, "/time-off"), {
    method: "POST",
    headers: { ...SCHEDULE_HEADERS },
    body: payload,
  });
  return parseTimeOffCreateResult(body);
}

export async function deleteCaregiverTimeOff(caregiverId: string, timeOffId: string): Promise<void> {
  await apiRequest(caregiverPath(caregiverId, `/time-off/${encodeURIComponent(timeOffId)}`), {
    method: "DELETE",
    headers: { ...SCHEDULE_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// Caregiver schedule: calendar views
// ---------------------------------------------------------------------------

export async function getScheduleSummary(month: string, caregiverIds: string[] = []): Promise<ScheduleSummary> {
  const body = await apiRequest("/schedule/summary", {
    query: { month, caregiverIds: caregiverIds.length > 0 ? caregiverIds.join(",") : undefined },
    headers: { ...SCHEDULE_HEADERS },
  });
  return parseScheduleSummary(body);
}

export async function getSchedule(from: string, to: string, caregiverIds: string[] = []): Promise<ScheduleRange> {
  const body = await apiRequest("/schedule", {
    query: { from, to, caregiverIds: caregiverIds.length > 0 ? caregiverIds.join(",") : undefined },
    headers: { ...SCHEDULE_HEADERS },
  });
  return parseScheduleRange(body);
}

// ---------------------------------------------------------------------------
// Caregiver schedule: recurring visit series
// ---------------------------------------------------------------------------

export async function listVisitSeries(query: VisitSeriesQuery = {}): Promise<VisitSeries[]> {
  const body = await apiRequest("/visit-series", {
    query: {
      caregiverId: query.caregiverId || undefined,
      clientId: query.clientId || undefined,
      status: query.status || undefined,
    },
    headers: { ...SCHEDULE_HEADERS },
  });
  return parseVisitSeriesList(body);
}

export async function getVisitSeries(id: string): Promise<VisitSeriesDetail | null> {
  const body = await apiRequest(`/visit-series/${encodeURIComponent(id)}`, { headers: { ...SCHEDULE_HEADERS } });
  return parseVisitSeriesDetail(body);
}

export async function createVisitSeries(input: CreateVisitSeriesInput): Promise<VisitSeriesCreateResult> {
  const body = await apiRequest("/visit-series", {
    method: "POST",
    headers: { ...SCHEDULE_HEADERS },
    body: input,
  });
  return parseVisitSeriesCreateResult(body);
}

export async function updateVisitSeries(id: string, input: UpdateVisitSeriesInput): Promise<VisitSeriesUpdateResult> {
  const body = await apiRequest(`/visit-series/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { ...SCHEDULE_HEADERS },
    body: input,
  });
  return parseVisitSeriesUpdateResult(body);
}

export async function endVisitSeries(id: string, fromDate?: string): Promise<VisitSeriesEndResult> {
  const body = await apiRequest(`/visit-series/${encodeURIComponent(id)}`, {
    method: "DELETE",
    query: { fromDate: fromDate || undefined },
    headers: { ...SCHEDULE_HEADERS },
  });
  return parseVisitSeriesEndResult(body);
}

export async function listDoctorAppointmentTypes(): Promise<NamedCatalogItem[]> {
  return parseNamedList(await apiRequest("/doctor-appointment-types"));
}

export async function createDoctorAppointmentType(name: string): Promise<NamedCatalogItem | null> {
  return parseNamedEnvelope(
    await apiRequest("/doctor-appointment-types", { method: "POST", body: { name: name.trim() } }),
  );
}

export async function updateDoctorAppointmentType(id: string, name: string): Promise<void> {
  await apiRequest(`/doctor-appointment-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { name: name.trim() },
  });
}

export async function deleteDoctorAppointmentType(id: string): Promise<void> {
  await apiRequest(`/doctor-appointment-types/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createCaregiverPosition(name: string): Promise<CaregiverPosition | null> {
  return parseNamedEnvelope(
    await apiRequest("/caregiver-positions", { method: "POST", body: { name: name.trim() } }),
  );
}

export async function updateCaregiverPosition(id: string, name: string): Promise<void> {
  await apiRequest(`/caregiver-positions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { name: name.trim() },
  });
}

export async function deleteCaregiverPosition(id: string): Promise<void> {
  await apiRequest(`/caregiver-positions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listServices(): Promise<NamedCatalogItem[]> {
  return parseNamedList(await apiRequest("/services"));
}

export async function createService(name: string): Promise<NamedCatalogItem | null> {
  return parseNamedEnvelope(await apiRequest("/services", { method: "POST", body: { name: name.trim() } }));
}

export async function updateService(id: string, name: string): Promise<void> {
  await apiRequest(`/services/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { name: name.trim() },
  });
}

export async function deleteService(id: string): Promise<void> {
  await apiRequest(`/services/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface DoctorAppointmentQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  clientId?: string;
  status?: string;
}

export async function listDoctorAppointments(
  query: DoctorAppointmentQuery = {},
): Promise<{ items: DoctorAppointment[]; meta: PageMeta }> {
  return parseDoctorAppointmentPage(
    await apiRequest("/doctor-appointments", {
      query: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? DOCTOR_APPOINTMENT_PAGE_SIZE,
        search: query.search?.trim() || undefined,
        clientId: query.clientId || undefined,
        status: query.status || undefined,
      },
    }),
  );
}

export async function listClientDoctorAppointments(clientId: string): Promise<DoctorAppointment[]> {
  return collectPages((page) =>
    listDoctorAppointments({ page, pageSize: DOCTOR_APPOINTMENT_PAGE_SIZE, clientId }),
  );
}

export async function getDoctorAppointment(id: string): Promise<DoctorAppointment | null> {
  return parseDoctorAppointmentEnvelope(await apiRequest(`/doctor-appointments/${encodeURIComponent(id)}`));
}

export async function createDoctorAppointment(input: CreateDoctorAppointmentInput): Promise<string | null> {
  const body: Record<string, string> = {
    clientId: input.clientId,
    typeId: input.typeId,
    doctorName: input.doctorName.trim(),
    specialty: input.specialty.trim(),
    phone: input.phone.trim(),
    clinicName: input.clinicName.trim(),
    scheduledDate: input.scheduledDate,
    startTime: input.startTime,
    endTime: input.endTime,
  };
  const description = input.description?.trim();
  if (description) body.description = description;
  const response = await apiRequest("/doctor-appointments", { method: "POST", body });
  return parseDoctorAppointmentEnvelope(response)?.id || extractId(response);
}

const DOCTOR_APPOINTMENT_PATCH_KEYS = [
  "clientId",
  "typeId",
  "doctorName",
  "specialty",
  "phone",
  "clinicName",
  "scheduledDate",
  "startTime",
  "endTime",
  "description",
  "status",
] as const satisfies readonly (keyof UpdateDoctorAppointmentInput)[];

export async function updateDoctorAppointment(id: string, input: UpdateDoctorAppointmentInput): Promise<void> {
  const body: Record<string, string> = {};
  for (const key of DOCTOR_APPOINTMENT_PATCH_KEYS) {
    const value = input[key];
    if (value !== undefined) body[key] = value;
  }
  if (Object.keys(body).length === 0) return;
  await apiRequest(`/doctor-appointments/${encodeURIComponent(id)}`, { method: "PUT", body });
}

export async function deleteDoctorAppointment(id: string): Promise<void> {
  await apiRequest(`/doctor-appointments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listVisitReport(input: VisitReportRequest): Promise<VisitReport> {
  const body = await apiRequest("/admin/reports/visits", {
    query: visitReportQuery(input, "list"),
    headers: { ...VISIT_REPORT_HEADERS },
  });
  return parseVisitReport(body);
}

export async function correctVisitHours(
  dailyVisitId: string,
  adjustedHours: number,
  reason: string,
): Promise<{ row: VisitReportRow; message: string }> {
  const body = await apiRequest(`/admin/reports/visits/${encodeURIComponent(dailyVisitId)}/hours`, {
    method: "POST",
    headers: { ...VISIT_REPORT_HEADERS },
    body: { adjustedHours, reason },
  });
  return parseVisitHoursCorrection(body);
}

/** Every matching visit day for the current filters, not only one page. Summary stays the window total. */
export async function listVisitReportDocument(input: VisitReportRequest): Promise<VisitReport> {
  const first = await listVisitReport({ ...input, page: 1 });
  const rows: VisitReportRow[] = [...first.rows];
  let page = 1;
  let current = first;
  while (page < PAGE_CAP && shouldLoadNextPage(current.meta, rows.length, page, current.rows.length)) {
    page += 1;
    current = await listVisitReport({ ...input, page });
    rows.push(...current.rows);
  }
  return { ...first, rows };
}

export const ACCOUNT_DELETION_PAGE_SIZE = 50;

export async function listAccountDeletionRequests(
  status: AccountDeletionStatus,
): Promise<AccountDeletionRequest[]> {
  return collectPages((page) =>
    apiRequest("/account-deletion-requests", {
      query: { status, page, pageSize: ACCOUNT_DELETION_PAGE_SIZE },
    }).then(parseAccountDeletionRequestPage),
  );
}

/** Keeps the account deactivated (inactive). */
export async function approveAccountDeletionRequest(id: string): Promise<void> {
  await apiRequest(`/account-deletion-requests/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

/** Restores the account so the user can sign in again. */
export async function rejectAccountDeletionRequest(id: string): Promise<void> {
  await apiRequest(`/account-deletion-requests/${encodeURIComponent(id)}/reject`, { method: "POST" });
}

export const SALES_LIST_PAGE_SIZE = 100;

function salesHeaders(): Record<string, string> {
  const zone = browserTimeZone();
  return zone ? { "X-Timezone": zone } : {};
}

function salesOffset(): string {
  return browserTimeZoneOffset();
}

function requireLead(body: unknown): LeadDetail {
  const lead = parseLeadDetailEnvelope(body);
  if (!lead) throw new Error("The lead could not be read.");
  return lead;
}

function requireCall(body: unknown): CallDetail {
  const call = parseCallDetailEnvelope(body);
  if (!call) throw new Error("The call could not be read.");
  return call;
}

function requireMeeting(body: unknown): SalesMeeting {
  const meeting = parseSalesMeetingEnvelope(body);
  if (!meeting) throw new Error("The meeting could not be read.");
  return meeting;
}

export async function listLeads(query: LeadListQuery = {}): Promise<{ items: LeadListItem[]; meta: PageMeta }> {
  const body = await apiRequest("/leads", {
    headers: salesHeaders(),
    query: {
      page: query.page,
      pageSize: query.pageSize,
      stage: query.stage,
      ownerId: query.ownerId,
      queue: query.queue,
      search: query.search?.trim() || undefined,
      timeZoneOffset: salesOffset(),
    },
  });
  return parseLeadPage(body);
}

export async function getLead(id: string): Promise<LeadDetail> {
  const body = await apiRequest(`/leads/${encodeURIComponent(id)}`, { headers: salesHeaders() });
  return requireLead(body);
}

export async function createLead(input: CreateLeadInput): Promise<LeadDetail> {
  const body = await apiRequest("/leads", { method: "POST", headers: salesHeaders(), body: input });
  return requireLead(body);
}

export async function updateLeadStage(id: string, stage: LeadDetail["stage"]): Promise<LeadDetail> {
  const body = await apiRequest(`/leads/${encodeURIComponent(id)}/stage`, {
    method: "PATCH",
    headers: salesHeaders(),
    body: { stage },
  });
  return requireLead(body);
}

export async function assignLead(id: string, ownerId: string): Promise<LeadDetail> {
  const body = await apiRequest(`/leads/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    headers: salesHeaders(),
    body: { ownerId },
  });
  return requireLead(body);
}

export async function addLeadNote(id: string, input: AddLeadNoteInput): Promise<LeadDetail> {
  const body = await apiRequest(`/leads/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    headers: salesHeaders(),
    query: { timeZoneOffset: salesOffset() },
    body: input,
  });
  return requireLead(body);
}

export async function getLeadQueueSummary(ownerId?: string): Promise<LeadQueueSummary> {
  const body = await apiRequest("/leads/queues/summary", {
    headers: salesHeaders(),
    query: { timeZoneOffset: salesOffset(), ownerId },
  });
  return parseLeadQueueSummary(body);
}

export async function getLeadAssignmentState(): Promise<LeadAssignmentState> {
  const body = await apiRequest("/sales/assignment-state", { headers: salesHeaders() });
  return parseLeadAssignmentState(body);
}

export async function listCalls(query: CallListQuery = {}): Promise<{ items: CallListItem[]; meta: PageMeta }> {
  const body = await apiRequest("/calls", {
    headers: salesHeaders(),
    query: { ...query, timeZoneOffset: salesOffset() },
  });
  return parseCallPage(body);
}

export async function getCall(id: string): Promise<CallDetail> {
  const body = await apiRequest(`/calls/${encodeURIComponent(id)}`, { headers: salesHeaders() });
  return requireCall(body);
}

export async function logCall(input: LogCallInput): Promise<CallDetail> {
  const body = await apiRequest("/calls", { method: "POST", headers: salesHeaders(), body: input });
  return requireCall(body);
}

export async function listMeetings(query: MeetingListQuery): Promise<SalesMeeting[]> {
  const body = await apiRequest("/sales/meetings", {
    headers: salesHeaders(),
    query: {
      from: query.from,
      to: query.to,
      ownerId: query.ownerId,
      timeZoneOffset: salesOffset(),
    },
  });
  return parseSalesMeetings(body);
}

export async function createMeeting(input: CreateMeetingInput): Promise<SalesMeeting> {
  const body = await apiRequest("/sales/meetings", { method: "POST", headers: salesHeaders(), body: input });
  return requireMeeting(body);
}

export async function updateMeeting(id: string, input: UpdateMeetingInput): Promise<SalesMeeting> {
  const body = await apiRequest(`/sales/meetings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: salesHeaders(),
    body: input,
  });
  return requireMeeting(body);
}

export async function deleteMeeting(id: string): Promise<void> {
  await apiRequest(`/sales/meetings/${encodeURIComponent(id)}`, { method: "DELETE", headers: salesHeaders() });
}

export async function listSalespeople(status: SalesAccountStatus = "all"): Promise<SalespersonListItem[]> {
  const body = await apiRequest("/salespeople", { headers: salesHeaders(), query: { status } });
  return parseSalespeople(body);
}

export async function getSalesperson(id: string): Promise<SalespersonDetail> {
  const body = await apiRequest(`/salespeople/${encodeURIComponent(id)}`, {
    headers: salesHeaders(),
    query: { timeZoneOffset: salesOffset() },
  });
  const person = parseSalespersonDetail(body);
  if (!person) throw new Error("The sales executive could not be read.");
  return person;
}

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  const body = await apiRequest("/integrations/status", {
    headers: salesHeaders(),
    query: { timeZoneOffset: salesOffset() },
  });
  return parseIntegrationsStatus(body);
}

export async function startLeadCall(leadId: string): Promise<StartLeadCallResult> {
  const body = await apiRequest(`/leads/${encodeURIComponent(leadId)}/calls/start`, {
    method: "POST",
    headers: salesHeaders(),
    query: { timeZoneOffset: salesOffset() },
  });
  return parseStartLeadCall(body);
}

export async function pushMeetingToOutlook(meetingId: string): Promise<OutlookSyncResult> {
  const body = await apiRequest(`/sales/meetings/${encodeURIComponent(meetingId)}/outlook`, {
    method: "POST",
    headers: salesHeaders(),
    query: { timeZoneOffset: salesOffset() },
  });
  return parseOutlookSync(body);
}

export async function getSalesUser(id: string): Promise<SalesRecord> {
  const body = await apiRequest(`/users/sales/${encodeURIComponent(id)}`, { headers: salesHeaders() });
  const sales = parseSales(asRecord(asRecord(body)?.data));
  if (!sales) throw new Error("The sales person could not be read.");
  return sales;
}
