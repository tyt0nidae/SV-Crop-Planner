import { plantedCrops } from "./crops.js";

export function loadPlantedCrops() {
  try {
    const saved = localStorage.getItem("plantedCrops");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(plantedCrops, parsed);
    }
  } catch (e) {
    console.error("Error al cargar los cultivos plantados:", e);
  }
}

export function savePlantedCrops() {
  try {
    localStorage.setItem("plantedCrops", JSON.stringify(plantedCrops));
  } catch (e) {
    console.error("Error al guardar los cultivos plantados:", e);
  }
}
