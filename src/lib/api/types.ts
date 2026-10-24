export interface UserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string | null;
  permissions: string[];
}

export interface LoginResult {
  user: UserAccount;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  message: string;
}

export interface AddressRecord {
  id: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  gateAccessCode: string;
  navigationInstructions: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface Diagnosis {
  id: string;
  name: string;
  icdCode: string;
  diagnosedDate: string;
  severity: string;
  notes: string;
  isActive: boolean;
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
  isPrimary: boolean;
}

export interface Hazard {
  id: string;
  type: string;
  description: string;
  isActive: boolean;
}

export interface ServiceRequirement {
  id: string;
  category: string;
  name: string;
  description: string;
  frequency: string;
  specialInstructions: string;
  isActive: boolean;
}

export interface CarePlanTask {
  id: string;
  name: string;
  description: string;
  frequency: string;
}

export interface CarePlanMedication {
  id: string;
  medicationName: string;
  dosage: string;
  schedule: string;
  description: string;
}

export interface CarePlanDiet {
  id: string;
  meal: string;
  restrictions: string;
  description: string;
}

export interface CarePlanHygiene {
  id: string;
  activity: string;
  frequency: string;
  description: string;
}

export interface CarePlan {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  goals: string[];
  notes: string;
  status: string;
  tasks: CarePlanTask[];
  medications: CarePlanMedication[];
  dietInstructions: CarePlanDiet[];
  hygieneInstructions: CarePlanHygiene[];
}

export interface EmbeddedAppointment {
  id: string;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  appointmentStatus: string;
  caregiverName: string;
}

export interface NamedCatalogItem {
  id: string;
  name: string;
}

export type DoctorAppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface DoctorAppointment {
  id: string;
  clientId: string;
  clientName: string;
  typeId: string;
  typeName: string;
  status: string;
  doctorName: string;
  specialty: string;
  phone: string;
  clinicName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  description: string;
}

export interface CreateDoctorAppointmentInput {
  clientId: string;
  typeId: string;
  doctorName: string;
  specialty: string;
  phone: string;
  clinicName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface UpdateDoctorAppointmentInput {
  clientId?: string;
  typeId?: string;
  doctorName?: string;
  specialty?: string;
  phone?: string;
  clinicName?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  status?: DoctorAppointmentStatus;
}

export interface ClientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  phone: string;
  email: string;
  notes: string;
  status: string;
  address: AddressRecord | null;
  emergencyContacts: EmergencyContact[];
  diagnoses: Diagnosis[];
  languages: Language[];
  hazards: Hazard[];
  serviceRequirements: ServiceRequirement[];
  carePlans: CarePlan[];
  appointments: EmbeddedAppointment[];
  doctorAppointments: DoctorAppointment[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number | null;
  totalPages: number | null;
  hasNextPage: boolean | null;
  hasPreviousPage: boolean | null;
}

export interface DashboardStats {
  totalClients: number;
  todayAppointments: number;
  activeCarePlans: number;
  totalCaregivers: number;
  completedAppointmentsToday: number;
  pendingAppointmentsToday: number;
}

export interface CaregiverRecord {
  id: string;
  firstName: string;
  lastName: string;
  /** Job position, such as "Registered Nurse (RN)". Not the auth role. */
  role: string;
  phone: string;
  email: string;
}

export type CaregiverPosition = NamedCatalogItem;

export interface CreateCaregiverInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  position: string;
  phone: string;
}

export interface AppointmentListItem {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  caregiverId: string;
  caregiverName: string;
  status: string;
  type: string;
  services: NamedCatalogItem[];
}

export interface AppointmentTypeOption {
  value: string;
  label: string;
}

export interface AppointmentParty {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface AppointmentTask {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface AppointmentDetail {
  id: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  appointmentType: string;
  appointmentStatus: string;
  instructions: string;
  notes: string;
  checkInTime: string;
  checkOutTime: string;
  locationStreet: string;
  locationCity: string;
  locationState: string;
  locationZipCode: string;
  locationGateCode: string;
  locationNavigation: string;
  clientId: string;
  caregiverId: string;
  client: AppointmentParty | null;
  caregiver: AppointmentParty | null;
  tasks: AppointmentTask[];
  services: NamedCatalogItem[];
  /** Set when the detail payload includes the recurring schedule this visit belongs to. */
  seriesId: string | null;
}

export interface ClientAddressInput {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  apartment: string;
  gateAccessCode: string;
  navigationInstructions: string;
}

export interface CreateClientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  gender: "male" | "female" | "other";
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  primaryCondition: string;
  medicalConditions: string[];
  allergies: string[];
  language: string;
  communicationNote: string;
  address: ClientAddressInput;
}

export interface ClientUpdate {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  email?: string;
  status?: "active" | "inactive";
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  primaryCondition?: string;
  medicalConditions?: string[];
  allergies?: string[];
  language?: string;
  communicationNote?: string;
  address?: ClientAddressInput;
}

export interface CreateAppointmentInput {
  description: string;
  clientId: string;
  caregiverId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  instructions: string;
  notes: string;
  locationStreet: string;
  locationCity: string;
  locationState: string;
  locationZipCode: string;
  locationGateCode: string;
  locationNavigation: string;
  serviceIds: string[];
  /** Resend with `true` after the admin confirms a 409 SCHEDULE_WARNING. */
  acknowledgeWarnings?: boolean;
}

export interface UpdateAppointmentInput {
  description: string;
  caregiverId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  appointmentStatus: "scheduled" | "completed" | "cancelled";
  appointmentType: string;
  instructions: string;
  notes: string;
  locationStreet: string;
  locationCity: string;
  locationState: string;
  locationZipCode: string;
  locationGateCode: string;
  locationNavigation: string;
  serviceIds: string[];
  /** Resend with `true` after the admin confirms a 409 SCHEDULE_WARNING. */
  acknowledgeWarnings?: boolean;
}

export interface CreateAppointmentResult {
  id: string | null;
  warnings: BookingWarning[];
}

// ---------------------------------------------------------------------------
// Caregiver schedule: booking issues
// ---------------------------------------------------------------------------

/** A visit the caregiver already has that clashes with a requested slot (422). */
export interface BookingConflict {
  date: string;
  startTime: string;
  endTime: string;
  appointmentId: string;
  clientName: string;
  existingStartTime: string;
  existingEndTime: string;
}

export type BookingWarningType = "outside_hours" | "time_off";

/** A soft availability problem the admin can acknowledge (409 SCHEDULE_WARNING). */
export interface BookingWarning {
  type: BookingWarningType | string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

/** Flags that accumulate across retries of the same booking request. */
export interface BookingFlags {
  skipConflicts: boolean;
  acknowledgeWarnings: boolean;
}

// ---------------------------------------------------------------------------
// Caregiver schedule: availability and time off
// ---------------------------------------------------------------------------

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

/** `weekday` is 0 = Sunday … 6 = Saturday. */
export interface AvailabilityWindow extends TimeSlot {
  weekday: number;
}

export interface CaregiverAvailability {
  caregiverId: string;
  windows: AvailabilityWindow[];
}

export interface TimeOff {
  id: string;
  caregiverId: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  reason: string;
}

export interface TimeOffInput {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface AffectedVisit {
  appointmentId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
}

export interface TimeOffCreateResult {
  timeOff: TimeOff;
  affectedVisits: AffectedVisit[];
}

// ---------------------------------------------------------------------------
// Caregiver schedule: calendar views
// ---------------------------------------------------------------------------

export interface ScheduleSummaryDay {
  date: string;
  visitCount: number;
  completedCount: number;
  cancelledCount: number;
  missedCount: number;
  bookedMinutes: number;
  /** Null when the caregiver has no availability configured. */
  availableMinutes: number | null;
  freeMinutes: number | null;
  hasTimeOff: boolean;
}

export interface ScheduleCaregiverBase {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  status: string;
  hasAvailability: boolean;
}

export interface ScheduleSummaryCaregiver extends ScheduleCaregiverBase {
  days: ScheduleSummaryDay[];
}

export interface ScheduleSummary {
  month: string;
  from: string;
  to: string;
  caregivers: ScheduleSummaryCaregiver[];
}

export type ScheduleVisitStatus = "scheduled" | "in_progress" | "completed" | "missed" | "cancelled";

export interface ScheduleVisitLocation {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ScheduleVisit {
  appointmentId: string;
  seriesId: string | null;
  isException: boolean;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  clientId: string;
  clientName: string;
  appointmentType: string;
  appointmentStatus: string;
  visitStatus: ScheduleVisitStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  services: NamedCatalogItem[];
  location: ScheduleVisitLocation | null;
}

export interface ScheduleDayTimeOff {
  id: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  reason: string;
}

export interface ScheduleDay {
  date: string;
  weekday: number;
  availability: TimeSlot[];
  timeOff: ScheduleDayTimeOff[];
  visits: ScheduleVisit[];
  /** Null when the caregiver has no availability configured. */
  freeSlots: TimeSlot[] | null;
  bookedMinutes: number;
  availableMinutes: number | null;
  freeMinutes: number | null;
}

export interface ScheduleCaregiver extends ScheduleCaregiverBase {
  days: ScheduleDay[];
}

export interface ScheduleRange {
  from: string;
  to: string;
  caregivers: ScheduleCaregiver[];
}

// ---------------------------------------------------------------------------
// Caregiver schedule: recurring visit series
// ---------------------------------------------------------------------------

export type VisitSeriesStatus = "active" | "ended";

export interface VisitSeries {
  id: string;
  clientId: string;
  clientName: string;
  caregiverId: string;
  caregiverName: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  /** Exact booked days. Null when the series repeats between start and end. */
  dates: string[] | null;
  timeSlots: TimeSlot[];
  serviceIds: string[];
  appointmentType: string;
  description: string;
  instructions: string;
  notes: string;
  locationStreet: string;
  locationCity: string;
  locationState: string;
  locationZipCode: string;
  locationGateCode: string;
  locationNavigation: string;
  status: VisitSeriesStatus | string;
}

export interface VisitSeriesOccurrence {
  appointmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  caregiverId: string;
  appointmentStatus: string;
  isException: boolean;
}

export interface VisitSeriesDetail extends VisitSeries {
  occurrences: VisitSeriesOccurrence[];
}

export interface VisitSeriesLocationInput {
  locationStreet?: string;
  locationCity?: string;
  locationState?: string;
  locationZipCode?: string;
  locationGateCode?: string;
  locationNavigation?: string;
}

interface VisitSeriesWriteFields {
  timeSlots: TimeSlot[];
  appointmentType: string;
  description: string;
  instructions: string;
  notes: string;
  serviceIds: string[];
}

/** Repeating series. Do not send `dates` with this shape. */
export interface CreateVisitSeriesRepeatInput extends VisitSeriesLocationInput, Partial<BookingFlags>, VisitSeriesWriteFields {
  clientId: string;
  caregiverId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
}

/** Calendar series. Do not send startDate, endDate, or weekdays with this shape. */
export interface CreateVisitSeriesDatesInput extends VisitSeriesLocationInput, Partial<BookingFlags>, VisitSeriesWriteFields {
  clientId: string;
  caregiverId: string;
  dates: string[];
}

export type CreateVisitSeriesInput = CreateVisitSeriesRepeatInput | CreateVisitSeriesDatesInput;

/** Repeating series update. Sends start-range changes and weekdays, never `dates`. */
export interface UpdateVisitSeriesRepeatInput extends VisitSeriesLocationInput, Partial<BookingFlags> {
  fromDate?: string;
  caregiverId?: string;
  endDate?: string;
  weekdays?: number[];
  timeSlots?: TimeSlot[];
  appointmentType?: string;
  description?: string;
  instructions?: string;
  notes?: string;
  serviceIds?: string[];
}

/** Calendar series update. Sends the days that should remain on or after fromDate. */
export interface UpdateVisitSeriesDatesInput extends VisitSeriesLocationInput, Partial<BookingFlags> {
  fromDate?: string;
  caregiverId?: string;
  dates: string[];
  timeSlots?: TimeSlot[];
  appointmentType?: string;
  description?: string;
  instructions?: string;
  notes?: string;
  serviceIds?: string[];
}

export type UpdateVisitSeriesInput = UpdateVisitSeriesRepeatInput | UpdateVisitSeriesDatesInput;

export interface VisitSeriesQuery {
  caregiverId?: string;
  clientId?: string;
  status?: VisitSeriesStatus;
}

export interface VisitSeriesCreateResult {
  series: VisitSeries | null;
  createdCount: number;
  skipped: BookingConflict[];
  warnings: BookingWarning[];
}

export interface VisitSeriesUpdateResult extends VisitSeriesCreateResult {
  fromDate: string;
  removedCount: number;
}

export interface VisitSeriesEndResult {
  series: VisitSeries | null;
  removedCount: number;
}

export interface CreateCarePlanInput {
  clientId: string;
  name: string;
  description: string;
  goals: string[];
  status: "active" | "inactive" | "completed";
  startDate?: string;
  endDate?: string;
}

export type VisitReportPeriod = "daily" | "weekly" | "monthly" | "custom";

export type VisitReportStatusFilter = "completed" | "pending" | "missed" | "cancelled" | "all";

export interface VisitReportPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface VisitReportCount {
  completed: number;
  total: number;
}

export interface VisitReportArrival {
  status: string;
  scheduledStart: string | null;
  minutesLate: number | null;
  minutesEarly: number | null;
}

export interface VisitReportItem {
  itemType: string;
  itemId: string;
  carePlanId: string | null;
  carePlanName: string | null;
  name: string;
  detail: string | null;
  completed: boolean;
  completedAt: string | null;
  caregiver: VisitReportPerson | null;
}

export interface VisitReportAdjustment {
  id: string;
  adjustedHours: number | null;
  reason: string;
  createdAt: string | null;
  admin: VisitReportPerson;
}

export interface VisitReportCarePlan {
  id: string;
  name: string;
}

export interface VisitReportRow {
  appointmentId: string;
  dailyVisitId: string | null;
  serviceDate: string;
  status: string;
  canAdjustHours: boolean;
  caregiver: VisitReportPerson;
  client: VisitReportPerson;
  carePlan: VisitReportCarePlan | null;
  appointmentType: string;
  description: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledHours: number | null;
  checkInAt: string | null;
  completedAt: string | null;
  originalHours: number | null;
  adjustedHours: number | null;
  hoursUsed: number | null;
  arrival: VisitReportArrival;
  counts: {
    tasks: VisitReportCount;
    medications: VisitReportCount;
    diet: VisitReportCount;
    hygiene: VisitReportCount;
  };
  items: VisitReportItem[];
  adjustments: VisitReportAdjustment[];
  locationStreet: string;
  locationCity: string;
  locationState: string;
  locationZipCode: string;
}

export interface VisitReportFilters {
  caregiverId: string | null;
  clientId: string | null;
  caregiverName: string | null;
  clientName: string | null;
  status: string;
}

export interface VisitReportSummary {
  scheduledDays: number;
  completedDays: number;
  pendingDays: number;
  missedDays: number;
  cancelledDays: number;
  totalHours: number | null;
  averageHours: number | null;
  completionRate: number | null;
}

export interface VisitReport {
  period: string;
  from: string;
  to: string;
  timeZone: string;
  generatedAt: string | null;
  filters: VisitReportFilters;
  summary: VisitReportSummary;
  rows: VisitReportRow[];
  meta: PageMeta;
}
