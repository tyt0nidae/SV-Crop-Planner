import { createCalendar, clearMonth } from "./calendar.js";
import { loadPlantedCrops, savePlantedCrops } from "./storage.js";

document.getElementById("clear-month").addEventListener("click", clearMonth);

document.querySelectorAll(".seasonBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    savePlantedCrops();
    createCalendar(btn.getAttribute("data-season"));
  });
});

window.addEventListener("DOMContentLoaded", () => {
  loadPlantedCrops();
  createCalendar("primavera");
});
