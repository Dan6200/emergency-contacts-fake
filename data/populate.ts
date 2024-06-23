import { addDocWrapper, collectionWrapper } from "@/firebase/firestore";
import { initializeFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  projectId: process.env.FB_PROJECT_ID,
  storageBucket: process.env.FB_STORAGE_BUCKET,
  appId: process.env.FB_APP_ID,
  setConnectTimeout: 10000,
  measurementId: process.env.FB_MEASUREMENT_ID,
};

console.log(firebaseConfig);

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

class EmergencyContact {
  constructor() {
    this.name = faker.person.firstName();
    const relationshipTypes = [
      "brother",
      "sister",
      "father",
      "mother",
      "uncle",
      "aunt",
      "friend",
      "cousin",
    ];
    this.relationship =
      relationshipTypes[
        Math.ceil(Math.random() * relationshipTypes.length - 1)
      ];
    this.phone_number = faker.phone.number();
  }
  name: string;
  relationship: string;
  phone_number: string;
}

class Resident {
  constructor() {
    this.name = faker.person.fullName();
    this.unit_number =
      faker.string.numeric({ length: { min: 2, max: 3 } }) +
      faker.string.fromCharacters("ABCDEFGHIJ", 1);
    this.address = faker.location.streetAddress();
  }
  name: string;
  address: string;
  unit_number: string;
  emergency_contact_ids?: string[];
}

async function addNewResident(resident: Resident) {
  try {
    const emergencyContacts: EmergencyContact[] = Array(
      Math.ceil(Math.random() * 4) + 1
    )
      .fill(0)
      .map((el) => new EmergencyContact());
    const emergencyContactIds = [];
    if (emergencyContacts && emergencyContacts.length)
      for (const contact of emergencyContacts) {
        const contactColRef = await collectionWrapper(db, "emergency_contacts");
        console.log(contact);
        const contactDocRef = await addDocWrapper(
          contactColRef,
          JSON.parse(JSON.stringify(contact))
        ).catch((e) => {
          throw new Error("Failed to add new contacts: " + e);
        });
        if (!contactDocRef.id)
          return {
            message: "Failed to Add Emergency Contact Info.",
            success: false,
          };
        emergencyContactIds.push(contactDocRef.id);
      }
    const residentColRef = await collectionWrapper(db, "residents");
    resident.emergency_contact_ids = emergencyContactIds;
    console.log(resident);
    const residentsDocRef = await addDocWrapper(
      residentColRef,
      JSON.parse(JSON.stringify(resident))
    );
    return {
      result: residentsDocRef.id,
      message: "Successfully Added a New Resident",
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to Add a New Resident: ${error}`,
    };
  }
}

(async () => {
  for (let i = 0; i < 300; i++) {
    const { success, result, message } = await addNewResident(new Resident());
    if (success) console.log(result);
    else console.error(message);
  }
})();
