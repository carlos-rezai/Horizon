import { useState, useEffect } from "react";
import {
  StyledClock,
  StyledTimeRow,
  StyledTime,
  StyledSeconds,
  StyledDate,
} from "./Clock.styles";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  // Tick every second so the dim seconds readout stays live (matches the
  // canonical prototype SidebarClock).
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(intervalId);
  }, []);

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const weekday = WEEKDAYS[now.getDay()];
  const day = now.getDate();
  const month = MONTHS[now.getMonth()];
  const date = `${weekday}, ${day} ${month}`;

  return (
    <StyledClock>
      <StyledTimeRow>
        <StyledTime>{time}</StyledTime>
        <StyledSeconds>:{seconds}</StyledSeconds>
      </StyledTimeRow>
      <StyledDate>{date}</StyledDate>
    </StyledClock>
  );
}
