import { Cast } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import supabase from "@/lib/supabase";
import { schedule } from "node-cron";
import client from "@/lib/neynar";
import openai from "@/lib/openai";
import dayjs from "@/lib/dayjs";

/** Cron job should run once per hour */
const interval = "0 * * * *";

console.log("[HOURLY] Starting hourly indexer");

schedule(interval, async () => {
  /** What was the time of the last cast? */
  const res = await supabase
    .from("indexer_counter")
    .select("id, last_ran_at") // get id and last ran at
    .single();

  const timestamp = res.data?.last_ran_at
    ? dayjs(res.data?.last_ran_at).format()
    : dayjs()
        .subtract(1, "hour")
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0)
        .valueOf();
  const last_ran_at = dayjs().valueOf();

  let user_cursor = undefined;

  console.log(`[HOURLY] Fetching casts since timestamp ${timestamp}`);

  do {
    /** Grab the page of power badge users */
    const { users, next } = await client.fetchPowerUsers({
      cursor: user_cursor,
      limit: 100,
    });

    /** Iterate over each user */
    for (const fid of users.map((u) => u.fid)) {
      let cast_cursor = undefined;

      console.log(`[HOURLY] Processing user ${fid}`);

      do {
        /** Grab the page of casts */
        const { casts, next } = await client.fetchCastsForUser(fid, {
          cursor: cast_cursor,
          limit: 50,
        });

        /** How many casts were before the timestamp? */
        const before =
          casts.filter((cast) => dayjs(cast.timestamp).isBefore(timestamp)) ??
          [];

        /** How many casts were after the timestamp? */
        const after =
          casts.filter((cast) => dayjs(cast.timestamp).isAfter(timestamp)) ??
          [];

        if (after.length > 0) {
          /** Map over all and generate embeddings */
          const embeddings = await Promise.all(after.map(_embedCast));

          /** Save the embeddings and casts to the database */
          await supabase.from("casts").upsert(
            after.map((cast, i) => ({
              hash: cast.hash,
              embedding: embeddings[i],
              fid,
              timestamp: dayjs(cast.timestamp).valueOf(),
            }))
          );

          console.log(
            `Processed ${after.length} casts ${
              before.length === 0
                ? "(all casts in list were after, so fetching next page)"
                : ""
            }`
          );
        }

        /** Only fetch a new page if there are casts before */
        cast_cursor = before.length === 0 ? next.cursor : undefined;
      } while (cast_cursor);
    }

    console.log(`Processed ${users.length} users`);

    /** Go to the next page */
    user_cursor = next.cursor;
  } while (user_cursor);

  /** Update the last ran at timestamp */
  if (res.data) {
    await supabase
      .from("indexer_counter")
      .update({ last_ran_at })
      .eq("id", res.data?.id);
  } else {
    await supabase.from("indexer_counter").insert({ last_ran_at });
  }

  /** Log the time it took to process */
  console.log(
    `[HOURLY] Finished processing in ${dayjs().diff(
      last_ran_at,
      "minute"
    )} minutes`
  );
});

async function _embedCast({ text }: Cast) {
  if (!text.trim()) {
    return [];
  }
  /** Grab the text and embed it */
  try {
    const res: any = await Promise.race([
      openai.embeddings.create({
        input: text,
        model: "text-embedding-3-small",
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      ),
    ]);

    return res.data[0].embedding;
  } catch (e) {
    return [];
  }
}
