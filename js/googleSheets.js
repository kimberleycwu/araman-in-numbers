// Fetch Google Sheets values and normalize to array of objects
const SHEET_ID = '1LjfMcOchvEHakLe-UFtz2rM6hR-UtcRpK3iNWmOxkrg';
const API_KEY = 'YOUR_API_KEY_HERE'; // <<-- REPLACE THIS
const RANGE = 'Sheet1';


export async function fetchSheetData() {
const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
const res = await fetch(url);
if (!res.ok) throw new Error('Failed to fetch sheet: ' + res.statusText);
const json = await res.json();
if (!json.values || json.values.length < 2) throw new Error('No data found in sheet');


const headers = json.values[0];
const rows = json.values.slice(1);


return rows.map(r => {
const obj = {};
headers.forEach((h, i) => obj[h] = r[i] ?? null);
return obj;
});
}