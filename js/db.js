import initSqlJs from '../lib/sql-wasm.js';
let db;


export async function initDB(rows) {
const SQL = await initSqlJs({ locateFile: file => `/lib/${file}` });
db = new SQL.Database();


db.run(`
CREATE TABLE rolls (
episode_number INTEGER,
timestamp TEXT,
player_name TEXT,
character_name TEXT,
roll_type TEXT,
stat TEXT,
roll_result INTEGER,
success TEXT,
advantage_state TEXT,
notes TEXT
);
`);


const insert = db.prepare(`INSERT INTO rolls VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);


for (const r of rows) {
insert.run([
r.episode_number ? Number(r.episode_number) : null,
r.timestamp,
r.player_name,
r.character_name,
r.roll_type,
r.stat,
r.roll_result ? Number(r.roll_result) : null,
r.success,
r.advantage_state,
r.notes
]);
}


insert.free();
}


export function runQuery(sql) {
if (!db) throw new Error('DB not initialized');
const res = db.exec(sql);
if (!res || res.length === 0) return { columns: [], values: [] };
return res[0];
}