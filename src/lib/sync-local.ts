import { syncHikvisionDeviceMemory } from "./hikvisionSync";

async function run() {
  console.log("Connecting to Hikvision terminal on local network (192.168.8.135)...");
  try {
    const result = await syncHikvisionDeviceMemory("192.168.8.135", 80, "admin", "admin123");
    console.log("Sync Complete:", result);
  } catch (err) {
    console.error("Failed to sync:", err);
  }
}

run();
