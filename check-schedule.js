const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const [rows] = await conn.execute(
    'SELECT mid, name, mode, details FROM Monitors WHERE ke = ? ORDER BY name',
    ['63aaObjyC9']
  );
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  console.log('Dia:', dayOfWeek);
  console.log('Hora actual:', currentTime);
  console.log('');
  
  let dentroHorario = 0;
  let fueraHorario = 0;
  let sinHorario = 0;
  const camarasFuera = [];
  
  rows.forEach(cam => {
    const details = JSON.parse(cam.details || '{}');
    const schedule = details.areacam_schedule;
    
    if (cam.mode !== 'record') return;
    
    if (!schedule || !schedule[dayOfWeek]) {
      sinHorario++;
      return;
    }
    
    const daySchedule = schedule[dayOfWeek];
    const start = daySchedule.recordStart;
    const end = daySchedule.recordEnd;
    
    if (!start || !end) {
      fueraHorario++;
      camarasFuera.push(cam.name);
      return;
    }
    
    const isInSchedule = currentTime >= start && currentTime <= end;
    
    if (isInSchedule) {
      dentroHorario++;
    } else {
      fueraHorario++;
      camarasFuera.push(cam.name);
    }
  });
  
  console.log('Camaras FUERA de horario (deberian estar en deteccion):');
  camarasFuera.slice(0, 10).forEach(name => console.log('  -', name));
  if (camarasFuera.length > 10) {
    console.log('  ... y', camarasFuera.length - 10, 'mas');
  }
  
  console.log('');
  console.log('Resumen:');
  console.log('Dentro de horario (grabando):', dentroHorario);
  console.log('Fuera de horario (deteccion):', fueraHorario);
  console.log('Sin horario:', sinHorario);
  
  await conn.end();
})();
