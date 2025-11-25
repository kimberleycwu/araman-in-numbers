let activeChart = null;


export function renderBar(ctx, labels, data, label = 'Value') {
if (activeChart) activeChart.destroy();


activeChart = new Chart(ctx, {
type: 'bar',
data: { labels, datasets: [{ label, data }] },
options: { responsive: true, maintainAspectRatio: false }
});
}


export function renderLine(ctx, labels, data, label = 'Value') {
if (activeChart) activeChart.destroy();


activeChart = new Chart(ctx, {
type: 'line',
data: { labels, datasets: [{ label, data, tension: 0.3 }] },
options: { responsive: true, maintainAspectRatio: false }
});
}