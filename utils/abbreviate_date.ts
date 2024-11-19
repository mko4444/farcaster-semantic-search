import dayjs from "@/lib/dayjs";

export const abbreviateDate = (ms: number | string) => {
  const t = dayjs(ms);
  const diff = (unit: any) => dayjs().diff(t, unit);
  const units = {
    year: "y",
    month: "mo",
    week: "w",
    day: "d",
    hour: "h",
    minute: "m",
  };

  for (const [unit, suffix] of Object.entries(units)) {
    const amount = diff(unit);
    if (amount > 0) return `${amount}${suffix}`;
  }
  return "now";
};
