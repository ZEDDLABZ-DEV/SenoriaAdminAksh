"use client";

import { useCallback } from "react";
import { TypeCatalog } from "@/components/settings/type-catalog";
import { PageHeader } from "@/components/ui";
import {
  createCaregiverPosition,
  createDoctorAppointmentType,
  createService,
  deleteCaregiverPosition,
  deleteDoctorAppointmentType,
  deleteService,
  listCaregiverPositions,
  listDoctorAppointmentTypes,
  listServices,
  updateCaregiverPosition,
  updateDoctorAppointmentType,
  updateService,
} from "@/lib/api/resources";

export default function SettingsPage() {
  const loadDoctorTypes = useCallback(() => listDoctorAppointmentTypes(), []);
  const loadCaregiverTypes = useCallback(() => listCaregiverPositions(), []);
  const loadServices = useCallback(() => listServices(), []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="These names fill the dropdowns when scheduling a visit, scheduling a doctor's appointment, and adding a caregiver."
      />
      <div className="space-y-5">
        <TypeCatalog
          title="Services"
          description="Used when creating an appointment. An admin can choose more than one. Bathing, cooking, and the other starting services are already in the list."
          placeholder="Add a service"
          emptyLabel="No services yet. Add one and it will appear on the appointment form."
          deleteBody="This fails while an appointment still uses the service."
          load={loadServices}
          createItem={createService}
          updateItem={updateService}
          deleteItem={deleteService}
        />
        <TypeCatalog
          title="Doctor appointment types"
          description="Used when scheduling a doctor's appointment. Doctor's Appointment is already in the list."
          placeholder="Add a type"
          emptyLabel="No doctor appointment types yet. Add one to fill the dropdown."
          deleteBody="This fails if a doctor's appointment still uses the type."
          load={loadDoctorTypes}
          createItem={createDoctorAppointmentType}
          updateItem={updateDoctorAppointmentType}
          deleteItem={deleteDoctorAppointmentType}
        />
        <TypeCatalog
          title="Caregiver types"
          description="These are the position choices on a new caregiver. Renaming a type updates caregivers who already have it."
          placeholder="Add a caregiver type"
          emptyLabel="No caregiver types yet. Add one and it will appear when you create a caregiver."
          deleteBody="This fails while a caregiver still has this type."
          load={loadCaregiverTypes}
          createItem={createCaregiverPosition}
          updateItem={updateCaregiverPosition}
          deleteItem={deleteCaregiverPosition}
        />
      </div>
    </div>
  );
}
