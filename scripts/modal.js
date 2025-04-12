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
              ${availableCrops.map(([key, crop]) => `<option value="${key}">${crop.name} (${crop.growthTime} días)</option>`).join('')}
            </select>
            <label for="fertilizer">Elige un fertilizante:</label>
            <select id="fertilizer"><option value="">Ninguno</option></select>
          </div>
          <p>Día seleccionado: <span id="selected-day">${day}</span></p>
          <p id="harvest-warning"></p>
          <div id="modal-list">
          <div id="planted-crops-list"></div>
          <div id="harvestable-crops-list"></div>
          </div>
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
    const season = getCalendarSeason();
    const diesAtEnd = crop.diesAtEndOf?.includes(season);
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

  const season = getCalendarSeason();

  plantButton.addEventListener("click", () => {
    const cropKey = cropSelect.value;
    const crop = crops[cropKey];
    const season = getCalendarSeason();
  
    if (!plantedCrops[season][day]) {
      plantedCrops[season][day] = [];
    }
  
    const plantedData = { cropKey, plantedSeason: season, fertilizer: selectedFertilizer };
    plantedCrops[season][day].push(plantedData);
  
    savePlantedCrops();
    createCalendar(season);
  
    renderPlantedCropsList(day, season);
  });
  

  updateFertilizerOptions(crops[cropSelect.value]);
  updateWarning();
  renderPlantedCropsList(day, season);
  renderHarvestableCropsList(day, season);
}

export function renderPlantedCropsList(day, season) {
  const listContainerId = "planted-crops-list";
  let container = document.getElementById(listContainerId);

  if (!container) {
    container = document.createElement("div");
    container.id = listContainerId;
    document.querySelector("#plant-section").appendChild(container);
  }

  container.innerHTML = "";

  const cropsForDay = plantedCrops[season]?.[day];

  if (!cropsForDay || cropsForDay.length === 0) {
    container.innerHTML = "<p>No hay cultivos plantados este día.</p>";
    return;
  }

  const cropMap = {};

  cropsForDay.forEach(entry => {
    const key = `${entry.cropKey}-${entry.fertilizer || "none"}`;
    if (!cropMap[key]) {
      cropMap[key] = { ...entry, count: 1 };
    } else {
      cropMap[key].count++;
    }
  });

  Object.entries(cropMap).forEach(([key, entry]) => {
    const crop = crops[entry.cropKey];
    const cropDiv = document.createElement("div");
    cropDiv.className = "crop-modal";

    const fertilizerBoost = crop.fertilizers?.[entry.fertilizer] || 0;
    const adjustedGrowthTime = Math.ceil(crop.growthTime * (1 - fertilizerBoost));
    const plantedDay = entry.plantedDayNumber ?? parseInt(day.split(" ")[1]);
    const harvestDayNum = plantedDay + adjustedGrowthTime;
    const harvestDayStr = `${season} ${harvestDayNum}`;

    cropDiv.innerHTML = `
      <span class="delete-crop-btn" 
            data-cropkey="${entry.cropKey}" 
            data-fertilizer="${entry.fertilizer || ''}">
        &times;
      </span>
      <img class="crop-icon-modal" src="${crop.icon}" alt="${crop.name}">
      <span class="crop-name-modal">${crop.name} (${entry.count})</span>
      ${entry.fertilizer ? `<span class="fertilizer-info">(Fertilizante: ${entry.fertilizer})</span>` : ""}
      <span class="harvest-info">Cosecha: ${harvestDayStr}</span>
    `;

    container.appendChild(cropDiv);
  });

  container.querySelectorAll(".delete-crop-btn").forEach(button => {
    const cropKey = button.dataset.cropkey;
    const fertilizer = button.dataset.fertilizer || "";
    const cropName = crops[cropKey].name;

    const plantedArray = plantedCrops[season]?.[day] || [];
    const sameCropEntries = plantedArray.filter(e => e.cropKey === cropKey && (e.fertilizer || "") === fertilizer);
    const cantidadActual = sameCropEntries.length;

    button.addEventListener("click", () => {
      showDeleteModal(cropName, cantidadActual, (cantidadEliminar) => {
        let eliminados = 0;
        plantedCrops[season][day] = plantedArray.filter(entryItem => {
          if (
            eliminados < cantidadEliminar &&
            entryItem.cropKey === cropKey &&
            (entryItem.fertilizer || "") === fertilizer
          ) {
            eliminados++;
            return false;
          }
          return true;
        });

        savePlantedCrops();
        createCalendar(getCalendarSeason());
        renderPlantedCropsList(day, season);
      });
    });
  });
}

function showDeleteModal(cropName, maxAmount, onConfirm) {
  document.querySelector(".delete-modal")?.remove();

  const modal = document.createElement("div");
  modal.className = "delete-modal";
  modal.innerHTML = `
    <div class="delete-modal-content">
      <p>¿Cuántos quieres eliminar? (Máx: ${maxAmount})</p>
      <input type="number" id="delete-amount" min="1" max="${maxAmount}" value="${maxAmount}" />
      <div class="modal-buttons">
        <button id="confirm-delete">Eliminar</button>
        <button id="cancel-delete">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("confirm-delete").addEventListener("click", () => {
    const value = parseInt(document.getElementById("delete-amount").value, 10);
    if (!isNaN(value) && value > 0 && value <= maxAmount) {
      onConfirm(value);
      modal.remove();
    }
  });

  document.getElementById("cancel-delete").addEventListener("click", () => {
    modal.remove();
  });
}

function renderHarvestableCropsList(day, season) {
  const containerId = "harvestable-crops-list";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.querySelector("#plant-section").appendChild(container);
  }

  container.innerHTML = "";

  const todayNumber = parseInt(day.split(" ")[1]);
  const groupedHarvestable = {};

  for (const [plantDay, cropsArray] of Object.entries(plantedCrops[season] || {})) {
    for (const entry of cropsArray) {
      const crop = crops[entry.cropKey];
      const fertilizerBoost = crop.fertilizers?.[entry.fertilizer] || 0;
      const growthTime = Math.ceil(crop.growthTime * (1 - fertilizerBoost));
      const plantedDay = entry.plantedDayNumber ?? parseInt(plantDay.split(" ")[1]);
      const harvestDay = plantedDay + growthTime;

      if (harvestDay === todayNumber) {
        const key = `${entry.cropKey}-${entry.fertilizer || "none"}`;
        if (!groupedHarvestable[key]) {
          groupedHarvestable[key] = {
            crop,
            fertilizer: entry.fertilizer,
            count: 0
          };
        }
        groupedHarvestable[key].count++;
      }
    }
  }

  const harvestableEntries = Object.values(groupedHarvestable);

  if (harvestableEntries.length === 0) {
    container.innerHTML = "<p>No hay cultivos listos para cosechar hoy.</p>";
    return;
  }

  for (const { crop, fertilizer, count } of harvestableEntries) {
    const item = document.createElement("div");
    item.className = "crop-modal";

    const cropKey = `${crop.name}-${fertilizer || "none"}-${todayNumber}`;
    const isChecked = localStorage.getItem(`harvested-${cropKey}`) === "true";

    item.innerHTML = `
      <input type="checkbox" class="harvest-checkbox" ${isChecked ? "checked" : ""}>
      <img class="crop-icon-modal" src="${crop.icon}" alt="${crop.name}">
      <span class="crop-name-modal">${crop.name}${count > 1 ? ` (${count})` : ""}</span>
      ${fertilizer ? `<span class="fertilizer-info">(Fertilizante: ${fertilizer})</span>` : ""}
      <span class="harvest-status">¡Listo para cosechar!</span>
    `;

    if (isChecked) item.classList.add("harvested");

    const checkbox = item.querySelector(".harvest-checkbox");
    checkbox.addEventListener("change", () => {
      const checked = checkbox.checked;
      localStorage.setItem(`harvested-${cropKey}`, checked);
      if (checked) {
        item.classList.add("harvested");
      } else {
        item.classList.remove("harvested");
      }
    });

    container.appendChild(item);
  }
}
