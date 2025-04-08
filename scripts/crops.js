export const generateDays = () => Array.from({ length: 28 }, (_, i) => `Día ${i + 1}`);

export const seasons = {
  primavera: generateDays(),
  verano: generateDays(),
  otoño: generateDays(),
  invierno: generateDays(),
};

export const seasonOrder = ["primavera", "verano", "otoño", "invierno"];

export let plantedCrops = {
  primavera: {},
  verano: {},
  otoño: {},
  invierno: {},
};

export let currentSeason = "primavera";

import { crops } from "./crops-data.js";
export { crops };
