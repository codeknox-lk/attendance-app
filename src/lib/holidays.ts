/**
 * Official Sri Lankan Public & Mercantile Holiday Dataset and Auto-Sync Engine
 * Covers 2026, 2027 (Pre-cached official gazette) and provides dynamic auto-fetch for 2028+
 */

export interface SriLankaHolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
  category: "Poya" | "Mercantile" | "Public" | "Bank";
  isDoubleOT: boolean;
}

// ─── 2026 Sri Lanka Official Gazetted Holidays ────────────────────────────────
export const SRI_LANKA_HOLIDAYS_2026: SriLankaHolidayItem[] = [
  { date: "2026-01-03", name: "Duruthu Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-01-15", name: "Tamil Thai Pongal Day", category: "Mercantile", isDoubleOT: true },
  { date: "2026-02-01", name: "Navam Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-02-04", name: "National Day (Independence Day)", category: "Mercantile", isDoubleOT: true },
  { date: "2026-02-15", name: "Maha Sivarathri Day", category: "Public", isDoubleOT: false },
  { date: "2026-03-03", name: "Medin Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-03-21", name: "Id-Ul-Fitr (Ramazan Festival Day)", category: "Mercantile", isDoubleOT: true },
  { date: "2026-04-02", name: "Bak Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-04-03", name: "Good Friday", category: "Public", isDoubleOT: false },
  { date: "2026-04-13", name: "Day prior to Sinhala & Tamil New Year Day", category: "Mercantile", isDoubleOT: true },
  { date: "2026-04-14", name: "Sinhala & Tamil New Year Day", category: "Mercantile", isDoubleOT: true },
  { date: "2026-05-01", name: "May Day (International Workers' Day)", category: "Mercantile", isDoubleOT: true },
  { date: "2026-05-01", name: "Vesak Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-05-02", name: "Day following Vesak Full Moon Poya Day", category: "Mercantile", isDoubleOT: true },
  { date: "2026-05-27", name: "Id-Ul-Alha (Hadji Festival Day)", category: "Public", isDoubleOT: false },
  { date: "2026-05-30", name: "Poson Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-06-29", name: "Esala Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-07-28", name: "Nikini Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-08-26", name: "Milad-Un-Nabi (Holy Prophet's Birthday)", category: "Mercantile", isDoubleOT: true },
  { date: "2026-08-27", name: "Binara Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-09-25", name: "Vap Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-10-25", name: "Il Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-11-08", name: "Deepavali Festival Day", category: "Mercantile", isDoubleOT: true },
  { date: "2026-11-23", name: "Unduvap Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2026-12-25", name: "Christmas Day", category: "Mercantile", isDoubleOT: true },
];

// ─── 2027 Sri Lanka Official Gazetted Holidays ────────────────────────────────
export const SRI_LANKA_HOLIDAYS_2027: SriLankaHolidayItem[] = [
  { date: "2027-01-15", name: "Tamil Thai Pongal Day", category: "Mercantile", isDoubleOT: true },
  { date: "2027-01-22", name: "Duruthu Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-02-04", name: "National Day (Independence Day)", category: "Mercantile", isDoubleOT: true },
  { date: "2027-02-21", name: "Navam Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-03-07", name: "Maha Sivarathri Day", category: "Public", isDoubleOT: false },
  { date: "2027-03-10", name: "Id-Ul-Fitr (Ramazan Festival Day)", category: "Mercantile", isDoubleOT: true },
  { date: "2027-03-22", name: "Medin Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-03-26", name: "Good Friday", category: "Public", isDoubleOT: false },
  { date: "2027-04-13", name: "Day prior to Sinhala & Tamil New Year Day", category: "Mercantile", isDoubleOT: true },
  { date: "2027-04-14", name: "Sinhala & Tamil New Year Day", category: "Mercantile", isDoubleOT: true },
  { date: "2027-04-20", name: "Bak Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-05-01", name: "May Day (International Workers' Day)", category: "Mercantile", isDoubleOT: true },
  { date: "2027-05-17", name: "Id-Ul-Alha (Hadji Festival Day)", category: "Public", isDoubleOT: false },
  { date: "2027-05-20", name: "Vesak Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-05-21", name: "Day following Vesak Full Moon Poya Day", category: "Mercantile", isDoubleOT: true },
  { date: "2027-06-18", name: "Poson Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-07-18", name: "Esala Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-08-16", name: "Nikini Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-08-16", name: "Milad-Un-Nabi (Holy Prophet's Birthday)", category: "Mercantile", isDoubleOT: true },
  { date: "2027-09-15", name: "Binara Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-10-14", name: "Vap Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-10-28", name: "Deepavali Festival Day", category: "Mercantile", isDoubleOT: true },
  { date: "2027-11-13", name: "Il Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-12-12", name: "Unduvap Full Moon Poya Day", category: "Poya", isDoubleOT: true },
  { date: "2027-12-25", name: "Christmas Day", category: "Mercantile", isDoubleOT: true },
];

/**
 * Fetch or resolve official Sri Lankan holidays for any given year.
 * - For 2026 & 2027: Instantly returns pre-cached official gazette.
 * - For 2028+: Queries open holiday API with algorithmic fallback.
 */
export async function getSriLankanHolidaysForYear(year: number): Promise<SriLankaHolidayItem[]> {
  if (year === 2026) return SRI_LANKA_HOLIDAYS_2026;
  if (year === 2027) return SRI_LANKA_HOLIDAYS_2027;

  // For 2028 and future years: Fetch dynamically from public Sri Lanka calendar feed
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/LK`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const apiHolidays = await res.json();
      if (Array.isArray(apiHolidays) && apiHolidays.length > 0) {
        return apiHolidays.map((h: { date: string; name?: string; localName?: string; types?: string[] }) => {
          const name = h.name || h.localName || "Public Holiday";
          const isPoya = name.toLowerCase().includes("poya");
          const isMercantile = (h.types && h.types.includes("Optional")) || isPoya || name.includes("New Year") || name.includes("Christmas") || name.includes("May Day");
          return {
            date: h.date,
            name,
            category: isPoya ? "Poya" : isMercantile ? "Mercantile" : "Public",
            isDoubleOT: isPoya || isMercantile,
          };
        });
      }
    }
  } catch {
    // Network or fetch error fallback
  }

  // Fallback for future years if external feed is unreachable:
  // Standard fixed national holidays
  return [
    { date: `${year}-01-15`, name: "Tamil Thai Pongal Day", category: "Mercantile", isDoubleOT: true },
    { date: `${year}-02-04`, name: "National Day", category: "Mercantile", isDoubleOT: true },
    { date: `${year}-04-13`, name: "Day prior to Sinhala & Tamil New Year", category: "Mercantile", isDoubleOT: true },
    { date: `${year}-04-14`, name: "Sinhala & Tamil New Year Day", category: "Mercantile", isDoubleOT: true },
    { date: `${year}-05-01`, name: "May Day", category: "Mercantile", isDoubleOT: true },
    { date: `${year}-12-25`, name: "Christmas Day", category: "Mercantile", isDoubleOT: true },
  ];
}
