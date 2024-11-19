import { getPowerBadgeUsers } from "./helpers/getPowerBadgeFids";
import { embedCast } from "@/indexer/helpers/embedCast";
import supabase from "@/lib/supabase";
import client from "@/lib/neynar";
import dayjs from "@/lib/dayjs";

const BACKFILL_CHUNK_SIZE = 10;

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
        /** Grab the page of casts */
        const { casts, next } = await client.fetchCastsForUser(fid, {
          cursor: user_cast_cursor,
          limit: 50,
        });

        /** Iterate over each cast */
        const embeddings = await Promise.all(casts.map(embedCast));

        /** Save the embeddings and casts to the database */
        await supabase.from("casts").upsert(
          casts.map((cast, i) => ({
            hash: cast.hash,
            embedding: embeddings[i],
            fid,
            timestamp: dayjs(cast.timestamp).valueOf(),
            text: cast.text,
          }))
        );

        /** Set cursor */
        user_cast_cursor = next.cursor;
        casts_indexed += casts.length;
      } while (user_cast_cursor);
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
