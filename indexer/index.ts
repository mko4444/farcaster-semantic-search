import { backfill } from "./backfill";
import { cron } from "./cron";

/** First, run the backfill to get all casts in the DB */
backfill();

/** Then, run the hourly indexer */
// cron();
