// Archivo: frontend/src/components/consola/GraficaHoras.jsx
import { useEffect, useRef } from 'react';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export default function GraficaHoras({ porHora = [] }) {
  const canvas = useRef(null);
  const grafica = useRef(null);

  useEffect(() => {
    const etiquetas = porHora.map((p) => p.hora);
    const valores = porHora.map((p) => p.total);

    if (!grafica.current) {
      grafica.current = new Chart(canvas.current, {
        data: {
          labels: etiquetas,
          datasets: [
            { type: 'bar', label: 'Tickets atendidos', data: valores, backgroundColor: '#1f2d6b', borderRadius: 3 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300 },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          plugins: { legend: { display: false } },
        },
      });
    } else {
      grafica.current.data.labels = etiquetas;
      grafica.current.data.datasets[0].data = valores;
      grafica.current.update();
    }
  }, [porHora]);

  useEffect(() => () => { grafica.current?.destroy(); grafica.current = null; }, []);

  return (
    <div className="runt-grafica">
      <canvas ref={canvas} role="img" aria-label="Tickets atendidos por hora" />
    </div>
  );
}
