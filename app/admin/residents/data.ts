"use server";

import db from "@/firebase/config";
import {
  collectionWrapper,
  queryWrapper,
  getDocsWrapper,
  docWrapper,
  getDocWrapper,
  deleteDocWrapper,
  addDocWrapper,
  updateDocWrapper,
} from "@/firebase/firestore";
import {
  EmergencyContact,
  isTypeEmergencyContact,
  isTypeResident,
  Resident,
  ResidentData,
} from "@/types/resident";
import { notFound } from "next/navigation";

export async function addNewResident(resident: ResidentData) {
  try {
    const { emergency_contacts: emergencyContacts } = resident;
    resident.emergency_contact_ids = resident.emergency_contact_ids ?? [];
    if (emergencyContacts && emergencyContacts.length)
      for (const contact of emergencyContacts) {
        const contactColRef = await collectionWrapper(db, "emergency_contacts");
        const contactDocRef = await addDocWrapper(contactColRef, contact);
        if (!contactDocRef.id)
          return {
            message: "Failed to Add Emergency Contact Info.",
            success: false,
          };
        resident.emergency_contact_ids.push(contactDocRef.id);
      }
    const residentColRef = await collectionWrapper(db, "residents");
    const { emergency_contacts, ...newResident } = resident;
    const residentsDocRef = await addDocWrapper(residentColRef, newResident);
    return {
      result: new URL(
        `/residents/${residentsDocRef.id}`,
        process.env.DOMAIN
      ).toString(),
      message: "Successfully Added a New Resident",
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to Add a New Resident",
    };
  }
}

export async function updateResident(
  resident: ResidentData,
  residentId: string
) {
  try {
    const { emergency_contacts, emergency_contact_ids } = resident;
    if (
      emergency_contacts &&
      emergency_contact_ids &&
      emergency_contacts.length
    ) {
      const emergencyContacts = emergency_contacts.map((ec, i) => ({
        ...ec,
        id: emergency_contact_ids[i],
      }));
      Promise.all(
        emergencyContacts.map(async (contact) => {
          if (!contact.id)
            return {
              message: "Must include Id in Emergency Contact Object",
              success: false,
            };
          const contactDocRef = await docWrapper(
            db,
            "emergency_contacts",
            contact.id
          );
          await updateDocWrapper(contactDocRef, contact);
        })
      );
    }
    const residentDocRef = await docWrapper(db, "residents", residentId);
    await updateDocWrapper(residentDocRef, resident);
    return {
      success: true,
      message: "Successfully Updated Resident Information",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to Update the Resident",
    };
  }
}

export async function mutateResidentData(
  resident: ResidentData
): Promise<
  | { result?: string; message: string; success: boolean }
  | { result?: string; message: string; success: boolean }
>;
export async function mutateResidentData(
  resident: ResidentData,
  residentId: string
): Promise<{ success: boolean } | { success: boolean; message?: string }>;
export async function mutateResidentData(
  resident: ResidentData,
  residentId?: string
) {
  if (residentId) return updateResident(resident, residentId);
  return addNewResident(resident);
}

export async function getResidentData(residentId: string) {
  try {
    const residentsDocRef = await docWrapper(db, "residents", residentId);
    const residentsSnap = await getDocWrapper(residentsDocRef);
    const residentData = residentsSnap.data();
    if (!residentData) throw notFound();
    if (!isTypeResident(residentData))
      throw new Error("Object is not of type Resident  -- Tag:16");
    const emContactData: EmergencyContact[] = [];
    for (const emContactId of residentData.emergency_contact_ids) {
      const emContactsDoc = await docWrapper(
        db,
        "emergency_contacts",
        emContactId
      );
      const emContactsSnap = await getDocWrapper(emContactsDoc);
      const singleEmConData = emContactsSnap.data();

      if (!isTypeEmergencyContact(singleEmConData))
        throw new Error("Object is not of type Emergency Contact  -- Tag:23");
      emContactData.push(singleEmConData);
    }
    const resident = {
      ...residentData,
      id: residentId,
      emergency_contacts: emContactData,
    };
    if (!isTypeResident(resident))
      throw new Error("Object is not of type Resident  -- Tag:17");
    return resident;
  } catch (error) {
    throw new Error("Failed to fetch resident Data.\n\t\t" + error);
  }
}

export async function getAllResidentsDataLite() {
  try {
    const collectionResponse = await collectionWrapper(db, "residents");
    const residentsCollection = collectionResponse;
    const q = await queryWrapper(residentsCollection);
    const residentsData = await getDocsWrapper(q);
    return residentsData.docs.map((doc) => {
      const resident = doc.data();
      if (!isTypeResident(resident))
        throw new Error("Object is not of type Resident  -- Tag:19");
      return {
        ...resident,
        id: doc.id,
      };
    });
  } catch (error) {
    throw new Error("Failed to fetch All Residents Data.\n\t\t" + error);
  }
}

export async function getAllResidentsData() {
  try {
    const collectionResponse = await collectionWrapper(db, "residents");
    const residentsCollection = collectionResponse;
    const q = await queryWrapper(residentsCollection);
    const residentsData = await getDocsWrapper(q);
    const residents: Resident[] = [];
    for (const doc of residentsData.docs) {
      let resident = doc.data();
      if (!isTypeResident(resident))
        throw new Error("Object is not of type Resident -- Tag:9");
      const emContactData: EmergencyContact[] = [];
      for (const emContactId of resident.emergency_contact_ids) {
        const emContactsDoc = await docWrapper(
          db,
          "emergency_contacts",
          emContactId
        );
        const emContactsSnap = await getDocWrapper(emContactsDoc);
        const singleEmConData = emContactsSnap.data();
        if (!isTypeEmergencyContact(singleEmConData))
          throw new Error("Object is not of type Emergency Contact -- Tag:18");
        emContactData.push(singleEmConData);
      }
      resident = {
        ...resident,
        id: doc.id,
        emergency_contacts: emContactData,
      };
      if (!isTypeResident(resident))
        throw new Error("Object is not of type Resident -- Tag:10");
      residents.push(resident);
    }
    return residents;
  } catch (error) {
    throw new Error("Failed to fetch All Residents Data:\n\t\t" + error);
  }
}

export async function deleteResidentData(
  residentData: ResidentData,
  residentId: string
) {
  try {
    const { emergency_contact_ids: emergencyContactIds } = residentData;
    if (emergencyContactIds) {
      Promise.all(
        emergencyContactIds.map(async (id) => {
          const contactDocRef = await docWrapper(db, "emergency_contacts", id);
          await deleteDocWrapper(contactDocRef);
        })
      );
    }
    const residentDocRef = await docWrapper(db, "residents", residentId);
    await deleteDocWrapper(residentDocRef);
    return { success: true, message: "Successfully Deleted Resident" };
  } catch (error) {
    return {
      success: false,
      message: "Failed to Delete the Resident.",
    };
  }
}
