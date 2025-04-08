import { seasonOrder } from "./crops.js";

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getSeasonAndDay(absDay) {
  const seasonIndex = Math.floor((absDay - 1) / 28);
  const dayInSeason = ((absDay - 1) % 28) + 1;
  return { season: seasonOrder[seasonIndex], day: dayInSeason };
}

export function getStardewDateFromAbsoluteDay(absDay) {
  const { season, day } = getSeasonAndDay(absDay);
  return `${capitalizeFirstLetter(season)} ${day}`;
}
