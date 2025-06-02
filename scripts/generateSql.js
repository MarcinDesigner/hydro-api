// scripts/generateSql.js
import { HYDRO_LEVELS } from './hydroLevels.js';
import fs from 'fs';

const sqlLines = HYDRO_LEVELS.map(station => {
  return `UPDATE stations SET warning_level = ${station.warningLevel}, alarm_level = ${station.alarmLevel} WHERE id = ${station.id};`;
});

const fileContent = sqlLines.join('\n');

fs.writeFileSync('hydro-levels.sql', fileContent);
console.log('✅ Plik hydro-levels.sql został wygenerowany.');