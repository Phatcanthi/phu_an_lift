"use client";

import { useEffect, useState } from "react";
import { toISO } from "./utils";

/** Today's date as `yyyy-mm-dd`, or null until the page is running in the browser (avoids a server/client mismatch). */
export function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(toISO(new Date())), []);
  return today;
}
