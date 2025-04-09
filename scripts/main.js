import { createCalendar, clearMonth } from "./calendar.js";
import { loadPlantedCrops, savePlantedCrops } from "./storage.js";
import './crops-data.js';
import './events-data.js';
import './calendar.js';
import './crops.js';
import './modal.js';
import './storage.js';
import './utils.js';

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
