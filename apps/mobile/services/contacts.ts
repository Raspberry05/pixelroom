import { Platform } from "react-native";
import type { Contact } from "../data/seed";

export type PhoneContact = {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
};

/**
 * Request permission to access device contacts
 */
export async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    // Web doesn't have native contacts API
    return false;
  }
  
  // For native platforms, we'd use expo-contacts here
  // This is a placeholder that returns mock permission grant
  return true;
}

/**
 * Get all contacts from device
 */
export async function getDeviceContacts(): Promise<PhoneContact[]> {
  if (Platform.OS === "web") {
    // Web fallback - return empty array
    return [];
  }
  
  // For native platforms, we'd use expo-contacts.getContactsAsync here
  // Mock data for demonstration
  return [
    {
      id: "mock-1",
      name: "John Smith",
      phoneNumbers: ["+1234567890"],
      emails: ["john@example.com"],
    },
    {
      id: "mock-2",
      name: "Jane Doe",
      phoneNumbers: ["+0987654321"],
      emails: ["jane@example.com"],
    },
  ];
}

/**
 * Import and match device contacts with app contacts
 */
export async function importAndMatchContacts(
  existingContacts: Contact[],
): Promise<Contact[]> {
  const hasPermission = await requestContactsPermission();
  if (!hasPermission) {
    throw new Error("Contacts permission denied");
  }
  
  const deviceContacts = await getDeviceContacts();
  const newContacts: Contact[] = [];
  
  // Convert device contacts to app contacts
  // In a real app, you'd match against a user database by phone/email
  for (const device of deviceContacts) {
    // Check if already exists
    const exists = existingContacts.some(
      (c) => c.displayName.toLowerCase() === device.name.toLowerCase(),
    );
    
    if (!exists) {
      newContacts.push({
        characterId: `imported_${device.id}`,
        displayName: device.name,
        username: device.name.toLowerCase().replace(/\s+/g, ""),
        phone: device.phoneNumbers?.[0] ?? "",
        country: "US",
        userKey: device.id as any,
      });
    }
  }
  
  return newContacts;
}

/**
 * Check if contacts permission is granted
 */
export async function hasContactsPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  
  // For native platforms, we'd use expo-contacts.getPermissionsAsync here
  return true;
}
