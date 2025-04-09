import { plantedCrops, currentSeason} from "./crops.js";
import { savePlantedCrops } from "./storage.js";
import { createCalendar } from "./calendar.js";
import { capitalizeFirstLetter, getStardewDateFromAbsoluteDay } from "./utils.js";
import { crops } from "./crops-data.js";
import { getCalendarSeason } from "./calendar.js";

export function openPlantModal(day) {
  document.querySelector(".modal")?.remove();

  const availableCrops = Object.entries(crops).filter(([_, crop]) =>
    crop.season?.includes(getCalendarSeason())
  );

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal">
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <section id="plant-section">
          <div class="label-content">
            <label for="crop">Elige un cultivo:</label>
            <select id="crop">
              ${availableCrops.map(([key, crop]) => `<option value="${key}">${crop.name}</option>`).join('')}
            </select>
            <label for="fertilizer">Elige un fertilizante:</label>
            <select id="fertilizer"><option value="">Ninguno</option></select>
          </div>
          <p>Día seleccionado: <span id="selected-day">${day}</span></p>
          <p id="harvest-warning" style="color: red; font-weight: bold;"></p>
          <button id="plant-button" type="button">Plantar</button>
        </section>
      </div>
    </div>
  `);

  const modal = document.querySelector(".modal");
  modal.style.display = "block";
  modal.querySelector(".close-btn").addEventListener("click", () => modal.remove());

  const cropSelect = document.getElementById("crop");
  const fertilizerSelect = document.getElementById("fertilizer");
  const warningText = document.getElementById("harvest-warning");
  const plantButton = document.getElementById("plant-button");
  let selectedFertilizer = "";

  function updateFertilizerOptions(crop) {
    fertilizerSelect.innerHTML = `<option value="">Ninguno</option>`;
    if (crop.fertilizers) {
      for (const [name, boost] of Object.entries(crop.fertilizers)) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (+${boost * 100}%)`;
        fertilizerSelect.appendChild(option);
      }
    }
  }

  function updateWarning() {
    const crop = crops[cropSelect.value];
    const dayNum = parseInt(day.split(" ")[1]);
    const daysLeft = 28 - dayNum + 1;
    const diesAtEnd = crop.diesAtEndOf?.includes(currentSeason);
    const firstHarvestLate = crop.growthTime > daysLeft;

    if (diesAtEnd && firstHarvestLate) {
      warningText.textContent = `⚠️ Este cultivo muere al final de temporada y no alcanzará a cosecharse si lo plantas el ${day}.`;
      plantButton.disabled = true;
    } else {
      warningText.textContent = "";
      plantButton.disabled = false;
    }
  }

  fertilizerSelect.addEventListener("change", e => {
    selectedFertilizer = e.target.value;
    updateWarning();
  });

  cropSelect.addEventListener("change", () => {
    updateFertilizerOptions(crops[cropSelect.value]);
    updateWarning();
  });

  plantButton.addEventListener("click", () => {
    const cropKey = cropSelect.value;
    const season = getCalendarSeason();
    if (!plantedCrops[season][day]) {
      plantedCrops[season][day] = [];
    }
  plantedCrops[season][day].push({ cropKey, plantedSeason: season, fertilizer: selectedFertilizer });

    savePlantedCrops();
    createCalendar(getCalendarSeason());
    modal.remove();
  });

  updateFertilizerOptions(crops[cropSelect.value]);
  updateWarning();
}