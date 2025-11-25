// ===== CONFIGURATION =====
const SHEET_ID = "1LjfMcOchvEHakLe-UFtz2rM6hR-UtcRpK3iNWmOxkrg";
const API_KEY = "AIzaSyCz_AC6LHVqZA-sQTjL198mZ53ZIEz4ynk"; 
const RANGE = "MASTER"; // adjust if your sheet/tab name is different

// ===== DATA STORAGE =====
let allRecords = [];
let chartInstances = {}; // Store Chart.js instances for efficient updates

// =========================
// Fetch Google Sheets Data
// =========================
async function fetchSheetData() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.values) {
    console.error("Sheet fetch failed:", data);
    return [];
  }

  return data.values; // returns a 2D array of rows
}

// ==========================
// Convert Sheet → Chart Data
// ==========================
function transformData(rows) {
  const header = rows[0];
  const entries = rows.slice(1);

  // Get dynamic column indices
  const ixEpisode = header.indexOf("episode_number");
  const ixTimestamp = header.indexOf("timestamp");
  const ixPlayer = header.indexOf("player_name");
  const ixCharacter = header.indexOf("character_name");
  const ixRollType = header.indexOf("roll_type");
  const ixStat = header.indexOf("stat");
  const ixResult = header.indexOf("roll_result");
  const ixSuccess = header.indexOf("success");
  const ixAdvantage = header.indexOf("advantage_state");
  const ixNotes = header.indexOf("notes");

  // Convert rows into JS objects
  const records = entries
    .filter(r => r.length > 1) // remove blank lines
    .map(r => ({
      episode: Number(r[ixEpisode]),
      timestamp: r[ixTimestamp],
      player: r[ixPlayer],
      character: r[ixCharacter],
      roll_type: r[ixRollType],
      stat: r[ixStat],
      result: Number(r[ixResult]),
      success: r[ixSuccess] === "TRUE",
      advantage: r[ixAdvantage],
      notes: r[ixNotes]
    }));

  return records;
}

// ==========================
// Episode Filtering
// ==========================
function getAvailableEpisodes(records) {
  const episodes = [...new Set(records.map(r => r.episode))]
    .filter(ep => !isNaN(ep) && ep > 0) // Filter valid episodes
    .sort((a, b) => a - b);
  return episodes;
}

function filterByEpisode(records, episodeNumber) {
  if (episodeNumber === 'all') return records;
  return records.filter(r => r.episode === Number(episodeNumber));
}

// ==========================
// Chart Data Calculation Functions
// ==========================

// Average Roll Result by Player
function groupAverageByPlayer(records) {
  const players = {};

  for (const r of records) {
    if (!r.player) continue; // Skip records without player
    if (!players[r.player]) {
      players[r.player] = { total: 0, count: 0 };
    }
    players[r.player].total += r.result;
    players[r.player].count += 1;
  }

  const labels = Object.keys(players);
  const values = labels.map(p => players[p].total / players[p].count);

  return { labels, values };
}

// Success Rate by Character
function groupSuccessRateByCharacter(records) {
  const characters = {};

  for (const r of records) {
    if (!r.character) continue; // Skip records without character
    if (!characters[r.character]) {
      characters[r.character] = { successes: 0, total: 0 };
    }
    characters[r.character].total += 1;
    if (r.success) {
      characters[r.character].successes += 1;
    }
  }

  const labels = Object.keys(characters);
  const values = labels.map(c => {
    const char = characters[c];
    return char.total > 0 ? (char.successes / char.total) * 100 : 0;
  });

  return { labels, values };
}

// ==========================
// Chart Configuration
// ==========================
const chartConfigs = [
  {
    id: 'chart1',
    canvasId: 'chart1',
    titleId: 'chart1-title',
    title: 'Average Roll Result by Player',
    transformFn: groupAverageByPlayer,
    chartType: 'bar',
    backgroundColor: 'rgba(54, 162, 235, 0.5)',
    borderColor: 'rgba(54, 162, 235, 1)',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        y: { 
          beginAtZero: true,
          title: {
            display: true,
            text: 'Average Roll Result'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  },
  {
    id: 'chart2',
    canvasId: 'chart2',
    titleId: 'chart2-title',
    title: 'Success Rate by Character',
    transformFn: groupSuccessRateByCharacter,
    chartType: 'bar',
    backgroundColor: 'rgba(75, 192, 192, 0.5)',
    borderColor: 'rgba(75, 192, 192, 1)',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        y: { 
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Success Rate (%)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  }
];

// ==========================
// Chart Rendering System
// ==========================

// Populate episode selector dropdown
function populateEpisodeSelector(records) {
  const selector = document.getElementById('episodeFilter');
  const episodes = getAvailableEpisodes(records);
  
  // Clear existing options except "All Episodes"
  while (selector.children.length > 1) {
    selector.removeChild(selector.lastChild);
  }
  
  episodes.forEach(ep => {
    const option = document.createElement('option');
    option.value = ep;
    option.textContent = `Episode ${ep}`;
    selector.appendChild(option);
  });
}

// Render or update a single chart
function renderChart(config, filteredRecords, episodeNumber) {
  const canvas = document.getElementById(config.canvasId);
  const titleEl = document.getElementById(config.titleId);
  
  if (!canvas || !titleEl) {
    console.error(`Chart elements not found for ${config.id}`);
    return;
  }
  
  // Update title with episode context
  const episodeLabel = episodeNumber === 'all' 
    ? 'All Episodes' 
    : `Episode ${episodeNumber}`;
  titleEl.textContent = `${config.title} (${episodeLabel})`;
  
  // Calculate chart data
  const chartData = config.transformFn(filteredRecords);
  
  // Check if chart already exists
  if (chartInstances[config.id]) {
    // Update existing chart (efficient)
    const chart = chartInstances[config.id];
    chart.data.labels = chartData.labels;
    chart.data.datasets[0].data = chartData.values;
    chart.data.datasets[0].label = config.title;
    chart.data.datasets[0].backgroundColor = config.backgroundColor;
    chart.data.datasets[0].borderColor = config.borderColor;
    chart.update();
  } else {
    // Create new chart
    chartInstances[config.id] = new Chart(canvas, {
      type: config.chartType,
      data: {
        labels: chartData.labels,
        datasets: [{
          label: config.title,
          data: chartData.values,
          borderWidth: 2,
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor
        }]
      },
      options: config.options
    });
  }
}

// Update all charts when episode changes
function updateAllCharts(episodeNumber) {
  const filteredRecords = filterByEpisode(allRecords, episodeNumber);
  
  chartConfigs.forEach(config => {
    renderChart(config, filteredRecords, episodeNumber);
  });
}

// ==========================
// Initialization
// ==========================
async function initialize() {
  try {
    const raw = await fetchSheetData();
    allRecords = transformData(raw);
    
    if (allRecords.length === 0) {
      console.error("No records found");
      return;
    }
    
    // Populate episode selector
    populateEpisodeSelector(allRecords);
    
    // Set up event listener
    document.getElementById('episodeFilter').addEventListener('change', (e) => {
      updateAllCharts(e.target.value);
    });
    
    // Initial render (default: all episodes)
    updateAllCharts('all');
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Initialize on page load
initialize();
