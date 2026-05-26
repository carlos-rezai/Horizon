import { useState, useEffect } from "react";
import { StyledClock, StyledTime, StyledDate } from "./Clock.styles";

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

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const start = new Date();
    const msToNextMinute =
      (60 - start.getSeconds()) * 1_000 - start.getMilliseconds();
    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const weekday = WEEKDAYS[now.getDay()];
  const day = now.getDate();
  const month = MONTHS[now.getMonth()];
  const date = `${weekday}, ${day} ${month}`;

  return (
    <StyledClock>
      <StyledTime>{time}</StyledTime>
      <StyledDate>{date}</StyledDate>
    </StyledClock>
  );
}
