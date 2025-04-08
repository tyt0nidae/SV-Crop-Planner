import { seasonOrder, seasons, plantedCrops, currentSeason, crops } from "./crops.js";
import { capitalizeFirstLetter, getSeasonAndDay, getStardewDateFromAbsoluteDay } from "./utils.js";
import { savePlantedCrops } from "./storage.js";
import { openPlantModal } from "./modal.js";
import { events } from './events-data.js';

let calendarSeason = currentSeason;

export function clearMonth() {
  plantedCrops[calendarSeason] = {};
  savePlantedCrops();
  createCalendar(calendarSeason);
}

export function createCalendar(season) {
  calendarSeason = season;
  const days = seasons[season];
  const seasonEvents = events.filter(event => event.season === season);

  let calendarHTML = `<h2>${capitalizeFirstLetter(season)}</h2><div class="calendar-grid">`;

  days.forEach((day) => {
    const dayNumber = parseInt(day.split(' ')[1]);
    const eventsForDay = seasonEvents.filter(event => {
        const eventDays = Array.isArray(event.day) ? event.day : [event.day];
        return eventDays.includes(dayNumber);
      });

    const eventIcons = eventsForDay.map(event => `
      <div class="event-icon-container">
        <img src="${event.icon}" alt="${event.name}" class="event-icon" />
        <span class="event-name">${event.name}.</span>
      </div>
    `).join('');

    calendarHTML += `
      <div class="calendar-day" data-day="${day}">
        <div class="day-header"><span>${day}</span></div>
        <div class="crop-info"><div class="crop-more-container"></div></div>
        <div class="event-icons">${eventIcons}</div>
      </div>
    `;
  });

  calendarHTML += `</div>`;
  document.getElementById("calendar-container").innerHTML = calendarHTML;

  renderAllCrops(season);
  addCalendarListeners();
}

function addCalendarListeners() {
  const container = document.getElementById("calendar-container");

  container.addEventListener("click", (e) => {
    if (e.target.classList.contains("crop-more")) {
      const day = e.target.closest(".calendar-day");
      const isOpen = day.classList.toggle("open");
      e.target.textContent = isOpen ? "Ver menos" : "Ver más";
    }

    const clickedDay = e.target.closest(".calendar-day");
    if (clickedDay) openPlantModal(clickedDay.getAttribute("data-day"));
  });
}

function renderAllCrops(current) {
  const calendarCells = Array.from(document.querySelectorAll(".calendar-day"))
    .reduce((acc, el) => {
      acc[el.dataset.day] = el.querySelector(".crop-info");
      return acc;
    }, {});

  const printed = new Set();

  seasonOrder.forEach((season) => {
    const cropsInSeason = plantedCrops[season] || {};

    for (const [dayStr, data] of Object.entries(cropsInSeason)) {
        data.forEach((data, index) => {
            const crop = crops[data.cropKey];
            const plantDay = parseInt(dayStr.split(" ")[1]);
            const fertilizer = data.fertilizer;
            const growthModifier = crop.fertilizers?.[fertilizer] || 0;
            const growthTime = fertilizer ? crop.growthTime * (1 - growthModifier) : crop.growthTime;
          
            const plantedSeasonIdx = seasonOrder.indexOf(data.plantedSeason || season);
            const absoluteStart = (plantedSeasonIdx * 28) + plantDay;
            const harvestDay = absoluteStart + growthTime;
          
            let growthStageIndex = 0;
            let currentGrowthTime = 0;
          
            for (let i = 0; i <= growthTime; i++) {
              const totalDay = absoluteStart + i;
              const { season: targetSeason, day: dayInSeason } = getSeasonAndDay(totalDay);
          
              if (targetSeason === current) {
                const key = `${targetSeason}-${dayInSeason}-${crop.key}-${data.plantedSeason || season}-${plantDay}`;
                if (!printed.has(key)) {
                  const cell = calendarCells[`Día ${dayInSeason}`];
                  if (cell) {
                    const tag = createCropTag(crop, plantDay, harvestDay, i, totalDay, growthStageIndex);
                    cell.appendChild(tag);
                    printed.add(key);
                  }
                }
              }
          
              if (i >= currentGrowthTime + crop.growthStages[growthStageIndex]) {
                growthStageIndex++;
                currentGrowthTime = i;
              }
          
              if (growthStageIndex >= crop.growthStages.length) {
                growthStageIndex = crop.growthStages.length - 1;
              }
            }
            handleRegrowth(crop, harvestDay, data, printed, calendarCells, current);
          });          
    }
  });
}

function createCropTag(crop, plantDay, harvestDay, i, totalDay, stageIdx) {
  const tag = document.createElement("div");
  tag.className = "crop-tag";

  let imgSrc = "", growthText = "", showDetails = false;

  if (i === 0) {
    imgSrc = crop.icon;
    growthText = `Plantado: ${capitalizeFirstLetter(crop.plantedSeason || calendarSeason)} ${plantDay}<br/>Cosecha: ${getStardewDateFromAbsoluteDay(harvestDay)}`;
    showDetails = true;
  } else if (i < crop.growthTime) {
    imgSrc = crop.growthIcons?.[stageIdx];
    growthText = "Creciendo...";
  } else {
    imgSrc = crop.harvestIcon;
    growthText = "Listo para cosecha";
    showDetails = true;
  }

  if (imgSrc) {
    tag.innerHTML = `
      <div class="crop-info-wrapper">
        <img src="${imgSrc}" class="crop-icon" alt="${crop.name}" />
        <div class="crop-details">
          <span class="crop-name">${crop.name}</span>
          <span class="growth-status">${growthText}</span>
        </div>
      </div>
    `;
  }

  return tag;
}

function handleRegrowth(crop, harvestDay, cropData, printed, calendarCells, current) {
  let regrowthDay = harvestDay + crop.regrowthTime;

  while (regrowthDay <= seasonOrder.length * 28) {
    const { season, day } = getSeasonAndDay(regrowthDay);

    const prevSeasonIdx = seasonOrder.indexOf(season) - 1;
    const prevSeason = seasonOrder[prevSeasonIdx >= 0 ? prevSeasonIdx : seasonOrder.length - 1];

    if (crop.diesAtEndOf?.includes(prevSeason)) break;

    if (season === current) {
        const key = `${season}-${day}-${crop.key}-re-${cropData.plantedSeason || current}-${cropData.plantDay}`;
      if (!printed.has(key)) {
        const cell = calendarCells[`Día ${day}`];
        if (cell) {
          const tag = document.createElement("div");
          tag.className = "crop-tag";
          tag.innerHTML = `
            <div class="crop-info-wrapper">
              <img src="${crop.harvestIcon}" class="crop-icon" alt="${crop.name}" />
              <div class="crop-details">
                <span class="crop-name">${crop.name}</span>
                <span class="growth-status">Listo para recosecha</span>
              </div>
            </div>
          `;
          cell.appendChild(tag);
          printed.add(key);
        }
      }
    }
    regrowthDay += crop.regrowthTime;
  }
}