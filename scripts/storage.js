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

document.getElementById("exportBtn").addEventListener("click", () => {
  const dataStr = JSON.stringify(plantedCrops, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "cultivos.json";
  a.click();
  
  URL.revokeObjectURL(url);
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importInput").click();
});

document.getElementById("importInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);

      const saved = localStorage.getItem("plantedCrops");
      const currentData = saved ? JSON.parse(saved) : {};

      for (const season in importedData) {
        if (!currentData[season]) {
          currentData[season] = {};
        }

        for (const day in importedData[season]) {
          if (!currentData[season][day]) {
            currentData[season][day] = [];
          }
          currentData[season][day].push(...importedData[season][day]);
        }
      }

      localStorage.setItem("plantedCrops", JSON.stringify(currentData));
      Object.assign(plantedCrops, currentData);
      location.reload();
    } catch (error) {
      console.error("Error al importar los datos:", error);
    }
  };
  reader.readAsText(file);
});
