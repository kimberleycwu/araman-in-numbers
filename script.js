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

// Success and Failure Counts by Character (for grouped bar chart)
function groupSuccessRateByCharacter(records) {
  const characters = {};

  for (const r of records) {
    if (!r.character) continue; // Skip records without character
    if (!characters[r.character]) {
      characters[r.character] = { successes: 0, failures: 0 };
    }
    if (r.success) {
      characters[r.character].successes += 1;
    } else {
      characters[r.character].failures += 1;
    }
  }

  const labels = Object.keys(characters);
  const successValues = labels.map(c => characters[c].successes);
  const failureValues = labels.map(c => characters[c].failures);

  return { labels, successValues, failureValues };
}

// Count Rolls by Player
function countRollsByPlayer(records) {
  const players = {};

  for (const r of records) {
    if (!r.player) continue; // Skip records without player
    players[r.player] = (players[r.player] || 0) + 1;
  }

  const labels = Object.keys(players);
  const values = labels.map(p => players[p]);

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
    title: 'Successes and Failures by Character',
    transformFn: groupSuccessRateByCharacter,
    chartType: 'bar',
    isGrouped: true, // Flag to indicate this is a grouped bar chart
    successColor: 'rgba(75, 192, 192, 0.8)',   // Teal for successes
    failureColor: 'rgba(255, 99, 132, 0.8)',  // Red for failures
    successBorderColor: 'rgba(75, 192, 192, 1)',
    failureBorderColor: 'rgba(255, 99, 132, 1)',
    options: {
      indexAxis: 'y', // Horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        x: { 
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          },
          title: {
            display: true,
            text: 'Number of Rolls'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  },
  {
    id: 'chart3',
    canvasId: 'chart3',
    titleId: 'chart3-title',
    title: 'Total Rolls by Player',
    transformFn: countRollsByPlayer,
    chartType: 'doughnut',
    backgroundColor: [
      'rgba(255, 99, 132, 0.8)',   // Red
      'rgba(54, 162, 235, 0.8)',   // Blue
      'rgba(255, 206, 86, 0.8)',   // Yellow
      'rgba(75, 192, 192, 0.8)',   // Teal
      'rgba(153, 102, 255, 0.8)',  // Purple
      'rgba(255, 159, 64, 0.8)',   // Orange
      'rgba(199, 199, 199, 0.8)',  // Grey
      'rgba(83, 102, 255, 0.8)',   // Indigo
    ],
    borderColor: '#fff',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
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
  
  // Check if this is a grouped bar chart
  if (config.isGrouped) {
    // Handle grouped bar chart (e.g., successes and failures)
    if (chartInstances[config.id]) {
      // Update existing chart
      const chart = chartInstances[config.id];
      chart.data.labels = chartData.labels;
      chart.data.datasets[0].data = chartData.successValues;
      chart.data.datasets[1].data = chartData.failureValues;
      chart.update();
    } else {
      // Create new grouped chart
      chartInstances[config.id] = new Chart(canvas, {
        type: config.chartType,
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: 'Successes',
              data: chartData.successValues,
              borderWidth: 2,
              backgroundColor: config.successColor,
              borderColor: config.successBorderColor
            },
            {
              label: 'Failures',
              data: chartData.failureValues,
              borderWidth: 2,
              backgroundColor: config.failureColor,
              borderColor: config.failureBorderColor
            }
          ]
        },
        options: config.options
      });
    }
  } else {
    // Handle single dataset charts (bar, pie, doughnut)
    // Handle colors - pie charts need arrays, bar charts can use single values
    const backgroundColor = Array.isArray(config.backgroundColor)
      ? config.backgroundColor
      : config.backgroundColor;
    const borderColor = Array.isArray(config.borderColor)
      ? config.borderColor
      : config.borderColor;
    
    // For pie charts, ensure we have enough colors (cycle if needed)
    let finalBackgroundColor = backgroundColor;
    if (Array.isArray(backgroundColor) && chartData.labels.length > backgroundColor.length) {
      // Cycle through colors if we have more players than colors
      finalBackgroundColor = chartData.labels.map((_, i) => 
        backgroundColor[i % backgroundColor.length]
      );
    }
    
    // Check if chart already exists
    if (chartInstances[config.id]) {
      // Update existing chart (efficient)
      const chart = chartInstances[config.id];
      chart.data.labels = chartData.labels;
      chart.data.datasets[0].data = chartData.values;
      chart.data.datasets[0].label = config.title;
      chart.data.datasets[0].backgroundColor = finalBackgroundColor;
      chart.data.datasets[0].borderColor = borderColor;
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
            backgroundColor: finalBackgroundColor,
            borderColor: borderColor
          }]
        },
        options: config.options
      });
    }
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
