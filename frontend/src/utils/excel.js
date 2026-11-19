// Archivo: frontend/src/utils/excel.js
// Genera y descarga un .xlsx en el navegador. Requiere: npm install xlsx

import * as XLSX from 'xlsx';

export function downloadExcel(filename, rows, sheetName = 'Datos') {
  if (!rows || !rows.length) return;
  const hoja = XLSX.utils.json_to_sheet(rows);
  // Ancho de columna aproximado según el contenido
  const columnas = Object.keys(rows[0]);
  hoja['!cols'] = columnas.map((c) => ({
    wch: Math.min(50, Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)) + 2),
  }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, sheetName.slice(0, 31));
  XLSX.writeFile(libro, filename);
}

/** Crea un libro con varias hojas: [{ nombre, filas }]. */
export function downloadExcelHojas(filename, hojas) {
  const libro = XLSX.utils.book_new();
  const usados = new Set();
  for (const { nombre, filas } of hojas) {
    if (!filas || !filas.length) continue;
    const hoja = XLSX.utils.json_to_sheet(filas);
    const cols = Object.keys(filas[0]);
    hoja['!cols'] = cols.map((c) => ({
      wch: Math.min(50, Math.max(c.length, ...filas.map((r) => String(r[c] ?? '').length)) + 2),
    }));
    let titulo = (nombre || 'Hoja').slice(0, 31);
    let i = 2;
    while (usados.has(titulo.toLowerCase())) titulo = `${(nombre || 'Hoja').slice(0, 28)} ${i++}`;
    usados.add(titulo.toLowerCase());
    XLSX.utils.book_append_sheet(libro, hoja, titulo);
  }
  XLSX.writeFile(libro, filename);
}
