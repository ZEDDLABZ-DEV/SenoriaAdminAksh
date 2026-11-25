import { asRecord, parseBookingConflicts, parseBookingWarnings } from "@/lib/api/errors";
import { fullName, listedName } from "@/lib/format";
import type {
  AddressRecord,
  AffectedVisit,
  AppointmentDetail,
  AppointmentListItem,
  AppointmentParty,
  AppointmentTask,
  AppointmentTypeOption,
  AvailabilityWindow,
  CaregiverAvailability,
  CaregiverPosition,
  CreateAppointmentResult,
  ScheduleCaregiver,
  ScheduleDay,
  ScheduleDayTimeOff,
  ScheduleRange,
  ScheduleSummary,
  ScheduleSummaryCaregiver,
  ScheduleSummaryDay,
  ScheduleVisit,
  ScheduleVisitStatus,
  TimeOff,
  TimeOffCreateResult,
  TimeSlot,
  VisitSeries,
  VisitSeriesCreateResult,
  VisitSeriesDetail,
  VisitSeriesEndResult,
  VisitSeriesOccurrence,
  VisitSeriesUpdateResult,
  CarePlan,
  CarePlanDiet,
  CarePlanHygiene,
  CarePlanMedication,
  CarePlanTask,
  CaregiverRecord,
  ClientRecord,
  SalesRecord,
  SalesDashboard,
  DashboardStats,
  Diagnosis,
  DoctorAppointment,
  EmbeddedAppointment,
  EmergencyContact,
  Hazard,
  Language,
  LoginResult,
  NamedCatalogItem,
  PageMeta,
  ServiceRequirement,
  UserAccount,
  AccountDeletionRequest,
  AccountDeletionStatus,
  AccountDeletionUser,
  CallDetail,
  CallDirection,
  CallListItem,
  CallResult,
  LeadAssignmentState,
  LeadDetail,
  LeadListItem,
  LeadQueueSummary,
  LeadSource,
  LeadStage,
  LeadTimelineEvent,
  MeetingKind,
  QueueFilter,
  SalesMeeting,
  SalespersonDetail,
  SalespersonEvent,
  SalespersonListItem,
  IntegrationVendorStatus,
  IntegrationsStatus,
  OutlookSyncResult,
  StartLeadCallResult,
  TimelineKind,
  VisitReport,
  VisitReportAdjustment,
  VisitReportArrival,
  VisitReportCarePlan,
  VisitReportCount,
  VisitReportFilters,
  VisitReportItem,
  VisitReportPerson,
  VisitReportRow,
  VisitReportSummary,
} from "@/lib/api/types";

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function int(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function optionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function optionalNumber(value: unknown): number | null {
  return optionalInt(value);
}

function nullableStr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableListedName(value: unknown): string | null {
  const name = nullableStr(value);
  return name ? listedName(name) : null;
}

function listOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)));
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function parseGender(value: unknown): "male" | "female" | "other" {
  const gender = str(value).toLowerCase();
  if (gender === "male" || gender === "other") return gender;
  return "female";
}

export function parseUser(value: unknown): UserAccount {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string" || typeof record.email !== "string") {
    throw new Error("The account details could not be read.");
  }
  const permissions = Array.isArray(record.permissions)
    ? record.permissions.map((item) => String(item))
    : [];
  return {
    id: record.id,
    email: record.email,
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    role: str(record.role),
    avatar: typeof record.avatar === "string" ? record.avatar : null,
    permissions,
  };
}

export function parseLogin(body: unknown): LoginResult {
  const root = asRecord(body);
  const data = asRecord(root?.data);
  if (!data || typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    throw new Error("The sign-in response could not be read.");
  }
  return {
    user: parseUser(data.user),
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : 0,
    message: str(root?.message),
  };
}

function parseAddress(value: unknown): AddressRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    id: str(record.id),
    street: str(record.street),
    apartment: str(record.apartment),
    city: str(record.city),
    state: str(record.state),
    zipCode: str(record.zipCode || record.postalCode),
    country: str(record.country),
    gateAccessCode: str(record.gateAccessCode),
    navigationInstructions: str(record.navigationInstructions),
  };
}

function parseContact(value: Record<string, unknown>): EmergencyContact {
  return {
    id: str(value.id),
    name: str(value.name),
    relationship: str(value.relationship),
    phone: str(value.phone),
    email: str(value.email),
    isPrimary: value.isPrimary === true,
  };
}

function parseDiagnosis(value: Record<string, unknown>): Diagnosis {
  return {
    id: str(value.id),
    name: str(value.name),
    icdCode: str(value.icdCode),
    diagnosedDate: str(value.diagnosedDate),
    severity: str(value.severity),
    notes: str(value.notes),
    isActive: bool(value.isActive, true),
  };
}

function parseLanguage(value: Record<string, unknown>): Language {
  return {
    id: str(value.id),
    name: str(value.name),
    proficiency: str(value.proficiency),
    isPrimary: value.isPrimary === true,
  };
}

export function parseHazard(value: Record<string, unknown>): Hazard {
  return {
    id: str(value.id),
    type: str(value.type),
    description: str(value.description),
    isActive: bool(value.isActive, true),
  };
}

function parseRequirement(value: Record<string, unknown>): ServiceRequirement {
  return {
    id: str(value.id),
    category: str(value.category),
    name: str(value.name),
    description: str(value.description),
    frequency: str(value.frequency),
    specialInstructions: str(value.specialInstructions),
    isActive: bool(value.isActive, true),
  };
}

function parseTask(value: Record<string, unknown>): CarePlanTask {
  return {
    id: str(value.id),
    name: str(value.name),
    description: str(value.description),
    frequency: str(value.frequency),
  };
}

function parseMedication(value: Record<string, unknown>): CarePlanMedication {
  return {
    id: str(value.id),
    medicationName: str(value.medicationName),
    dosage: str(value.dosage),
    schedule: str(value.schedule),
    description: str(value.description),
  };
}

function parseDiet(value: Record<string, unknown>): CarePlanDiet {
  return {
    id: str(value.id),
    meal: str(value.meal),
    restrictions: str(value.restrictions),
    description: str(value.description),
  };
}

function parseHygiene(value: Record<string, unknown>): CarePlanHygiene {
  return {
    id: str(value.id),
    activity: str(value.activity),
    frequency: str(value.frequency),
    description: str(value.description),
  };
}

function parseCarePlan(value: Record<string, unknown>): CarePlan {
  return {
    id: str(value.id),
    name: str(value.name),
    description: str(value.description),
    startDate: str(value.startDate),
    endDate: str(value.endDate),
    goals: stringList(value.goals),
    notes: str(value.notes),
    status: str(value.status) || "active",
    tasks: listOf(value.tasks).map(parseTask),
    medications: listOf(value.medications).map(parseMedication),
    dietInstructions: listOf(value.dietInstructions).map(parseDiet),
    hygieneInstructions: listOf(value.hygieneInstructions).map(parseHygiene),
  };
}

function parseEmbeddedAppointment(value: Record<string, unknown>): EmbeddedAppointment {
  const caregiver = asRecord(value.caregiver);
  const caregiverName = caregiver ? fullName(str(caregiver.firstName), str(caregiver.lastName)) : "";
  return {
    id: str(value.id),
    title: str(value.title) || "Appointment",
    description: str(value.description),
    scheduledDate: str(value.scheduledDate),
    startTime: str(value.startTime),
    endTime: str(value.endTime),
    appointmentType: str(value.appointmentType),
    appointmentStatus: str(value.appointmentStatus),
    caregiverName,
  };
}

function parseServices(value: unknown): NamedCatalogItem[] {
  return listOf(value)
    .map((item) => parseNamedItem(item))
    .filter((item): item is NamedCatalogItem => item !== null);
}

export function parseNamedItem(value: unknown): NamedCatalogItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = str(record.name).trim();
  if (!name) return null;
  return { id: str(record.id).trim() || name, name };
}

export function parseNamedList(body: unknown): NamedCatalogItem[] {
  const root = asRecord(body);
  const data = root && "data" in root ? root.data : body;
  if (!Array.isArray(data)) return [];
  return data.map(parseNamedItem).filter((item): item is NamedCatalogItem => item !== null);
}

export function parseNamedEnvelope(body: unknown): NamedCatalogItem | null {
  const root = asRecord(body);
  const data = root && "data" in root ? root.data : body;
  return parseNamedItem(data);
}

export function parseDoctorAppointment(value: unknown): DoctorAppointment | null {
  const record = asRecord(value);
  if (!record || !str(record.id)) return null;
  return {
    id: str(record.id),
    clientId: str(record.clientId),
    clientName: listedName(str(record.clientName)),
    typeId: str(record.typeId),
    typeName: str(record.typeName),
    status: str(record.status),
    doctorName: str(record.doctorName),
    specialty: str(record.specialty),
    phone: str(record.phone),
    clinicName: str(record.clinicName),
    scheduledDate: str(record.scheduledDate),
    startTime: str(record.startTime),
    endTime: str(record.endTime),
    description: str(record.description),
  };
}

export function parseDoctorAppointmentEnvelope(body: unknown): DoctorAppointment | null {
  const root = asRecord(body);
  const data = root && "data" in root ? root.data : body;
  return parseDoctorAppointment(data);
}

export function parseDoctorAppointmentList(body: unknown): DoctorAppointment[] {
  const root = asRecord(body);
  const data = root && "data" in root ? root.data : body;
  if (!Array.isArray(data)) return [];
  return data.map(parseDoctorAppointment).filter((item): item is DoctorAppointment => item !== null);
}

export function parseDoctorAppointmentPage(body: unknown): { items: DoctorAppointment[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const dataRecord = asRecord(root.data);
  const list = Array.isArray(dataRecord?.data) ? dataRecord.data : Array.isArray(root.data) ? root.data : [];
  return {
    items: list.map(parseDoctorAppointment).filter((item): item is DoctorAppointment => item !== null),
    meta: readMeta(asRecord(dataRecord?.meta) ?? asRecord(root.meta)),
  };
}

export function parseClient(value: unknown): ClientRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    id: str(record.id),
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    dateOfBirth: str(record.dateOfBirth),
    gender: parseGender(record.gender),
    phone: str(record.phone),
    email: str(record.email),
    notes: str(record.notes),
    status: str(record.status),
    address: parseAddress(record.address),
    emergencyContacts: listOf(record.emergencyContacts).map(parseContact),
    diagnoses: listOf(record.diagnoses).map(parseDiagnosis),
    languages: listOf(record.languages).map(parseLanguage),
    hazards: listOf(record.hazards).map(parseHazard),
    serviceRequirements: listOf(record.serviceRequirements).map(parseRequirement),
    carePlans: listOf(record.carePlans).map(parseCarePlan),
    appointments: listOf(record.appointments).map(parseEmbeddedAppointment),
    doctorAppointments: listOf(record.doctorAppointments)
      .map((item) => parseDoctorAppointment(item))
      .filter((item): item is DoctorAppointment => item !== null),
  };
}

export function parseClientEnvelope(body: unknown): ClientRecord | null {
  const root = asRecord(body);
  if (!root) return parseClient(body);
  if ("data" in root) return parseClient(root.data);
  return parseClient(root);
}

function readMeta(source: Record<string, unknown> | null): PageMeta {
  return readLayeredMeta([source]);
}

function readLayeredMeta(layers: Array<Record<string, unknown> | null>): PageMeta {
  const pick = (keys: string[]): unknown => {
    for (const layer of layers) {
      if (!layer) continue;
      for (const key of keys) {
        if (layer[key] != null && layer[key] !== "") return layer[key];
      }
    }
    return undefined;
  };
  const flag = (key: string): boolean | null => {
    for (const layer of layers) {
      if (layer && typeof layer[key] === "boolean") return layer[key] as boolean;
    }
    return null;
  };
  return {
    page: int(pick(["page"]), 1),
    pageSize: int(pick(["pageSize"]), 0),
    total: optionalInt(pick(["total", "totalCount"])),
    totalPages: optionalInt(pick(["totalPages"])),
    hasNextPage: flag("hasNextPage"),
    hasPreviousPage: flag("hasPreviousPage"),
  };
}

function firstRecord(...values: unknown[]): Record<string, unknown> | null {
  for (const value of values) {
    const record = asRecord(value);
    if (record) return record;
  }
  return null;
}

export function parseClientPage(body: unknown): { items: ClientRecord[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data.map(parseClient).filter((item): item is ClientRecord => item !== null),
      meta: readMeta(firstRecord(root.pagination, root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.clients ?? dataRecord?.items ?? dataRecord?.results ?? dataRecord?.data ?? [];
  return {
    items: (Array.isArray(list) ? list : []).map(parseClient).filter((item): item is ClientRecord => item !== null),
    meta: readLayeredMeta([
      dataRecord,
      asRecord(dataRecord?.pagination),
      asRecord(dataRecord?.meta),
      asRecord(root.pagination),
      asRecord(root.meta),
    ]),
  };
}

export function parseDashboard(body: unknown): DashboardStats {
  const root = asRecord(body) ?? {};
  const data = asRecord(root.data) ?? root;
  return {
    totalClients: int(data.totalClients),
    todayAppointments: int(data.todayAppointments),
    activeCarePlans: int(data.activeCarePlans),
    totalCaregivers: int(data.totalCaregivers),
    completedAppointmentsToday: int(data.completedAppointmentsToday),
    pendingAppointmentsToday: int(data.pendingAppointmentsToday),
  };
}

export function parseCaregiver(value: unknown): CaregiverRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    id: str(record.id),
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    role: str(record.role),
    phone: str(record.phone),
    email: str(record.email),
  };
}

export function parseSales(value: unknown): SalesRecord | null {
  const record = asRecord(value);
  if (!record || !str(record.id)) return null;
  return {
    id: str(record.id),
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    dateOfBirth: str(record.dateOfBirth),
    email: str(record.email),
    phone: str(record.phone),
    role: str(record.role) || "SALES",
    status: str(record.status),
  };
}

export function parseSalesDashboard(body: unknown): SalesDashboard {
  const root = asRecord(body) ?? {};
  const sales = parseSales(asRecord(root.data) ?? root);
  if (!sales) throw new Error("The profile could not be read.");
  return {
    id: sales.id,
    firstName: sales.firstName,
    lastName: sales.lastName,
    dateOfBirth: sales.dateOfBirth,
    email: sales.email,
    phone: sales.phone,
    role: sales.role || "SALES",
  };
}

export function parseSalesPage(body: unknown): { items: SalesRecord[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data.map(parseSales).filter((item): item is SalesRecord => item !== null),
      meta: readMeta(asRecord(root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.data ?? dataRecord?.items ?? dataRecord?.results ?? [];
  return {
    items: (Array.isArray(list) ? list : []).map(parseSales).filter((item): item is SalesRecord => item !== null),
    meta: readMeta(asRecord(dataRecord?.meta) ?? asRecord(root.meta)),
  };
}

export function parseCaregiverPage(body: unknown): { items: CaregiverRecord[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data.map(parseCaregiver).filter((item): item is CaregiverRecord => item !== null),
      meta: readMeta(asRecord(root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.data ?? dataRecord?.items ?? dataRecord?.results ?? [];
  return {
    items: (Array.isArray(list) ? list : []).map(parseCaregiver).filter((item): item is CaregiverRecord => item !== null),
    meta: readMeta(asRecord(dataRecord?.meta)),
  };
}

export function parseAppointmentListItem(value: unknown): AppointmentListItem | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    id: str(record.id),
    scheduledDate: str(record.scheduledDate),
    startTime: str(record.startTime),
    endTime: str(record.endTime),
    clientName: listedName(str(record.clientName)),
    caregiverId: str(record.caregiverId),
    caregiverName: listedName(str(record.caregiverName)),
    status: str(record.status),
    type: str(record.type),
    services: parseServices(record.services),
  };
}

export function parseAppointmentPage(body: unknown): { items: AppointmentListItem[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data.map(parseAppointmentListItem).filter((item): item is AppointmentListItem => item !== null),
      meta: readMeta(asRecord(root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.data ?? dataRecord?.items ?? dataRecord?.results ?? [];
  return {
    items: (Array.isArray(list) ? list : [])
      .map(parseAppointmentListItem)
      .filter((item): item is AppointmentListItem => item !== null),
    meta: readMeta(asRecord(dataRecord?.meta)),
  };
}

export function parseCaregiverPositions(body: unknown): CaregiverPosition[] {
  return parseNamedList(body);
}

export function parseAppointmentTypes(body: unknown): AppointmentTypeOption[] {
  const root = asRecord(body) ?? {};
  const data = Array.isArray(root.data) ? root.data : asRecord(root.data)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const value = str(record.value).trim();
      if (!value) return null;
      return { value, label: str(record.label) || value };
    })
    .filter((item): item is AppointmentTypeOption => item !== null);
}

function parseParty(value: unknown): AppointmentParty | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    id: str(record.id),
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    phone: str(record.phone),
    email: str(record.email),
  };
}

function parseAppointmentTask(value: Record<string, unknown>): AppointmentTask {
  return {
    id: str(value.id),
    title: str(value.title) || str(value.name),
    description: str(value.description),
    isCompleted: value.isCompleted === true || value.completed === true,
  };
}

export function parseAppointmentDetail(body: unknown): AppointmentDetail | null {
  const root = asRecord(body) ?? {};
  const record = asRecord(root.data) ?? root;
  if (!record || !str(record.id)) return null;
  return {
    id: str(record.id),
    description: str(record.description),
    scheduledDate: str(record.scheduledDate),
    startTime: str(record.startTime),
    endTime: str(record.endTime),
    duration: int(record.duration),
    appointmentType: str(record.appointmentType),
    appointmentStatus: str(record.appointmentStatus),
    instructions: str(record.instructions),
    notes: str(record.notes),
    checkInTime: str(record.checkInTime),
    checkOutTime: str(record.checkOutTime),
    locationStreet: str(record.locationStreet),
    locationCity: str(record.locationCity),
    locationState: str(record.locationState),
    locationZipCode: str(record.locationZipCode),
    locationGateCode: str(record.locationGateCode),
    locationNavigation: str(record.locationNavigation),
    clientId: str(record.clientId),
    caregiverId: str(record.caregiverId),
    client: parseParty(record.client),
    caregiver: parseParty(record.caregiver),
    tasks: listOf(record.tasks).map(parseAppointmentTask),
    services: parseServices(record.services),
    seriesId: nullableStr(record.seriesId),
  };
}

export function parseHazards(body: unknown): Hazard[] {
  const root = asRecord(body) ?? {};
  const list = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.hazards)
      ? root.hazards
      : Array.isArray(root.items)
        ? root.items
        : [];
  return listOf(list).map(parseHazard);
}

export function extractId(body: unknown): string | null {
  const root = asRecord(body);
  const data = asRecord(root?.data);
  if (data && typeof data.id === "string" && data.id) return data.id;
  if (root && typeof root.id === "string" && root.id) return root.id;
  return null;
}

export function extractCarePlanId(body: unknown): string | null {
  const root = asRecord(body);
  const data = asRecord(root?.data);
  if (data && typeof data.id === "string" && data.id) return data.id;
  const nested = asRecord(data?.carePlan) ?? asRecord(root?.carePlan);
  if (nested && typeof nested.id === "string" && nested.id) return nested.id;
  if (root && typeof root.id === "string" && root.id) return root.id;
  return null;
}

export function dietConfirmed(body: unknown): boolean {
  const root = asRecord(body) ?? {};
  if (asRecord(root.data)) return true;
  if (asRecord(root.diet)) return true;
  return typeof root.meal === "string";
}

export function shouldLoadNextPage(
  meta: PageMeta,
  loaded: number,
  page: number,
  pageCount: number,
): boolean {
  if (pageCount === 0) return false;
  if (meta.hasNextPage === false) return false;
  if (meta.totalPages != null && page >= meta.totalPages) return false;
  if (meta.total != null && loaded >= meta.total) return false;
  if (meta.hasNextPage === true) return true;
  if (meta.totalPages != null && page < meta.totalPages) return true;
  if (meta.total != null && loaded < meta.total) return true;
  return false;
}

function parseReportPerson(value: unknown): VisitReportPerson {
  const record = asRecord(value);
  return {
    id: str(record?.id),
    firstName: str(record?.firstName),
    lastName: str(record?.lastName),
  };
}

function parseOptionalReportPerson(value: unknown): VisitReportPerson | null {
  if (!asRecord(value)) return null;
  return parseReportPerson(value);
}

function parseReportCount(value: unknown): VisitReportCount {
  const record = asRecord(value);
  return {
    completed: int(record?.completed),
    total: int(record?.total),
  };
}

function parseReportCarePlan(value: unknown): VisitReportCarePlan | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  const name = str(record.name);
  if (!id && !name) return null;
  return { id, name };
}

function parseReportArrival(value: unknown): VisitReportArrival {
  const record = asRecord(value);
  return {
    status: str(record?.status),
    scheduledStart: nullableStr(record?.scheduledStart),
    minutesLate: optionalNumber(record?.minutesLate),
    minutesEarly: optionalNumber(record?.minutesEarly),
  };
}

function parseReportItem(value: Record<string, unknown>): VisitReportItem {
  return {
    itemType: str(value.itemType),
    itemId: str(value.itemId),
    carePlanId: nullableStr(value.carePlanId),
    carePlanName: nullableStr(value.carePlanName),
    name: str(value.name),
    detail: nullableStr(value.detail),
    completed: value.completed === true,
    completedAt: nullableStr(value.completedAt),
    caregiver: parseOptionalReportPerson(value.caregiver),
  };
}

function parseReportAdjustment(value: Record<string, unknown>): VisitReportAdjustment {
  return {
    id: str(value.id),
    adjustedHours: optionalNumber(value.adjustedHours),
    reason: str(value.reason),
    createdAt: nullableStr(value.createdAt),
    admin: parseReportPerson(value.admin),
  };
}

export function parseVisitReportRow(value: unknown): VisitReportRow {
  const record = asRecord(value) ?? {};
  const counts = asRecord(record.counts);
  return {
    appointmentId: str(record.appointmentId),
    dailyVisitId: nullableStr(record.dailyVisitId),
    serviceDate: str(record.serviceDate),
    status: str(record.status),
    canAdjustHours: record.canAdjustHours === true,
    caregiver: parseReportPerson(record.caregiver),
    client: parseReportPerson(record.client),
    carePlan: parseReportCarePlan(record.carePlan),
    appointmentType: str(record.appointmentType),
    description: str(record.description),
    scheduledStartTime: str(record.scheduledStartTime),
    scheduledEndTime: str(record.scheduledEndTime),
    scheduledHours: optionalNumber(record.scheduledHours),
    checkInAt: nullableStr(record.checkInAt),
    completedAt: nullableStr(record.completedAt),
    originalHours: optionalNumber(record.originalHours),
    adjustedHours: optionalNumber(record.adjustedHours),
    hoursUsed: optionalNumber(record.hoursUsed),
    arrival: parseReportArrival(record.arrival),
    counts: {
      tasks: parseReportCount(counts?.tasks),
      medications: parseReportCount(counts?.medications),
      diet: parseReportCount(counts?.diet),
      hygiene: parseReportCount(counts?.hygiene),
    },
    items: listOf(record.items).map(parseReportItem),
    adjustments: listOf(record.adjustments).map(parseReportAdjustment),
    locationStreet: str(record.locationStreet),
    locationCity: str(record.locationCity),
    locationState: str(record.locationState),
    locationZipCode: str(record.locationZipCode),
  };
}

function parseReportFilters(value: unknown): VisitReportFilters {
  const record = asRecord(value);
  return {
    caregiverId: nullableStr(record?.caregiverId),
    clientId: nullableStr(record?.clientId),
    caregiverName: nullableListedName(record?.caregiverName),
    clientName: nullableListedName(record?.clientName),
    status: str(record?.status),
  };
}

function parseReportSummary(value: unknown): VisitReportSummary {
  const record = asRecord(value);
  return {
    scheduledDays: int(record?.scheduledDays),
    completedDays: int(record?.completedDays),
    pendingDays: int(record?.pendingDays),
    missedDays: int(record?.missedDays),
    cancelledDays: int(record?.cancelledDays),
    totalHours: optionalNumber(record?.totalHours),
    averageHours: optionalNumber(record?.averageHours),
    completionRate: optionalNumber(record?.completionRate),
  };
}

export function parseVisitReport(body: unknown): VisitReport {
  const root = asRecord(body);
  const data = asRecord(root?.data);
  if (!data) throw new Error("The visit report could not be read.");
  return {
    period: str(data.period),
    from: str(data.from),
    to: str(data.to),
    timeZone: str(data.timeZone),
    generatedAt: nullableStr(data.generatedAt),
    filters: parseReportFilters(data.filters),
    summary: parseReportSummary(data.summary),
    rows: listOf(data.data).map(parseVisitReportRow),
    meta: readMeta(asRecord(data.meta)),
  };
}

export function parseVisitHoursCorrection(body: unknown): { row: VisitReportRow; message: string } {
  const root = asRecord(body);
  const data = asRecord(root?.data);
  if (!data) throw new Error("The updated visit could not be read.");
  return {
    row: parseVisitReportRow(data),
    message: str(root?.message) || "Hours corrected",
  };
}

// ---------------------------------------------------------------------------
// Caregiver schedule
// ---------------------------------------------------------------------------

function dataOf(body: unknown): unknown {
  const root = asRecord(body);
  return root && "data" in root ? root.data : body;
}

function intList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? Number(item) : item))
    .filter((item): item is number => typeof item === "number" && Number.isInteger(item));
}

/** Null means a repeating series. An array is the exact booked days. */
function seriesDates(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const dates: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(item);
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) continue;
    dates.push(`${match[1]}-${match[2]}-${match[3]}`);
  }
  return [...new Set(dates)].sort();
}

function parseTimeSlot(value: Record<string, unknown>): TimeSlot {
  return { startTime: str(value.startTime), endTime: str(value.endTime) };
}

function parseTimeSlots(value: unknown): TimeSlot[] {
  return listOf(value).map(parseTimeSlot);
}

export function parseCreateAppointmentResult(body: unknown): CreateAppointmentResult {
  const data = asRecord(dataOf(body));
  return {
    id: extractId(body),
    warnings: parseBookingWarnings(data?.warnings),
  };
}

function parseAvailabilityWindow(value: Record<string, unknown>): AvailabilityWindow {
  return { weekday: int(value.weekday), ...parseTimeSlot(value) };
}

export function parseCaregiverAvailability(body: unknown, caregiverId: string): CaregiverAvailability {
  const data = asRecord(dataOf(body));
  return {
    caregiverId: str(data?.caregiverId) || caregiverId,
    windows: listOf(data?.windows).map(parseAvailabilityWindow),
  };
}

export function parseTimeOff(value: unknown): TimeOff | null {
  const record = asRecord(value);
  if (!record || !str(record.id)) return null;
  const startDate = str(record.startDate);
  const startTime = nullableStr(record.startTime);
  const endTime = nullableStr(record.endTime);
  return {
    id: str(record.id),
    caregiverId: str(record.caregiverId),
    startDate,
    endDate: str(record.endDate) || startDate,
    startTime,
    endTime,
    allDay: typeof record.allDay === "boolean" ? record.allDay : !startTime && !endTime,
    reason: str(record.reason),
  };
}

export function parseTimeOffList(body: unknown): TimeOff[] {
  const data = dataOf(body);
  if (!Array.isArray(data)) return [];
  return data.map(parseTimeOff).filter((item): item is TimeOff => item !== null);
}

function parseAffectedVisit(value: Record<string, unknown>): AffectedVisit {
  return {
    appointmentId: str(value.appointmentId),
    scheduledDate: str(value.scheduledDate),
    startTime: str(value.startTime),
    endTime: str(value.endTime),
    clientName: listedName(str(value.clientName)),
  };
}

export function parseTimeOffCreateResult(body: unknown): TimeOffCreateResult {
  const data = asRecord(dataOf(body));
  const timeOff = parseTimeOff(data);
  if (!timeOff) throw new Error("The saved time off could not be read.");
  return { timeOff, affectedVisits: listOf(data?.affectedVisits).map(parseAffectedVisit) };
}

function parseScheduleCaregiverBase(record: Record<string, unknown>) {
  return {
    id: str(record.id),
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    position: str(record.position),
    status: str(record.status),
    hasAvailability: bool(record.hasAvailability),
  };
}

function parseSummaryDay(value: Record<string, unknown>): ScheduleSummaryDay {
  return {
    date: str(value.date),
    visitCount: int(value.visitCount),
    completedCount: int(value.completedCount),
    cancelledCount: int(value.cancelledCount),
    missedCount: int(value.missedCount),
    bookedMinutes: int(value.bookedMinutes),
    availableMinutes: optionalInt(value.availableMinutes),
    freeMinutes: optionalInt(value.freeMinutes),
    hasTimeOff: bool(value.hasTimeOff),
  };
}

function parseSummaryCaregiver(value: Record<string, unknown>): ScheduleSummaryCaregiver {
  return { ...parseScheduleCaregiverBase(value), days: listOf(value.days).map(parseSummaryDay) };
}

export function parseScheduleSummary(body: unknown): ScheduleSummary {
  const data = asRecord(dataOf(body));
  if (!data) throw new Error("The schedule summary could not be read.");
  return {
    month: str(data.month),
    from: str(data.from),
    to: str(data.to),
    caregivers: listOf(data.caregivers).map(parseSummaryCaregiver).filter((item) => item.id),
  };
}

const VISIT_STATUSES: ScheduleVisitStatus[] = ["scheduled", "in_progress", "completed", "missed", "cancelled"];

export function parseScheduleVisitStatus(value: unknown): ScheduleVisitStatus {
  const raw = str(value).toLowerCase();
  const found = VISIT_STATUSES.find((status) => status === raw);
  if (found) return found;
  if (raw === "canceled" || raw === "no_show") return "cancelled";
  return "scheduled";
}

function parseScheduleVisit(value: Record<string, unknown>): ScheduleVisit {
  const location = asRecord(value.location);
  return {
    appointmentId: str(value.appointmentId) || str(value.id),
    seriesId: nullableStr(value.seriesId),
    isException: bool(value.isException),
    date: str(value.date),
    startTime: str(value.startTime),
    endTime: str(value.endTime),
    durationMinutes: int(value.durationMinutes),
    clientId: str(value.clientId),
    clientName: listedName(str(value.clientName)),
    appointmentType: str(value.appointmentType),
    appointmentStatus: str(value.appointmentStatus),
    visitStatus: parseScheduleVisitStatus(value.visitStatus ?? value.appointmentStatus),
    checkInAt: nullableStr(value.checkInAt),
    checkOutAt: nullableStr(value.checkOutAt),
    services: parseServices(value.services),
    location: location
      ? {
          street: str(location.street),
          city: str(location.city),
          state: str(location.state),
          zipCode: str(location.zipCode),
        }
      : null,
  };
}

function parseScheduleDayTimeOff(value: Record<string, unknown>): ScheduleDayTimeOff {
  const startTime = nullableStr(value.startTime);
  const endTime = nullableStr(value.endTime);
  return {
    id: str(value.id),
    startTime,
    endTime,
    allDay: typeof value.allDay === "boolean" ? value.allDay : !startTime && !endTime,
    reason: str(value.reason),
  };
}

function parseScheduleDay(value: Record<string, unknown>): ScheduleDay {
  return {
    date: str(value.date),
    weekday: int(value.weekday),
    availability: parseTimeSlots(value.availability),
    timeOff: listOf(value.timeOff).map(parseScheduleDayTimeOff),
    visits: listOf(value.visits).map(parseScheduleVisit),
    freeSlots: value.freeSlots == null ? null : parseTimeSlots(value.freeSlots),
    bookedMinutes: int(value.bookedMinutes),
    availableMinutes: optionalInt(value.availableMinutes),
    freeMinutes: optionalInt(value.freeMinutes),
  };
}

function parseScheduleCaregiver(value: Record<string, unknown>): ScheduleCaregiver {
  return { ...parseScheduleCaregiverBase(value), days: listOf(value.days).map(parseScheduleDay) };
}

export function parseScheduleRange(body: unknown): ScheduleRange {
  const data = asRecord(dataOf(body));
  if (!data) throw new Error("The schedule could not be read.");
  return {
    from: str(data.from),
    to: str(data.to),
    caregivers: listOf(data.caregivers).map(parseScheduleCaregiver).filter((item) => item.id),
  };
}

export function parseVisitSeries(value: unknown): VisitSeries | null {
  const record = asRecord(value);
  if (!record || !str(record.id)) return null;
  return {
    id: str(record.id),
    clientId: str(record.clientId),
    clientName: listedName(str(record.clientName)),
    caregiverId: str(record.caregiverId),
    caregiverName: listedName(str(record.caregiverName)),
    startDate: str(record.startDate),
    endDate: str(record.endDate),
    weekdays: intList(record.weekdays),
    dates: seriesDates(record.dates),
    timeSlots: parseTimeSlots(record.timeSlots),
    serviceIds: stringList(record.serviceIds),
    appointmentType: str(record.appointmentType),
    description: str(record.description),
    instructions: str(record.instructions),
    notes: str(record.notes),
    locationStreet: str(record.locationStreet),
    locationCity: str(record.locationCity),
    locationState: str(record.locationState),
    locationZipCode: str(record.locationZipCode),
    locationGateCode: str(record.locationGateCode),
    locationNavigation: str(record.locationNavigation),
    status: str(record.status) || "active",
  };
}

export function parseVisitSeriesList(body: unknown): VisitSeries[] {
  const data = dataOf(body);
  const list = Array.isArray(data) ? data : asRecord(data)?.data;
  if (!Array.isArray(list)) return [];
  return list.map(parseVisitSeries).filter((item): item is VisitSeries => item !== null);
}

function parseOccurrence(value: Record<string, unknown>): VisitSeriesOccurrence {
  return {
    appointmentId: str(value.appointmentId) || str(value.id),
    date: str(value.date),
    startTime: str(value.startTime),
    endTime: str(value.endTime),
    caregiverId: str(value.caregiverId),
    appointmentStatus: str(value.appointmentStatus),
    isException: bool(value.isException),
  };
}

export function parseVisitSeriesDetail(body: unknown): VisitSeriesDetail | null {
  const data = asRecord(dataOf(body));
  const series = parseVisitSeries(data);
  if (!series) return null;
  return { ...series, occurrences: listOf(data?.occurrences).map(parseOccurrence) };
}

export function parseVisitSeriesCreateResult(body: unknown): VisitSeriesCreateResult {
  const data = asRecord(dataOf(body));
  return {
    series: parseVisitSeries(data?.series),
    createdCount: int(data?.createdCount),
    skipped: parseBookingConflicts(data?.skipped),
    warnings: parseBookingWarnings(data?.warnings),
  };
}

export function parseVisitSeriesUpdateResult(body: unknown): VisitSeriesUpdateResult {
  const data = asRecord(dataOf(body));
  return {
    ...parseVisitSeriesCreateResult(body),
    fromDate: str(data?.fromDate),
    removedCount: int(data?.removedCount),
  };
}

export function parseVisitSeriesEndResult(body: unknown): VisitSeriesEndResult {
  const data = asRecord(dataOf(body));
  return { series: parseVisitSeries(data?.series), removedCount: int(data?.removedCount) };
}

function parseAccountDeletionStatus(value: unknown): AccountDeletionStatus {
  const raw = str(value).trim().toLowerCase();
  if (raw === "approved") return "approved";
  if (raw === "rejected") return "rejected";
  return "pending";
}

function parseAccountDeletionUser(value: unknown): AccountDeletionUser | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  if (!id) return null;
  return {
    id,
    email: str(record.email),
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    phone: nullableStr(record.phone),
    position: str(record.position),
    status: str(record.status) || "deletion_pending",
  };
}

export function parseAccountDeletionRequest(value: unknown): AccountDeletionRequest | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  if (!id) return null;
  return {
    id,
    userId: str(record.userId),
    reason: str(record.reason),
    status: parseAccountDeletionStatus(record.status),
    reviewedById: nullableStr(record.reviewedById),
    createdAt: str(record.createdAt),
    resolvedAt: nullableStr(record.resolvedAt),
    user: parseAccountDeletionUser(record.user),
  };
}

export function parseAccountDeletionRequestPage(body: unknown): {
  items: AccountDeletionRequest[];
  meta: PageMeta;
} {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data
        .map(parseAccountDeletionRequest)
        .filter((item): item is AccountDeletionRequest => item !== null),
      meta: readMeta(firstRecord(root.pagination, root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.data ?? dataRecord?.items ?? dataRecord?.results ?? [];
  return {
    items: (Array.isArray(list) ? list : [])
      .map(parseAccountDeletionRequest)
      .filter((item): item is AccountDeletionRequest => item !== null),
    meta: readLayeredMeta([
      asRecord(dataRecord?.meta),
      asRecord(dataRecord?.pagination),
      dataRecord,
      asRecord(root.meta),
      asRecord(root.pagination),
    ]),
  };
}

const LEAD_STAGES = ["New", "Contacted", "Qualified", "Visit booked", "Won", "Lost"] as const;
const LEAD_SOURCES = ["Facebook", "Instagram", "Phone", "Referral"] as const;
const QUEUE_FILTERS = ["new", "due", "overdue", "mine"] as const;
const CALL_DIRECTIONS = ["Outbound", "Inbound"] as const;
const CALL_RESULTS = ["Connected", "No answer", "Voicemail", "Missed"] as const;
const MEETING_KINDS = ["Call", "Visit"] as const;
const TIMELINE_KINDS = ["Lead", "Call", "Note", "Meeting", "Stage", "Assignment"] as const;

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const text = str(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : null;
}

function salesStatus(value: unknown): "active" | "inactive" {
  return str(value) === "inactive" ? "inactive" : "active";
}

function unwrapData(body: unknown): unknown {
  const root = asRecord(body);
  if (root && "data" in root) return root.data;
  return body;
}

function unwrapRows(body: unknown): unknown[] {
  const data = unwrapData(body);
  if (Array.isArray(data)) return data;
  const record = asRecord(data);
  const list = record?.data ?? record?.items ?? record?.results ?? [];
  return Array.isArray(list) ? list : [];
}

export function parseLeadListItem(value: unknown): LeadListItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  const stage = oneOf<LeadStage>(record.stage, LEAD_STAGES);
  const source = oneOf<LeadSource>(record.source, LEAD_SOURCES);
  if (!id || !stage || !source) return null;
  const queues = Array.isArray(record.queues)
    ? record.queues
        .map((item) => oneOf<QueueFilter>(item, QUEUE_FILTERS))
        .filter((item): item is QueueFilter => item !== null)
    : [];
  return {
    id,
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    phone: str(record.phone),
    email: nullableStr(record.email),
    source,
    stage,
    ownerId: nullableStr(record.ownerId),
    ownerName: nullableStr(record.ownerName),
    about: nullableStr(record.about),
    lastTouchAt: nullableStr(record.lastTouchAt),
    nextStep: nullableStr(record.nextStep),
    nextStepAt: nullableStr(record.nextStepAt),
    queues,
    createdAt: str(record.createdAt),
  };
}

function parseLeadTimelineEvent(value: unknown): LeadTimelineEvent | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  const kind = oneOf<TimelineKind>(record.kind, TIMELINE_KINDS);
  if (!id || !kind) return null;
  return {
    id,
    kind,
    text: str(record.text),
    occurredAt: str(record.occurredAt),
    actorId: nullableStr(record.actorId),
    meta: asRecord(record.meta),
  };
}

export function parseLeadDetail(value: unknown): LeadDetail | null {
  const item = parseLeadListItem(value);
  const record = asRecord(value);
  if (!item || !record) return null;
  return {
    ...item,
    updatedAt: str(record.updatedAt),
    timeline: listOf(record.timeline)
      .map(parseLeadTimelineEvent)
      .filter((event): event is LeadTimelineEvent => event !== null),
    meetingId: nullableStr(record.meetingId),
  };
}

export function parseLeadDetailEnvelope(body: unknown): LeadDetail | null {
  return parseLeadDetail(unwrapData(body));
}

export function parseLeadPage(body: unknown): { items: LeadListItem[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data.map(parseLeadListItem).filter((item): item is LeadListItem => item !== null),
      meta: readMeta(firstRecord(root.pagination, root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.data ?? dataRecord?.items ?? dataRecord?.results ?? [];
  return {
    items: (Array.isArray(list) ? list : [])
      .map(parseLeadListItem)
      .filter((item): item is LeadListItem => item !== null),
    meta: readLayeredMeta([
      asRecord(dataRecord?.meta),
      asRecord(dataRecord?.pagination),
      dataRecord,
      asRecord(root.meta),
      asRecord(root.pagination),
    ]),
  };
}

export function parseLeadQueueSummary(body: unknown): LeadQueueSummary {
  const data = asRecord(unwrapData(body)) ?? {};
  return {
    new: int(data.new),
    due: int(data.due),
    overdue: int(data.overdue),
    mine: int(data.mine),
  };
}

export function parseLeadAssignmentState(body: unknown): LeadAssignmentState {
  const data = asRecord(unwrapData(body)) ?? {};
  return {
    activeRepIds: stringList(data.activeRepIds),
    nextOwnerId: nullableStr(data.nextOwnerId),
    nextOwnerName: nullableStr(data.nextOwnerName),
  };
}

function parseCallListItem(value: unknown): CallListItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  const direction = oneOf<CallDirection>(record.direction, CALL_DIRECTIONS);
  const result = oneOf<CallResult>(record.result, CALL_RESULTS);
  if (!id || !direction || !result) return null;
  return {
    id,
    when: str(record.when),
    leadId: nullableStr(record.leadId),
    name: str(record.name),
    phone: str(record.phone),
    direction,
    durationSeconds: optionalInt(record.durationSeconds),
    durationLabel: nullableStr(record.durationLabel),
    result,
    recordingAvailable: bool(record.recordingAvailable),
    ownerId: nullableStr(record.ownerId),
    ownerName: nullableStr(record.ownerName),
  };
}

export function parseCallDetail(value: unknown): CallDetail | null {
  const item = parseCallListItem(value);
  const record = asRecord(value);
  if (!item || !record) return null;
  return {
    ...item,
    startedAt: str(record.startedAt) || item.when,
    endedAt: nullableStr(record.endedAt),
    recordingUrl: nullableStr(record.recordingUrl),
  };
}

export function parseCallDetailEnvelope(body: unknown): CallDetail | null {
  return parseCallDetail(unwrapData(body));
}

export function parseCallPage(body: unknown): { items: CallListItem[]; meta: PageMeta } {
  const root = asRecord(body) ?? {};
  const data = root.data;
  if (Array.isArray(data)) {
    return {
      items: data.map(parseCallListItem).filter((item): item is CallListItem => item !== null),
      meta: readMeta(firstRecord(root.pagination, root.meta)),
    };
  }
  const dataRecord = asRecord(data);
  const list = dataRecord?.data ?? dataRecord?.items ?? dataRecord?.results ?? [];
  return {
    items: (Array.isArray(list) ? list : [])
      .map(parseCallListItem)
      .filter((item): item is CallListItem => item !== null),
    meta: readLayeredMeta([
      asRecord(dataRecord?.meta),
      asRecord(dataRecord?.pagination),
      dataRecord,
      asRecord(root.meta),
      asRecord(root.pagination),
    ]),
  };
}

export function parseSalesMeeting(value: unknown): SalesMeeting | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  const kind = oneOf<MeetingKind>(record.kind, MEETING_KINDS);
  const ownerId = str(record.ownerId);
  if (!id || !kind || !ownerId) return null;
  return {
    id,
    leadId: nullableStr(record.leadId),
    ownerId,
    title: str(record.title),
    person: str(record.person),
    kind,
    startAt: str(record.startAt),
    endAt: str(record.endAt),
  };
}

export function parseSalesMeetingEnvelope(body: unknown): SalesMeeting | null {
  return parseSalesMeeting(unwrapData(body));
}

export function parseSalesMeetings(body: unknown): SalesMeeting[] {
  return unwrapRows(body)
    .map(parseSalesMeeting)
    .filter((item): item is SalesMeeting => item !== null);
}

export function parseSalespersonListItem(value: unknown): SalespersonListItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  if (!id) return null;
  const status = salesStatus(record.status);
  return {
    id,
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    email: str(record.email),
    phone: str(record.phone),
    status,
    inRoundRobin: typeof record.inRoundRobin === "boolean" ? record.inRoundRobin : status === "active",
    assignedLeadCount: int(record.assignedLeadCount),
  };
}

export function parseSalespeople(body: unknown): SalespersonListItem[] {
  return unwrapRows(body)
    .map(parseSalespersonListItem)
    .filter((item): item is SalespersonListItem => item !== null);
}

function parseSalespersonEvent(value: unknown): SalespersonEvent | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = str(record.id);
  if (!id) return null;
  return {
    id,
    occurredAt: str(record.occurredAt),
    kind: str(record.kind),
    leadId: nullableStr(record.leadId),
    leadName: nullableStr(record.leadName),
    text: str(record.text),
  };
}

export function parseSalespersonDetail(body: unknown): SalespersonDetail | null {
  const record = asRecord(unwrapData(body));
  if (!record) return null;
  const id = str(record.id);
  if (!id) return null;
  const stats = asRecord(record.stats) ?? {};
  return {
    id,
    firstName: str(record.firstName),
    lastName: str(record.lastName),
    email: str(record.email),
    phone: str(record.phone),
    status: salesStatus(record.status),
    stats: {
      open: int(stats.open),
      won: int(stats.won),
      lost: int(stats.lost),
      overdue: int(stats.overdue),
    },
    currentLeads: listOf(record.currentLeads)
      .map(parseLeadListItem)
      .filter((item): item is LeadListItem => item !== null),
    pastLeads: listOf(record.pastLeads)
      .map(parseLeadListItem)
      .filter((item): item is LeadListItem => item !== null),
    events: listOf(record.events)
      .map(parseSalespersonEvent)
      .filter((item): item is SalespersonEvent => item !== null),
  };
}

function integrationPayload(body: unknown): Record<string, unknown> | null {
  const first = asRecord(unwrapData(body));
  if (!first) return null;
  const nested = asRecord(first.data);
  const peeled =
    nested &&
    !("started" in first) &&
    !("synced" in first) &&
    !("ringcentral" in first) &&
    !("meta" in first) &&
    !("outlook" in first) &&
    !("zoho" in first);
  return peeled ? nested : first;
}

function parseVendorStatus(value: unknown): IntegrationVendorStatus {
  const record = asRecord(value) ?? {};
  return {
    enabled: bool(record.enabled),
    configured: bool(record.configured),
  };
}

function nestedId(value: unknown): string | null {
  return nullableStr(asRecord(value)?.id);
}

export function parseIntegrationsStatus(body: unknown): IntegrationsStatus {
  const data = integrationPayload(body);
  if (!data || !("meta" in data || "ringcentral" in data || "zoho" in data || "outlook" in data)) {
    throw new Error("Integration status could not be read.");
  }
  return {
    meta: parseVendorStatus(data.meta),
    ringcentral: parseVendorStatus(data.ringcentral),
    zoho: parseVendorStatus(data.zoho),
    outlook: parseVendorStatus(data.outlook),
  };
}

export function parseStartLeadCall(body: unknown): StartLeadCallResult {
  const data = integrationPayload(body);
  if (!data || typeof data.started !== "boolean") {
    throw new Error("The call response could not be read.");
  }
  return {
    started: data.started,
    reason: nullableStr(data.reason),
    callId: nullableStr(data.callId) ?? nullableStr(data.call) ?? nestedId(data.call) ?? (data.started ? nullableStr(data.id) : null),
    sessionId: nullableStr(data.sessionId) ?? nullableStr(data.session) ?? nestedId(data.session),
  };
}

export function parseOutlookSync(body: unknown): OutlookSyncResult {
  const data = integrationPayload(body);
  if (!data || typeof data.synced !== "boolean") {
    throw new Error("The Outlook response could not be read.");
  }
  return {
    synced: data.synced,
    reason: nullableStr(data.reason),
  };
}
