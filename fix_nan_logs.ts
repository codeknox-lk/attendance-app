import { db } from './src/lib/db';

async function fixNaNLogs() {
  const corruptedLogs = await db.attendanceLog.findMany({
    where: {
      date: "NaN-NaN-NaN",
    }
  });

  console.log(`Found ${corruptedLogs.length} corrupted logs.`);

  if (corruptedLogs.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  // To fix them, we need to know the date they were created.
  // We can use the createdAt timestamp to reconstruct the date in SL time!
  for (const log of corruptedLogs) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(log.createdAt);
    const dateParts: Record<string, string> = {};
    parts.forEach(p => { dateParts[p.type] = p.value; });
    
    const slYear = parseInt(dateParts.year);
    const slMonth = parseInt(dateParts.month);
    const slDay = parseInt(dateParts.day);
    const slHour = parseInt(dateParts.hour) === 24 ? 0 : parseInt(dateParts.hour);
    const slMinute = parseInt(dateParts.minute);
    const slSecond = parseInt(dateParts.second);

    const dateStr = `${slYear}-${String(slMonth).padStart(2, "0")}-${String(slDay).padStart(2, "0")}`;
    const timeStr = `${String(slHour).padStart(2, "0")}:${String(slMinute).padStart(2, "0")}:${String(slSecond).padStart(2, "0")}`;

    console.log(`Fixing log ${log.id} -> date: ${dateStr}, checkIn: ${timeStr}`);

    await db.attendanceLog.update({
      where: { id: log.id },
      data: {
        date: dateStr,
        checkIn: log.checkIn === "NaN:NaN:NaN" ? timeStr : log.checkIn,
      }
    });
  }
  console.log("Successfully fixed corrupted logs.");
}

fixNaNLogs()
  .catch(console.error)
  .finally(() => db.$disconnect());
