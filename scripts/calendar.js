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
        <div class="crop-info">
        <div class="crop-more-container"><button class="crop-more">+</div></div>
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
    const clickedContainer = e.target.closest(".crop-more-container");
    if (clickedContainer) {
      const clickedDay = e.target.closest(".calendar-day");
      if (clickedDay) openPlantModal(clickedDay.getAttribute("data-day"));
    }
  });
}

function renderAllCrops(current) {
  const calendarCells = Array.from(document.querySelectorAll(".calendar-day"))
    .reduce((acc, el) => {
      acc[el.dataset.day] = el.querySelector(".crop-info");
      return acc;
    }, {});

  const printed = new Set();
  const displayedIcons = {};

  seasonOrder.forEach((season) => {
    const cropsInSeason = plantedCrops[season] || {};

    Object.entries(cropsInSeason)
      .sort(([dayA], [dayB]) => {
        const dayAInt = parseInt(dayA.split(" ")[1]);
        const dayBInt = parseInt(dayB.split(" ")[1]);
        return dayAInt - dayBInt;
      })
      .forEach(([dayStr, data]) => {
        data.forEach((data) => {
          const crop = crops[data.cropKey];
          const plantDay = parseInt(dayStr.split(" ")[1]);
          const fertilizer = data.fertilizer;
          const growthModifier = crop.fertilizers?.[fertilizer] || 0;
          const growthTime = fertilizer ? crop.growthTime * (1 - growthModifier) : crop.growthTime;

          const plantedSeasonIdx = seasonOrder.indexOf(data.plantedSeason || season);
          const absoluteStart = (plantedSeasonIdx * 28) + plantDay;
          const harvestDay = absoluteStart + growthTime;

          handlePlanting(crop, plantDay, data, printed, calendarCells, current, harvestDay);
          handleGrowth(crop, plantDay, growthTime, absoluteStart, current, printed, calendarCells, displayedIcons);
          handleRegrowth(crop, harvestDay, data, printed, calendarCells, current);
        });
      });
  });
}

function createCropTag(crop, plantDay, harvestDay, i, totalDay, stageIdx) {
  const tag = document.createElement("div");
  tag.className = "crop-tag";

  let imgSrc = "", growthText = "", showDetails = false;

  if (i === 0 || i < crop.growthTime -1) {
    imgSrc = crop.growthIcons?.[stageIdx];
    growthText = "Creciendo...";
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

    // Si la cosecha muere al final de la temporada, salimos
    if (crop.diesAtEndOf?.includes(prevSeason)) break;

    // Si estamos en la temporada actual, mostramos recosecha
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

    // Incrementamos el día de recosecha
    regrowthDay += crop.regrowthTime;
  }

  // Si la cosecha ya está lista después de un ciclo de crecimiento
  if (harvestDay <= seasonOrder.length * 28) {
    const { season, day } = getSeasonAndDay(harvestDay);

    if (season === current) {
      const key = `${season}-${day}-${crop.key}-harvest-${cropData.plantedSeason || current}-${cropData.plantDay}`;
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
                <span class="growth-status">Listo para cosecha</span>
              </div>
            </div>
          `;
          cell.appendChild(tag);
          printed.add(key);
        }
      }
    }
  }
}

function handlePlanting(crop, plantDay, cropData, printed, calendarCells, current, harvestDay) {
  const plantTotalDay = (seasonOrder.indexOf(cropData.plantedSeason || current) * 28) + plantDay;
  const { season, day } = getSeasonAndDay(plantTotalDay);
  const prevSeasonIdx = seasonOrder.indexOf(season) - 1;
  const prevSeason = seasonOrder[prevSeasonIdx >= 0 ? prevSeasonIdx : seasonOrder.length - 1];
  
  if (crop.diesAtEndOf?.includes(prevSeason)) return;

  if (season === current) {
    const key = `${season}-${day}-${crop.key}-plant-${cropData.plantedSeason || current}-${cropData.plantDay}`;
    
    if (!printed.has(key)) {
      const cell = calendarCells[`Día ${day}`];
      if (cell) {
        const tag = document.createElement("div");
        tag.className = "crop-tag";
        tag.innerHTML = `
          <div class="crop-info-wrapper">
            <img src="${crop.icon}" class="crop-icon" alt="${crop.name}"/>
            <div class="crop-details">
              <span class="crop-name">${crop.name}</span>
              <span class="growth-status">Plantado: ${capitalizeFirstLetter(crop.plantedSeason || calendarSeason)} ${plantDay}<br/>Cosecha: ${getStardewDateFromAbsoluteDay(harvestDay)}</span>
            </div>
          </div>
        `;
        cell.appendChild(tag);
        printed.add(key);
        console.log(`Mostrando ${crop.name} en día ${day}, planted ${cropData.plantedSeason || current}`);
      }
    }
  }
}

async function handleGrowth(crop, plantDay, growthTime, absoluteStart, current, printed, calendarCells, displayedIcons) {
  let growthStageIndex = 0;
  let currentGrowthTime = 0;

  for (let i = 0; i < growthTime; i++) {
    const totalDay = absoluteStart + i + 1;
    const { season: targetSeason, day: dayInSeason } = getSeasonAndDay(totalDay);
    const stageType = 'growth';
    
    while (i >= currentGrowthTime + crop.growthStages[growthStageIndex] && growthStageIndex < crop.growthStages.length - 1) {
      growthStageIndex++;
      currentGrowthTime = i;
    }
  
    const key = `${crop.key}-${plantDay}-${absoluteStart}-${totalDay}-${growthStageIndex}`;
    const cell = calendarCells[`Día ${dayInSeason}`];
  
    if (targetSeason === current && i < growthTime - 1 && cell && !printed.has(key)) {
      if (!displayedIcons[dayInSeason]) {
        displayedIcons[dayInSeason] = new Set();
      }
  
      if (!displayedIcons[dayInSeason].has(key)) {
        console.log(`Mostrando ${crop.name} en día ${dayInSeason}, etapa ${growthStageIndex}`);
        const tag = createCropTag(crop, plantDay, absoluteStart + growthTime, i, totalDay, growthStageIndex);
  
        cell.appendChild(tag);
  
        displayedIcons[dayInSeason].add(key);
        printed.add(key);
      }
    }
  }
  
}

export function getCalendarSeason() {
  return calendarSeason;
}