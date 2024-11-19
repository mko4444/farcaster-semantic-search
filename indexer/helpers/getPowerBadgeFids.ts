import client from "@/lib/neynar";

export async function getPowerBadgeUsers(): Promise<number[]> {
  let fids: number[] = [];
  let power_badge_cursor = undefined;

  /** Grab all power badge users */
  do {
    /** Grab the page of power badge users */
    const { users, next } = await client.fetchPowerUsers({
      cursor: power_badge_cursor,
      limit: 100,
    });

    /** Add all their fids to the list */
    fids.push(...users.map((u) => u.fid));

    /** Go to the next page */
    power_badge_cursor = next.cursor;
  } while (power_badge_cursor);

  console.log(`[BACKFILL] Found ${fids.length} users to backfill`);

  return fids;
}
