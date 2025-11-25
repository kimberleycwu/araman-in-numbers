import { runQuery } from './db.js';
import { renderBar } from './charts.js';

export function setupUI() {
  const epSelect = document.getElementById('episodeSelector');
  const chartSelect = document.getElementById('chartSelect');
  const canvas = document.getElementById('mainChart');
  const ctx = canvas.getContext('2d');

  // Populate episode selector
  const episodes = runQuery('SELECT DISTINCT episode_number FROM rolls ORDER BY episode_number');
  const epValues = (episodes.values || []).map(r => r[0]).filter(v => v !== null);
  epValues.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e;
    opt.textContent = `Episode ${e}`;
    epSelect.appendChild(opt);
  });

  function render() {
    const episode = epSelect.value;
    const chart = chartSelect.value;

    // choose SQL and render
    if (chart === 'avgByPlayer') {
      let sql = `SELECT player_name, AVG(CAST(roll_result AS FLOAT)) AS avg_roll FROM rolls`;
      if (episode !== 'all') sql += ` WHERE episode_number = ${episode}`;
      sql += ' GROUP BY player_name ORDER BY avg_roll DESC;';

      const res = runQuery(sql);
      const labels = (res.values || []).map(r => r[0]);
      const values = (res.values || []).map(r => Number(r[1]));
      renderBar(ctx, labels, values, 'Average Roll');

    } else if (chart === 'successByType') {
      let sql = `SELECT roll_type, SUM(CASE WHEN success='TRUE' THEN 1 ELSE 0 END) AS succ, COUNT(*) AS total FROM rolls`;
      if (episode !== 'all') sql += ` WHERE episode_number = ${episode}`;
      sql += ' GROUP BY roll_type;';

      const res = runQuery(sql);
      const labels = (res.values || []).map(r => r[0]);
      const values = (res.values || []).map(r => {
        const succ = Number(r[1]);
        const tot = Number(r[2]);
        return tot === 0 ? 0 : Math.round((succ / tot) * 100);
      });
      renderBar(ctx, labels, values, 'Success Rate (%)');

    } else if (chart === 'distribution') {
      let sql = `SELECT roll_result, COUNT(*) as cnt FROM rolls`;
      if (episode !== 'all') sql += ` WHERE episode_number = ${episode}`;
      sql += ' GROUP BY roll_result ORDER BY roll_result;';

      const res = runQuery(sql);
      const labels = (res.values || []).map(r => r[0]);
      const values = (res.values || []).map(r => Number(r[1]));
      renderBar(ctx, labels, values, 'Count');
    }
  }

  epSelect.addEventListener('change', render);
  chartSelect.addEventListener('change', render);

  // initial render
  render();
}