async function fetchSheetData() {
    const sheetId = "YOUR_SHEET_ID";
    const apiKey = "AIzaSyCz_AC6LHVqZA-sQTjL198mZ53ZIEz4ynk";
    const range = "MASTER!A:J"; // adjust as needed
  
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  
    const response = await fetch(url);
    const data = await response.json();
  
    return data.values;   // [["Date","Rating","Category"],["2025-01-01","5","A"],...]
}

function transformData(values) {
    const headers = values[0];
    const rows = values.slice(1);
  
    const dates = rows.map(r => r[0]);
    const ratings = rows.map(r => Number(r[1]));
  
    return { dates, ratings };
}

async function drawChart() {
    const values = await fetchSheetData();
    const { dates, ratings } = transformData(values);
  
    new Chart(document.getElementById("myChart"), {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: "Ratings Over Time",
          data: ratings
        }]
      },
      options: {
        responsive: true,
        interaction: { mode: "index" },
      }
    });
  }
  
drawChart();
  