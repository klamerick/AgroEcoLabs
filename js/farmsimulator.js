const farmSimulator = (function () {
  // Configurações básicas
  const gridSize = 10;
  const farmGrid = [];
  let mode = "plant";
  let selectedCrop = null;
  let money = 100.00;
  let biodiversity = 100;
  let soilHealth = 80.0;
  let waterLevel = 100.0;
  let podeColetarChuva = true;
  let solarPanels = 0;
  let currentDay = 0;
  let inventory = {
    milho: 5,
    feijao: 5,
    alface: 5,
    tomate: 5,
    abobora: 5,
    cenoura: 5,
    espinafre: 5
  };

  // Elementos do DOM
  const grid = document.getElementById("farm-grid");
  const soilSpan = document.getElementById("soil-health-bar");
  const waterSpan = document.getElementById("water-level-bar");
  const biodiversitySpan = document.getElementById("biodiversity-bar");
  const moneySpan = document.getElementById("money");
  const seasonSpan = document.getElementById("current-season");
  const daySpan = document.getElementById("current-day");
  const solarSpan = document.getElementById("solar-panels");
  const inventoryDisplay = document.getElementById("inventory-display");

  // Sistema de estações
  const seasons = {
    spring: {
      name: "Primavera",
      duration: 30,
      growthModifier: 1.2,
      color: '#a8e6cf',
      suitableCrops: ['alface', 'feijao', 'espinafre']
    },
    summer: {
      name: "Verão",
      duration: 30,
      growthModifier: 1.5,
      color: '#f7d486',
      suitableCrops: ['milho', 'tomate']
    },
    autumn: {
      name: "Outono",
      duration: 30,
      growthModifier: 0.8,
      color: '#e8a87c',
      suitableCrops: ['abobora', 'cenoura']
    },
    winter: {
      name: "Inverno",
      duration: 30,
      growthModifier: 0.5,
      color: '#d4f1f9',
      suitableCrops: ['alface', 'espinafre']
    }
  };

  let currentSeason = 'spring';

  // Sistema de loja
  const shopItems = {
    seeds: {
      milho: { price: 5, displayName: "Semente de Milho", description: "Cresce rápido no verão" },
      feijao: { price: 4, displayName: "Semente de Feijão", description: "Ideal para primavera" },
      alface: { price: 3, displayName: "Semente de Alface", description: "Cresce na primavera e inverno" },
      tomate: { price: 6, displayName: "Semente de Tomate", description: "Adora o verão" },
      abobora: { price: 8, displayName: "Semente de Abóbora", description: "Perfeita para o outono" },
      cenoura: { price: 4, displayName: "Semente de Cenoura", description: "Boa para o outono" },
      espinafre: { price: 5, displayName: "Semente de Espinafre", description: "Cresce no inverno" }
    },
    upgrades: {
      solarPanel: { 
        price: 200, 
        displayName: "Painel Solar", 
        description: "Reduz o consumo de água em 5% por painel (máx 50%)",
        max: 10
      },
      irrigation: {
        price: 150,
        displayName: "Sistema de Irrigação",
        description: "Reduz a perda de água diária em 20%",
        purchased: false
      },
      greenhouse: {
        price: 500,
        displayName: "Estufa",
        description: "Reduz o efeito negativo das estações em 50%",
        purchased: false
      }
    },
    animals: {
      chicken: {
        price: 30,
        displayName: "Galinha",
        description: "Produz ovos a cada 3 dias (Lucro: $5)"
      },
      cow: {
        price: 100,
        displayName: "Vaca",
        description: "Produz leite a cada 5 dias (Lucro: $15)"
      }
    }
  };

  // Preços de venda base
  const baseSellPrices = {
    milho: 10,
    feijao: 8,
    alface: 6,
    tomate: 12,
    abobora: 15,
    cenoura: 7,
    espinafre: 9,
    eggs: 5,
    milk: 15
  };

  // Sistema de animais
  let ownedAnimals = [];

  // Eventos climáticos
  const weatherEvents = [
    {
      name: "Seca",
      probability: 0.1,
      effect: () => {
        waterLevel = Math.max(0, waterLevel - 30);
        showNotification("Seca intensa! Níveis de água diminuídos.");
      }
    },
    {
      name: "Chuva Forte",
      probability: 0.15,
      effect: () => {
        waterLevel = Math.min(waterLevel + 40, 100);
        showNotification("Chuva forte! Tanques de água recarregados.");
      }
    },
    {
      name: "Praga",
      probability: 0.1,
      effect: () => {
        const maturePlants = farmGrid.filter(cell => 
          cell.dataset.state !== "empty" && cell.dataset.growth >= 3
        );
        
        if (maturePlants.length > 0) {
          const plantsToRemove = Math.min(
            Math.floor(Math.random() * 3) + 1,
            maturePlants.length
          );
          
          for (let i = 0; i < plantsToRemove; i++) {
            const randomIndex = Math.floor(Math.random() * maturePlants.length);
            const cell = maturePlants[randomIndex];
            cell.dataset.state = "empty";
            cell.dataset.growth = "0";
            cell.className = "farm-cell";
            maturePlants.splice(randomIndex, 1);
          }
          showNotification(`Praga destruiu ${plantsToRemove} plantações maduras!`);
        }
      }
    },
    {
      name: "Tempo Perfeito",
      probability: 0.05,
      effect: () => {
        farmGrid.forEach(cell => {
          if (cell.dataset.state !== "empty") {
            let growth = parseFloat(cell.dataset.growth || "0");
            growth += 0.5 * seasons[currentSeason].growthModifier;
            cell.dataset.growth = Math.min(growth, 3).toString();
            atualizarFaseVisual(cell);
          }
        });
        showNotification("Tempo perfeito! Plantas cresceram mais rápido.");
      }
    }
  ];

  // Funções principais
  function createGrid() {
    farmGrid.length = 0;
    grid.innerHTML = "";
    for (let i = 0; i < gridSize * gridSize; i++) {
      const cell = document.createElement("div");
      cell.classList.add("farm-cell");
      cell.dataset.state = "empty";
      cell.dataset.growth = "0";
      grid.appendChild(cell);
      farmGrid.push(cell);
      cell.dataset.index = i;
      cell.title = `Célula ${i + 1}`;
    }
  }

  function bindEvents() {
    grid.addEventListener("click", (e) => {
      if (e.target.classList.contains("farm-cell")) {
        if (mode === "plant") {
          plantCrop(e.target);
        } else if (mode === "harvest") {
          harvestSingle(e.target);
        }
      }
    });

    document.getElementById("plant-mode").addEventListener("click", () => {
      mode = "plant";
      updateModeIndicator();
    });
    
    document.getElementById("harvest-mode").addEventListener("click", () => {
      mode = "harvest";
      updateModeIndicator();
    });
    
    document.getElementById("water-button").addEventListener("click", water);
    document.getElementById("compost-button").addEventListener("click", compost);
    document.getElementById("next-day-button").addEventListener("click", nextDay);
    document.getElementById("collect-rain-button").addEventListener("click", coletarAguaChuva);
    document.getElementById("open-shop-button").addEventListener("click", openShop);
    document.querySelector(".close-shop").addEventListener("click", closeShop);
  }

  function updateModeIndicator() {
    document.getElementById("plant-mode").classList.toggle("active", mode === "plant");
    document.getElementById("harvest-mode").classList.toggle("active", mode === "harvest");
  }

  function plantCrop(cell) {
    if (!selectedCrop) {
      showNotification("Selecione uma semente no inventário!");
      return;
    }
    
    if (cell.dataset.state !== "empty") return;

    const season = seasons[currentSeason];
    if (!season.suitableCrops.includes(selectedCrop)) {
      showNotification(`Esta cultura não cresce bem na ${season.name.toLowerCase()}!`);
      return;
    }

    if (inventory[selectedCrop] > 0) {
      cell.className = "farm-cell";
      cell.dataset.state = selectedCrop;
      cell.dataset.growth = "0";
      cell.classList.add(selectedCrop, "fase0", "planted");
      inventory[selectedCrop]--;
      soilHealth -= 1;
      updateStatus();
      setTimeout(() => cell.classList.remove("planted"), 400);
      updateInventoryDisplay();
    } else {
      showNotification("Você não tem sementes suficientes!");
    }
  }

  function water() {
    if (waterLevel > 0) {
      const waterConsumption = 10 * (1 - Math.min(solarPanels * 0.05, 0.5));
      waterLevel -= waterConsumption;
      
      soilHealth += 2;
      farmGrid.forEach((cell) => {
        if (cell.dataset.state !== "empty") {
          let growth = parseFloat(cell.dataset.growth || "0");
          if (growth < 3) {
            let growthModifier = seasons[currentSeason].growthModifier;
            if (shopItems.upgrades.greenhouse.purchased) {
              growthModifier = 1 + (growthModifier - 1) * 0.5;
            }
            
            const growthAmount = growthModifier > 1 ? 1.5 : 1;
            growth += growthAmount;
            cell.dataset.growth = Math.min(growth, 3).toString();
            atualizarFaseVisual(cell);
          }
        }
      });
      updateStatus();
    } else {
      alert("Sem água suficiente!");
    }
  }

  function atualizarFaseVisual(cell) {
    const estado = cell.dataset.state;
    const fase = cell.dataset.growth;
    cell.className = "farm-cell";
    cell.classList.add(estado, `fase${Math.floor(fase)}`);
    if (fase >= 3) {
      cell.classList.add("ready");
    } else {
      cell.classList.remove("ready");
    }
  }

  function compost() {
    if (money >= 15) {
      soilHealth = Math.min(soilHealth + 10, 100);
      money -= 15;
      updateStatus();
      farmGrid.forEach((cell) => {
        if (cell.dataset.state !== "empty") {
          let growth = parseFloat(cell.dataset.growth || "0");
          if (growth < 3) {
            growth += 0.5;
            cell.dataset.growth = growth.toString();
            atualizarFaseVisual(cell);
          }
        }
      });
    } else {
      showNotification("Dinheiro insuficiente para compostagem!");
    }
  }

  function harvestSingle(cell) {
    if (cell.dataset.state !== "empty" && cell.dataset.growth >= 3) {
      const crop = cell.dataset.state;
      cell.className = "farm-cell";
      cell.dataset.state = "empty";
      cell.dataset.growth = "0";
      
      const soilBonus = 1 + (soilHealth - 50) / 100;
      const sellPrice = Math.round(baseSellPrices[crop] * soilBonus);
      
      money += sellPrice;
      soilHealth -= 2;
      cell.classList.add("harvested");
      setTimeout(() => cell.classList.remove("harvested"), 400);
      
      showNotification(`Você vendeu ${crop} por $${sellPrice}!`);
      updateStatus();
    }
  }

  function harvestAll() {
    let totalHarvested = 0;
    let cropsHarvested = {};
    
    farmGrid.forEach((cell) => {
      if (cell.dataset.state !== "empty" && cell.dataset.growth >= 3) {
        const crop = cell.dataset.state;
        cell.className = "farm-cell";
        cell.dataset.state = "empty";
        cell.dataset.growth = "0";
        
        const soilBonus = 1 + (soilHealth - 50) / 100;
        const sellPrice = Math.round(baseSellPrices[crop] * soilBonus);
        
        totalHarvested += sellPrice;
        cropsHarvested[crop] = (cropsHarvested[crop] || 0) + 1;
        soilHealth -= 2;
        cell.classList.add("harvested");
        setTimeout(() => cell.classList.remove("harvested"), 400);
      }
    });

    if (totalHarvested > 0) {
      money += totalHarvested;
      
      let harvestMessage = "Você colheu: ";
      for (const [crop, count] of Object.entries(cropsHarvested)) {
        harvestMessage += `${count} ${crop}, `;
      }
      harvestMessage = harvestMessage.slice(0, -2) + ` | Total: $${totalHarvested}`;
      
      showNotification(harvestMessage);
      updateStatus();
    }
  }

  function updateSeason() {
    currentDay++;
    daySpan.textContent = currentDay;

    const totalDays = Object.values(seasons).reduce((sum, s) => sum + s.duration, 0);
    const dayInCycle = currentDay % totalDays;

    let daysPassed = 0;
    for (const [season, data] of Object.entries(seasons)) {
      if (dayInCycle < daysPassed + data.duration) {
        if (currentSeason !== season) {
          currentSeason = season;
          seasonSpan.textContent = data.name;
          document.body.className = `${season}-effect`;
          showNotification(`Estação mudou para ${data.name}!`);
        }
        return;
      }
      daysPassed += data.duration;
    }
  }

  function checkWeather() {
    for (const event of weatherEvents) {
      if (Math.random() < event.probability) {
        event.effect();
        updateStatus();
        break;
      }
    }
  }

  function updateAnimalProduction() {
    ownedAnimals.forEach(animal => {
      animal.daysSinceLastProduction++;
      if (animal.daysSinceLastProduction >= animal.productionTime) {
        const sellPrice = Math.round(baseSellPrices[animal.produce] * (1 + (soilHealth - 50) / 100));
        money += sellPrice;
        animal.daysSinceLastProduction = 0;
        showNotification(`Seu ${animal.type} produziu ${animal.produce} e você vendeu por $${sellPrice}!`);
      }
    });
  }

  function buyItem(category, item) {
    const shopItem = shopItems[category][item];
    
    if (category === 'upgrades' && shopItem.max && 
        ((item === 'solarPanel' && solarPanels >= shopItem.max) || 
         (item !== 'solarPanel' && shopItem.purchased))) {
      showNotification(`Você já tem o máximo de ${shopItem.displayName} permitido!`);
      return;
    }
    
    if (money >= shopItem.price) {
      money -= shopItem.price;
      
      if (category === 'seeds') {
        inventory[item] = (inventory[item] || 0) + 5;
        showNotification(`Você comprou 5 ${shopItem.displayName}!`);
      } 
      else if (category === 'upgrades') {
        if (item === 'solarPanel') {
          solarPanels++;
          solarSpan.textContent = solarPanels;
        } else {
          shopItems.upgrades[item].purchased = true;
        }
        showNotification(`Você comprou ${shopItem.displayName}!`);
      }
      else if (category === 'animals') {
        ownedAnimals.push({
          type: item,
          daysSinceLastProduction: 0,
          produce: item === 'chicken' ? 'eggs' : 'milk',
          productionTime: item === 'chicken' ? 3 : 5
        });
        updateAnimalDisplay();
        showNotification(`Você comprou um(a) ${shopItem.displayName}!`);
      }
      
      updateStatus();
      updateInventoryDisplay();
    } else {
      showNotification("Dinheiro insuficiente!");
    }
  }

  function updateAnimalDisplay() {
    const animalPen = document.getElementById("animal-pen");
    animalPen.innerHTML = '';
    ownedAnimals.forEach(animal => {
      const animalDiv = document.createElement("div");
      animalDiv.className = `animal ${animal.type}`;
      animalDiv.title = `${animal.type} (Produz ${animal.produce} a cada ${animal.productionTime} dias)`;
      animalPen.appendChild(animalDiv);
    });
  }

  function openShop() {
    const shopContent = document.getElementById("shop-content");
    shopContent.innerHTML = '';
    
    addShopSection(shopContent, "🌱 Sementes", "seeds");
    addShopSection(shopContent, "⚙️ Melhorias", "upgrades");
    addShopSection(shopContent, "🐄 Animais", "animals");
    
    document.getElementById("shop-modal").style.display = "flex";
  }

  function addShopSection(container, title, category) {
    const section = document.createElement("div");
    section.className = "shop-section";
    
    const titleElement = document.createElement("h3");
    titleElement.textContent = title;
    section.appendChild(titleElement);
    
    for (const [item, details] of Object.entries(shopItems[category])) {
      const itemElement = document.createElement("div");
      itemElement.className = "shop-item";
      
      const nameElement = document.createElement("div");
      nameElement.className = "item-name";
      nameElement.textContent = details.displayName;
      
      const priceElement = document.createElement("div");
      priceElement.className = "item-price";
      priceElement.textContent = `$${details.price}`;
      
      const descElement = document.createElement("div");
      descElement.className = "item-desc";
      descElement.textContent = details.description;
      
      const buyButton = document.createElement("button");
      buyButton.textContent = "Comprar";
      buyButton.addEventListener("click", () => {
        buyItem(category, item);
      });
      
      itemElement.appendChild(nameElement);
      itemElement.appendChild(priceElement);
      itemElement.appendChild(descElement);
      itemElement.appendChild(buyButton);
      
      section.appendChild(itemElement);
    }
    
    container.appendChild(section);
  }

  function closeShop() {
    document.getElementById("shop-modal").style.display = "none";
  }

  function updateInventoryDisplay() {
    inventoryDisplay.innerHTML = '';
    
    for (const [crop, count] of Object.entries(inventory)) {
      if (count > 0) {
        const item = document.createElement("div");
        item.className = `inventory-item ${selectedCrop === crop ? 'selected' : ''}`;
        item.textContent = `${crop}: ${count}`;
        item.dataset.crop = crop;
        
        item.addEventListener("click", () => {
          selectedCrop = crop;
          document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          showNotification(`${crop} selecionado para plantio`);
        });
        
        inventoryDisplay.appendChild(item);
      }
    }
  }

  function coletarAguaChuva() {
    if (!podeColetarChuva) {
      alert("A chuva já foi coletada hoje. Tente novamente amanhã.");
      return;
    }
    waterLevel = Math.min(waterLevel + 50, 100);
    updateStatus();
    podeColetarChuva = false;
    showNotification("Você coletou 50% de água da chuva!");
  }

  function nextDay() {
    updateSeason();
    checkWeather();
    updateAnimalProduction();
    
    let waterLoss = 5;
    if (shopItems.upgrades.irrigation.purchased) {
      waterLoss *= 0.8;
    }
    waterLevel = Math.max(0, waterLevel - waterLoss);
    
    updateStatus();
    podeColetarChuva = true;
  }

  function updateStatus() {
    biodiversity = Math.min(100, soilHealth / 2 + (ownedAnimals.length * 5));

    moneySpan.textContent = money.toFixed(2);
    soilSpan.style.width = `${soilHealth}%`;
    waterSpan.style.width = `${waterLevel}%`;
    biodiversitySpan.style.width = `${biodiversity}%`;

    saveUserData();
  }

  function saveUserData() {
    const username = localStorage.getItem("lastUser") || "default";
    const data = {
      money,
      soilHealth,
      waterLevel,
      solarPanels,
      currentDay,
      ownedAnimals,
      inventory,
      gridState: farmGrid.map((c) => c.dataset.state),
      gridGrowth: farmGrid.map((c) => c.dataset.growth),
      upgrades: {
        irrigation: shopItems.upgrades.irrigation.purchased,
        greenhouse: shopItems.upgrades.greenhouse.purchased
      }
    };
    localStorage.setItem(`farm_${username}`, JSON.stringify(data));
  }

  function loadUserData(username) {
    const data = localStorage.getItem(`farm_${username}`);
    return data ? JSON.parse(data) : null;
  }

  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 1000);
    }, 3000);
  }

  function init(savedData = null) {
    createGrid();
    bindEvents();
    updateModeIndicator();

    if (savedData) {
      money = savedData.money || money;
      soilHealth = savedData.soilHealth || soilHealth;
      waterLevel = savedData.waterLevel || waterLevel;
      solarPanels = savedData.solarPanels || solarPanels;
      currentDay = savedData.currentDay || currentDay;
      ownedAnimals = savedData.ownedAnimals || [];
      inventory = savedData.inventory || inventory;
      
      if (savedData.upgrades) {
        shopItems.upgrades.irrigation.purchased = savedData.upgrades.irrigation || false;
        shopItems.upgrades.greenhouse.purchased = savedData.upgrades.greenhouse || false;
      }

      if (savedData.gridState) {
        savedData.gridState.forEach((state, i) => {
          const cell = farmGrid[i];
          cell.dataset.state = state;
          cell.dataset.growth = savedData.gridGrowth[i] || "0";
          if (state !== "empty") {
            cell.classList.add(state);
            atualizarFaseVisual(cell);
          }
        });
      }
    }

    updateStatus();
    updateInventoryDisplay();
    updateAnimalDisplay();

    setInterval(() => {
      let waterLoss = 0.5;
      if (shopItems.upgrades.irrigation.purchased) {
        waterLoss *= 0.8;
      }
      if (waterLevel > 0) waterLevel = Math.max(0, waterLevel - waterLoss);
      updateStatus();
    }, 60000);
  }

  return {
    init,
    buyAnimal: (type) => buyItem('animals', type),
    buySolarPanel: () => buyItem('upgrades', 'solarPanel'),
    coletarAguaChuva,
    nextDay,
    openShop,
    closeShop,
    harvestAll
  };
})();

// Inicialização quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("lastUser") || "Fazendeiro";
  const savedData = farmSimulator.loadUserData(username);
  farmSimulator.init(savedData);
});