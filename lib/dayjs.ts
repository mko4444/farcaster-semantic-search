import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import isYesterday from "dayjs/plugin/isYesterday";
import minMax from "dayjs/plugin/minMax";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

/**
 * Extends the dayjs library with additional plugins for enhanced functionality.
 *
 * Plugins included:
 * - Advanced Format: Adds additional formatting tokens.
 * - Duration: Enables parsing and displaying duration.
 * - Is Today/Is Tomorrow/Is Yesterday: Adds methods to check if a date is today, tomorrow, or yesterday.
 * - Min Max: Provides min and max functions for dayjs instances.
 * - Relative Time: Allows displaying time differences in a human-readable format.
 * - Timezone: Adds timezone support.
 * - UTC: Enables UTC mode.
 */
dayjs.extend(advancedFormat);
dayjs.extend(duration);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(minMax);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);

export default dayjs;
export type { Dayjs };
