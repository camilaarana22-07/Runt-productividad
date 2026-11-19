// Archivo: frontend/src/components/consola/TarjetasKpi.jsx
import { formatMinutes } from '../../utils/format';
import { minutosMuertos } from '../../utils/productividad';

export default function TarjetasKpi({ metricas }) {
  const productividad = metricas?.productividad_pct ?? 0;
  const tiempo = metricas?.tiempo_laborado_pct ?? 0;
  const muertos = minutosMuertos(metricas);
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-4">
        <div className="runt-card runt-kpi">
          <div className="runt-kpi-titulo">Productividad</div>
          <div className="runt-kpi-valor">{Math.round(productividad)}%</div>
          <div className="runt-kpi-barra"><span className="barra-productividad" style={{ width: `${Math.min(100, productividad)}%` }} /></div>
          <div className="runt-kpi-nota">{metricas?.tickets ?? 0} de {metricas?.meta_tickets ?? 0} tickets de la meta</div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="runt-card runt-kpi">
          <div className="runt-kpi-titulo">Tiempo laborado</div>
          <div className="runt-kpi-valor">{Math.round(tiempo)}%</div>
          <div className="runt-kpi-barra"><span className="barra-tiempo" style={{ width: `${Math.min(100, tiempo)}%` }} /></div>
          <div className="runt-kpi-nota">{formatMinutes(metricas?.minutos_laborados || 0)} de {formatMinutes(metricas?.jornada_minutos || 0)} de jornada{muertos > 0 ? ` · ${formatMinutes(muertos)} muertos` : ''}</div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="runt-card runt-kpi text-center">
          <div className="runt-kpi-titulo">Cantidad tickets</div>
          <div className="runt-kpi-valor">{metricas?.tickets ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
