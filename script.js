// ===== CONFIGURATION =====
const SHEET_ID = "1LjfMcOchvEHakLe-UFtz2rM6hR-UtcRpK3iNWmOxkrg";
const API_KEY = "AIzaSyCz_AC6LHVqZA-sQTjL198mZ53ZIEz4ynk"; 
const RANGE = "MASTER"; // adjust if your sheet/tab name is different


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
// This assumes your sheet has structure like:
// Date | Value
// 2025-01-01 | 42
// 2025-01-02 | 50

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
// Average Roll Result by Player
// ==========================
  function groupAverageByPlayer(records) {
    const players = {};
  
    for (const r of records) {
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

// ==========================
// Render Chart.js Chart
// ==========================
async function renderChart() {
    const raw = await fetchSheetData();
    const records = transformData(raw);
    const { labels, values } = groupAverageByPlayer(records);
  
    new Chart(document.getElementById('mainChart'), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Average Roll Result",
          data: values,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

// DO NOT DELETE THIS
renderChart();