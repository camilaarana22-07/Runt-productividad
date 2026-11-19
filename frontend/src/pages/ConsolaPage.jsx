// Archivo: frontend/src/pages/ConsolaPage.jsx
// Consola única RUNT 2.0: registro, jornada, indicadores, histórico y coordinación.
//  - Operador: ve y registra solo lo suyo.
//  - Líder: además elige a cualquier funcionario en el selector (auditoría, solo lectura),
//    ve el visor global, ajusta la jornada y descarga el Excel de todo el equipo.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import InactividadAviso from '../components/InactividadAviso';
import CalendarioLateral from '../components/consola/CalendarioLateral';
import ControlJornada from '../components/consola/ControlJornada';
import Encabezado from '../components/consola/Encabezado';
import FormularioRegistro from '../components/consola/FormularioRegistro';
import MiJornada from '../components/consola/MiJornada';
import PanelPestanas from '../components/consola/PanelPestanas';
import TarjetasKpi from '../components/consola/TarjetasKpi';
import ModuloCoordinacion from '../components/coordinacion/ModuloCoordinacion';
import useInactividad from '../hooks/useInactividad';
import { detenerParpadeo, iniciarParpadeo, sonarAlerta } from '../utils/alerta';
import { cargarEquipoDia, exportarConsolidado, exportarMensual } from '../utils/equipo';
import { canViewReports, formatMinutes, todayISO } from '../utils/format';
import { UMBRAL_INACTIVIDAD_MIN } from '../utils/productividad';

// 'interaccion': mouse/teclado en la consola reinician el contador (lo pedido).
// 'gestion': solo tickets y marcaciones lo reinician (útil si se trabaja en otra ventana).
const MODO_INACTIVIDAD = 'interaccion';

const horaActual = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

export default function ConsolaPage() {
  const { user, request, logout } = useAuth();
  const requestRef = useRef(request);
  requestRef.current = request;
  const api = useCallback((...args) => requestRef.current(...args), []);

  const esLider = canViewReports(user);
  const hoy = todayISO();

  const [fecha, setFecha] = useState(hoy);
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [usuarios, setUsuarios] = useState([user]);
  const [idSel, setIdSel] = useState(user.id_usuario);
  const [tipos, setTipos] = useState([]);
  const [datos, setDatos] = useState({ metricas: null, actividades: [], nombre: user.nombre_completo });
  const [equipo, setEquipo] = useState({ fecha: null, lista: [] });
  const [cargandoEquipo, setCargandoEquipo] = useState(false);
  const [actualizado, setActualizado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [aviso, setAviso] = useState(null);
  const secuencia = useRef(0);
  const inicioPendiente = useRef(null);
  const revisoAbierto = useRef(false);

  const esPropio = idSel === user.id_usuario;
  const esHoy = fecha === hoy;
  const editable = esPropio && esHoy;
  const metricas = datos.metricas;
  const estado = metricas?.estado?.estado || 'desconectado';
  const puedeTipificar = editable && Boolean(metricas?.estado?.puede_tipificar);

  const avisar = useCallback((tipo, texto) => setMensaje({ tipo, texto, id: Date.now() }), []);
  useEffect(() => {
    if (!mensaje) return undefined;
    const t = setTimeout(() => setMensaje(null), mensaje.tipo === 'danger' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [mensaje]);

  // ---------- Carga de datos del funcionario y fecha seleccionados ----------
  const cargarDatos = useCallback(async () => {
    const n = ++secuencia.current;
    let nuevo;
    if (idSel === user.id_usuario) {
      const [met, acts] = await Promise.all([
        api(`/jornada/metricas?fecha=${fecha}`),
        api(`/actividades?fecha=${fecha}`),
      ]);
      nuevo = { metricas: met, actividades: acts, nombre: user.nombre_completo };
    } else {
      const r = await api(`/reportes/jornada-usuario?id_usuario=${idSel}&fecha=${fecha}`);
      nuevo = { metricas: r.metricas, actividades: r.actividades, nombre: r.usuario.nombre_completo };
    }
    if (n === secuencia.current) setDatos(nuevo); // descarta respuestas viejas
    return nuevo;
  }, [api, idSel, fecha, user]);

  const cargarEquipo = useCallback(async () => {
    if (!esLider) return [];
    setCargandoEquipo(true);
    try {
      const lista = await cargarEquipoDia(api, fecha);
      setEquipo({ fecha, lista });
      setActualizado(horaActual());
      return lista;
    } finally {
      setCargandoEquipo(false);
    }
  }, [api, fecha, esLider]);

  const cargarUsuarios = useCallback(async () => {
    if (!esLider) return;
    const lista = await api('/reportes/usuarios');
    setUsuarios(lista.filter((u) => u.activo));
  }, [api, esLider]);

  // Arranque
  useEffect(() => {
    api('/actividades/tipos').then(setTipos).catch((e) => avisar('danger', e.message));
    cargarUsuarios().catch((e) => avisar('danger', e.message));
  }, [api, cargarUsuarios, avisar]);

  // Al cambiar funcionario o fecha, y cada minuto
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const d = await cargarDatos();
        // Si quedó un tiempo muerto abierto (p. ej. se cerró el navegador), se cierra al volver.
        if (!cancelado && !revisoAbierto.current && idSel === user.id_usuario && d.metricas?.inactivo_ahora) {
          revisoAbierto.current = true;
          const tm = await api('/jornada/tiempo-muerto', { method: 'POST', body: { accion: 'cierre' } });
          if (tm?.hora_fin) avisar('warning', `Se cerró un tiempo muerto pendiente de ${formatMinutes(tm.duracion_minutos)}.`);
          await cargarDatos();
        }
      } catch (e) {
        if (!cancelado) avisar('danger', e.message);
      }
    })();
    const intervalo = setInterval(() => cargarDatos().catch(() => {}), 60000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [cargarDatos, api, avisar, idSel, user.id_usuario]);

  // Equipo (solo líderes): al cambiar la fecha y cada minuto si es hoy
  useEffect(() => {
    if (!esLider) return undefined;
    cargarEquipo().catch((e) => avisar('danger', e.message));
    if (!esHoy) return undefined;
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') cargarEquipo().catch(() => {});
    }, 60000);
    return () => clearInterval(intervalo);
  }, [esLider, esHoy, cargarEquipo, avisar]);

  // ---------- Detector de tiempo muerto ----------
  const alDetectar = useCallback(async (minutos) => {
    inicioPendiente.current = api('/jornada/tiempo-muerto', { method: 'POST', body: { accion: 'inicio', minutos_inactivo: minutos } });
    try {
      const tm = await inicioPendiente.current;
      sonarAlerta();
      iniciarParpadeo();
      setAviso({ fase: 'detectado', minutos, desde: tm.hora_inicio });
      cargarDatos().catch(() => {});
    } catch (err) {
      reiniciarRef.current?.();
      setAviso({ fase: 'error', mensaje: `No se pudo registrar el tiempo muerto: ${err.message}` });
    } finally {
      inicioPendiente.current = null;
    }
  }, [api, cargarDatos]);

  const alRegresar = useCallback(async () => {
    detenerParpadeo();
    try {
      if (inicioPendiente.current) await inicioPendiente.current.catch(() => null);
      const tm = await api('/jornada/tiempo-muerto', { method: 'POST', body: { accion: 'cierre' } });
      if (tm?.hora_fin) setAviso({ fase: 'resumen', desde: tm.hora_inicio, hasta: tm.hora_fin, duracion: tm.duracion_minutos });
    } catch (err) {
      avisar('danger', err.message);
    }
    cargarDatos().catch(() => {});
  }, [api, cargarDatos, avisar]);

  const { registrarGestion, reiniciar } = useInactividad({
    activo: puedeTipificar,
    umbralMin: metricas?.config?.umbral_inactividad_min || UMBRAL_INACTIVIDAD_MIN,
    modo: MODO_INACTIVIDAD,
    onDetectar: alDetectar,
    onRegresar: alRegresar,
  });
  const reiniciarRef = useRef(reiniciar);
  reiniciarRef.current = reiniciar;
  useEffect(() => () => detenerParpadeo(), []);

  // ---------- Acciones ----------
  async function marcar(tipo, duracion) {
    setEnviando(true);
    try {
      const body = { tipo };
      if (duracion) body.duracion_break_minutos = duracion;
      const r = await api('/jornada/marcar', { method: 'POST', body });
      registrarGestion();
      avisar('success', r.mensaje);
    } catch (err) {
      avisar('danger', err.message);
    } finally {
      setEnviando(false);
      cargarDatos().catch(() => {});
      if (esLider) cargarEquipo().catch(() => {});
    }
  }

  async function registrarTicket(form) {
    if (!puedeTipificar) {
      avisar('danger', 'Marque INICIO TURNO (o cierre su break/almuerzo) antes de registrar tickets.');
      return false;
    }
    if (!form.codigo_referencia.trim() || !form.id_tipo_actividad) {
      avisar('warning', 'Complete Nro Ticket y Tipificación.');
      return false;
    }
    setEnviando(true);
    try {
      await api('/actividades', { method: 'POST', body: { ...form, id_tipo_actividad: Number(form.id_tipo_actividad) } });
      registrarGestion();
      avisar('success', `Ticket ${form.codigo_referencia.trim()} registrado.`);
      return true;
    } catch (err) {
      avisar('danger', err.message);
      return false;
    } finally {
      setEnviando(false);
      cargarDatos().catch(() => {});
    }
  }

  async function guardarJornada(horas) {
    try {
      const r = await api('/jornada/mi-jornada', { method: 'PUT', body: { horas } });
      avisar('success', r.mensaje);
    } catch (err) {
      avisar('danger', err.message);
    }
    cargarDatos().catch(() => {});
    if (esLider) cargarEquipo().catch(() => {});
  }

  async function descargarExcel(modo = 'dia') {
    setExportando(true);
    try {
      if (modo === 'mes') {
        const mes = fecha.slice(0, 7);
        const n = await exportarMensual(api, mes);
        avisar('success', `Excel mensual descargado (${mes}, ${n} funcionarios).`);
      } else {
        const lista = equipo.fecha === fecha ? equipo.lista : await cargarEquipo();
        const filas = await exportarConsolidado(api, fecha, lista);
        avisar('success', `Excel del día descargado (${lista.length} funcionarios, ${filas} filas).`);
      }
    } catch (err) {
      avisar('danger', err.message);
    } finally {
      setExportando(false);
    }
  }

  function motivoBloqueo() {
    if (!esPropio) return 'Modo auditoría: está viendo los registros de otro funcionario (solo lectura).';
    if (!esHoy) return 'Está consultando un día anterior (solo lectura).';
    return {
      desconectado: 'Marque INICIO TURNO para habilitar el registro de tickets.',
      inicio_break: 'Registro bloqueado durante el break.',
      inicio_almuerzo: 'Registro bloqueado durante el almuerzo.',
      fin_turno: 'El turno de hoy ya finalizó.',
    }[estado] || '';
  }

  const opcionesSelector = esLider ? usuarios : [user];

  return (
    <div className="runt-layout">
      <CalendarioLateral
        abierto={calendarioAbierto}
        fecha={fecha}
        hoy={hoy}
        onElegir={(f) => setFecha(f)}
      />

      <div className="runt-contenido">
        <Encabezado
          onMenu={() => setCalendarioAbierto((v) => !v)}
          usuarios={opcionesSelector}
          idSeleccionado={idSel}
          onSeleccionar={setIdSel}
          puedeElegir={esLider}
          fecha={fecha}
          metricas={metricas}
          usuarioSesion={user}
          onSalir={logout}
        />

        {!editable && (
          <div className="runt-aviso-lectura d-flex flex-wrap align-items-center gap-2">
            <span>{motivoBloqueo()}</span>
            <button
              type="button"
              className="btn btn-sm btn-runt ms-auto"
              onClick={() => { setIdSel(user.id_usuario); setFecha(hoy); }}
            >
              Volver a mi día de hoy
            </button>
          </div>
        )}

        <div className="row g-3">
          <div className="col-lg-4">
            <div className="runt-card">
              <div className="runt-card-head">📝 Formulario de Registro</div>
              <div className="runt-card-body">
                <FormularioRegistro
                  tipos={tipos}
                  habilitado={puedeTipificar}
                  motivoBloqueo={editable ? motivoBloqueo() : ''}
                  enviando={enviando}
                  onRegistrar={registrarTicket}
                />
                <hr className="my-4" />
                <ControlJornada
                  permitidas={metricas?.estado?.permitidas || []}
                  habilitado={editable}
                  enviando={enviando}
                  onMarcar={marcar}
                />
                {editable && (
                  <MiJornada
                    horasActuales={metricas?.jornada_horas}
                    habilitado={editable}
                    onGuardar={guardarJornada}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <TarjetasKpi metricas={metricas} />
            <PanelPestanas
              tickets={datos.actividades}
              metricas={metricas}
              fecha={fecha}
              nombreFuncionario={datos.nombre}
              esLider={esLider}
              exportando={exportando}
              onExcel={descargarExcel}
              coordinacion={esLider && (
                <ModuloCoordinacion
                  equipo={equipo.fecha === fecha ? equipo.lista : []}
                  cargando={cargandoEquipo}
                  actualizado={actualizado}
                  esHoy={esHoy}
                  onVer={(id) => { setIdSel(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onActualizar={() => cargarEquipo().catch((e) => avisar('danger', e.message))}
                />
              )}
            />
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="runt-toast" key={mensaje.id}>
          <div className={`alert alert-${mensaje.tipo} shadow mb-0 d-flex align-items-start gap-2`} role="status">
            <span className="flex-grow-1">{mensaje.texto}</span>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setMensaje(null)} />
          </div>
        </div>
      )}

      <InactividadAviso aviso={aviso} onCerrar={() => { setAviso(null); detenerParpadeo(); }} />
    </div>
  );
}
