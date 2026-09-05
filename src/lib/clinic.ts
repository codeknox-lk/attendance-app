import { db } from "@/lib/db";

/**
 * Safely resolves the active clinic ID from request headers or query params.
 * If the provided clinic ID does not exist in the database (e.g. legacy/stale session token),
 * it seamlessly falls back to the primary clinic in the database.
 */
export async function getClinicId(req: Request): Promise<string> {
  const headerClinicId = req.headers.get("x-clinic-id");
  let queryClinicId: string | null = null;
  try {
    const url = new URL(req.url);
    queryClinicId = url.searchParams.get("clinicId");
  } catch {}

  const candidateId = headerClinicId || queryClinicId;

  if (candidateId) {
    const exists = await db.clinic.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }

  // Fallback to the primary clinic
  const primaryClinic = await db.clinic.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return primaryClinic?.id || "default-clinic-id";
}
