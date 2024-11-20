import { getPowerBadgeUsers } from "./helpers/getPowerBadgeFids";
import { embedCast } from "@/indexer/helpers/embedCast";
import supabase from "@/lib/supabase";
import client from "@/lib/neynar";
import dayjs from "@/lib/dayjs";
import { Cast } from "@neynar/nodejs-sdk/build/neynar-api/v2";

const BACKFILL_CHUNK_SIZE = 3;

export async function backfill() {
  let should_run = false;

  /** Check for an indexer counter */
  const res = await supabase
    .from("indexer_counter")
    .select("id, last_ran_at, init_ran_at") // get id and last ran at
    .single();

  /** If there is no indexer_counter, we should run the backfill */
  if (!res.data) {
    should_run = true;

    /** Create the indexer_counter */
    await supabase.from("indexer_counter").insert({
      last_ran_at: dayjs().valueOf(),
      init_ran_at: dayjs().valueOf(),
    });
  }

  /** Check if there are casts from before the backfill init time */
  const casts_before_init = await supabase
    .from("casts")
    .select("hash")
    .lt("timestamp", res.data?.init_ran_at);

  /** If there are no casts before the init_ran_at, we should run the backfill */
  if (casts_before_init.data?.length === 0) {
    should_run = true;
  }

  console.log("[BACKFILL] Check complete:", {
    count: casts_before_init.data?.length,
  });

  if (should_run) {
    const fids = await getPowerBadgeUsers();
    let users_indexed = 0;

    /** Function to index casts for a user */
    async function indexUserCasts(fid: number) {
      let user_cast_cursor = undefined;
      let casts_indexed = 0;

      do {
        /** Fetch casts with retry */
        let castsData: any;
        const maxRetries = 5; // Maximum number of retries
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
          try {
            castsData = await client.fetchCastsForUser(fid, {
              cursor: user_cast_cursor,
              limit: 50,
            });
            success = true; // If successful, exit the retry loop
          } catch (error: any) {
            attempt++;
            console.error(
              `Error fetching casts for fid ${fid}, attempt ${attempt}:`,
              error.message || error
            );
            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = Math.pow(2, attempt) * 1000; // 2^attempt seconds
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              console.error(
                `Failed to fetch casts for fid ${fid} after ${maxRetries} attempts. Skipping to next user.`
              );
              return; // Exit the function and proceed to the next fid
            }
          }
        }

        const { casts, next } = castsData;

        /** Embed and save casts */
        try {
          const embeddings = await Promise.all(casts.map(embedCast));

          /** Save the embeddings and casts to the database */
          await supabase.from("casts").upsert(
            casts.map((cast: Cast, i: number) => ({
              hash: cast.hash,
              embedding: embeddings[i],
              fid,
              timestamp: dayjs(cast.timestamp).valueOf(),
              text: cast.text,
            }))
          );
        } catch (error: any) {
          console.error(
            `Error processing casts for fid ${fid}:`,
            error.message || error
          );
          // Decide whether to continue or skip to next fid
          return;
        }

        /** Set cursor */
        user_cast_cursor = next.cursor;
        casts_indexed += casts.length;
      } while (user_cast_cursor);

      console.log(
        `[BACKFILL] Processed ${casts_indexed} casts for user ${fid}`
      );
    }

    /** Implement asyncPool to manage concurrency */
    async function asyncPool(
      poolLimit: number,
      array: number[],
      iteratorFn: any
    ) {
      const ret = []; // all the promises
      const executing: any = []; // the executing promises
      for (const item of array) {
        const p = iteratorFn(item);
        ret.push(p);
        const e = p.then(() => {
          // Remove the promise from executing when it's done
          executing.splice(executing.indexOf(e), 1);
        });
        executing.push(e);
        if (executing.length >= poolLimit) {
          // Wait for any of the promises to resolve
          await Promise.race(executing);
        }
      }
      // Wait for all the promises to finish
      return Promise.all(ret);
    }

    /** Process all fids with concurrency limit */
    await asyncPool(BACKFILL_CHUNK_SIZE, fids, async (fid: number) => {
      await indexUserCasts(fid);
      /** Increment the users indexed */
      users_indexed += 1;
      /** Log the progress */
      console.log(
        `[BACKFILL] Processed ${users_indexed}/${
          fids.length
        } users (fid ${fid} • ${((users_indexed / fids.length) * 100).toFixed(
          2
        )}% complete)`
      );
    });

    console.log(`[BACKFILL] Backfill complete`);
  }
}
