/**
 * Script de verificación end-to-end en tiempo real contra la API viva de NaviPort.
 * Sigue exactamente las 5 fases del diagrama docs/FLUJO_ROLES_DIAGRAMA.md para los 4 roles.
 *
 * Uso: npx ts-node test/verify-live-flow.ts
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';

interface ApiEnvelope<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

interface StepResult {
  paso: number;
  fase: string;
  rol: string;
  metodo: string;
  endpoint: string;
  status: number;
  ok: boolean;
  detalle: string;
}

const resultados: StepResult[] = [];
let pasoCounter = 0;

function assertCondition(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function callApi<T = unknown>(
  fase: string,
  rol: string,
  method: string,
  path: string,
  opts: {
    token?: string;
    body?: unknown;
    formData?: FormData;
    expectedStatus?: number | number[];
    detalle?: string;
  } = {},
): Promise<{ status: number; body: ApiEnvelope<T> }> {
  pasoCounter += 1;
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  let fetchBody: BodyInit | undefined;
  if (opts.formData) {
    fetchBody = opts.formData;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  });

  const text = await res.text();
  let parsed: ApiEnvelope<T>;
  try {
    parsed = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(
      `Respuesta no-JSON en ${method} ${path} (HTTP ${res.status}): ${text}`,
    );
  }

  const expected = opts.expectedStatus ?? [200, 201];
  const expectedList = Array.isArray(expected) ? expected : [expected];
  const ok = expectedList.includes(res.status);

  resultados.push({
    paso: pasoCounter,
    fase,
    rol,
    metodo: method,
    endpoint: path,
    status: res.status,
    ok,
    detalle: opts.detalle ?? parsed.message ?? '',
  });

  if (!ok) {
    throw new Error(
      `Fallo en Paso ${pasoCounter} (${method} ${path}): esperaba HTTP ${expectedList.join('/')}, recibió ${res.status} -> ${JSON.stringify(parsed)}`,
    );
  }

  return { status: res.status, body: parsed };
}

async function main(): Promise<void> {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const puertoNombre = `Puerto E2E ${uniqueSuffix}`;
  const buqueImo = `IMO-99${uniqueSuffix}`;
  const viajeCodigo = `V-E2E-${uniqueSuffix}`;
  const contenedorCodigo = `#CN-E${uniqueSuffix.slice(-4)}`;
  const tempCorreo = `e2e.temp.${uniqueSuffix}@naviport.com`;
  const publicCorreo = `e2e.pub.${uniqueSuffix}@empresa.com`;

  console.log(`\n🚀 Iniciando verificación en tiempo real contra ${BASE_URL}\n`);

  // ==========================================================
  // FASE 0: Health Check
  // ==========================================================
  const health = await callApi<{ status: string }>(
    'Fase 0',
    'Público',
    'GET',
    '/health',
    { expectedStatus: 200 },
  );
  assertCondition(health.body.data.status === 'online', 'API debe estar online');

  // ==========================================================
  // FASE 1: ADMINISTRADOR
  // ==========================================================
  const adminLogin = await callApi<{
    accessToken: string;
    usuario: { id: string; rol: string };
  }>('Fase 1', 'admin', 'POST', '/auth/login', {
    body: { correo: 'admin@naviport.com', password: 'naviport123' },
    expectedStatus: 200,
    detalle: 'Login Admin + sesion en Redis',
  });
  const adminToken = adminLogin.body.data.accessToken;

  const puertosInit = await callApi<Array<{ _id: string; ciudad: string }>>(
    'Fase 1',
    'admin',
    'GET',
    '/puertos',
    { token: adminToken, expectedStatus: 200 },
  );
  const shanghai = puertosInit.body.data.find((p) => p.ciudad === 'Shanghai');
  const guayaquil = puertosInit.body.data.find(
    (p) => p.ciudad === 'Guayaquil',
  );
  assertCondition(
    Boolean(shanghai && guayaquil),
    'Deben existir puertos semilla Shanghai y Guayaquil',
  );

  const puertoCreado = await callApi<{ _id: string }>(
    'Fase 1',
    'admin',
    'POST',
    '/puertos',
    {
      token: adminToken,
      body: {
        nombre: puertoNombre,
        pais: 'ECU',
        ciudad: 'Manta',
        coordenadas: [-80.7089, -0.9676],
      },
      expectedStatus: 201,
    },
  );
  const puertoTempId = puertoCreado.body.data._id;

  await callApi('Fase 1', 'admin', 'PATCH', `/puertos/${puertoTempId}`, {
    token: adminToken,
    body: { nombre: `${puertoNombre} Actualizado` },
    expectedStatus: 200,
  });

  const buqueCreado = await callApi<{ _id: string }>(
    'Fase 1',
    'admin',
    'POST',
    '/buques',
    {
      token: adminToken,
      body: {
        nombre: `Buque E2E ${uniqueSuffix}`,
        imo: buqueImo,
        tipo: 'Portacontenedores',
        capacidadToneladas: 42000,
        bandera: 'Ecuador',
        capitan: 'Capt. E2E',
        estado: 'activo',
        estadoOperativo: 'en_puerto',
      },
      expectedStatus: 201,
    },
  );
  const buqueId = buqueCreado.body.data._id;

  await callApi('Fase 1', 'admin', 'PATCH', `/buques/${buqueId}`, {
    token: adminToken,
    body: { capitan: 'Capt. Andrade E2E' },
    expectedStatus: 200,
  });

  const buquesPag = await callApi<{
    items: Array<{ imo: string }>;
    meta: { total: number };
  }>('Fase 1', 'admin', 'GET', `/buques?q=${buqueImo}&page=1&limit=5`, {
    token: adminToken,
    expectedStatus: 200,
  });
  assertCondition(
    buquesPag.body.data.items.some((b) => b.imo === buqueImo),
    'El buque creado debe aparecer en búsqueda paginada',
  );

  await callApi('Fase 1', 'admin', 'GET', '/buques/resumen-flota', {
    token: adminToken,
    expectedStatus: 200,
  });

  const csvFlota = await callApi<{ csvContent: string }>(
    'Fase 1',
    'admin',
    'GET',
    '/buques/exportar-csv',
    { token: adminToken, expectedStatus: 200 },
  );
  assertCondition(
    csvFlota.body.data.csvContent.includes(buqueImo),
    'CSV de flota debe incluir el nuevo buque',
  );

  const ahora = Date.now();
  const viajeCreado = await callApi<{ _id: string }>(
    'Fase 1',
    'admin',
    'POST',
    '/viajes',
    {
      token: adminToken,
      body: {
        codigo: viajeCodigo,
        buqueId,
        origenId: shanghai!._id,
        destinoId: guayaquil!._id,
        fechaSalida: new Date(ahora - 2 * 86400000).toISOString(),
        fechaLlegadaEstimada: new Date(ahora + 8 * 86400000).toISOString(),
        estado: 'en_ruta',
        velocidadNudos: 22.1,
        ingresosEstimadosUSD: 180000,
        costoOperativoUSD: 105000,
      },
      expectedStatus: 201,
    },
  );
  const viajeId = viajeCreado.body.data._id;

  await callApi('Fase 1', 'admin', 'PATCH', `/viajes/${viajeId}`, {
    token: adminToken,
    body: { velocidadNudos: 22.8, ingresosEstimadosUSD: 195000 },
    expectedStatus: 200,
  });

  const usuariosList = await callApi<
    Array<{ _id: string; correo: string }>
  >('Fase 1', 'admin', 'GET', '/auth/usuarios', {
    token: adminToken,
    expectedStatus: 200,
  });
  const garyUser = usuariosList.body.data.find(
    (u) => u.correo === 'contacto@garyindustries.com',
  );
  assertCondition(Boolean(garyUser), 'Debe existir cliente semilla Gary');

  const cargaCreada = await callApi<{ _id: string; codigoContenedor: string }>(
    'Fase 1',
    'admin',
    'POST',
    '/cargas',
    {
      token: adminToken,
      body: {
        viajeId,
        clienteId: garyUser!._id,
        codigoContenedor: contenedorCodigo,
        tipo: 'Seco',
        pesoToneladas: 21.5,
        numeroPrecinto: `#E2E-${uniqueSuffix}`,
        valorFleteUSD: 4100,
      },
      expectedStatus: 201,
    },
  );
  const cargaId = cargaCreada.body.data._id;

  await callApi('Fase 1', 'admin', 'GET', `/cargas?viajeId=${viajeId}`, {
    token: adminToken,
    expectedStatus: 200,
  });

  const mantCreado = await callApi<{ _id: string }>(
    'Fase 1',
    'admin',
    'POST',
    '/mantenimientos',
    {
      token: adminToken,
      body: {
        buqueId,
        tipo: 'preventivo',
        descripcion: 'Mantenimiento preventivo E2E',
        costoUSD: 4500,
        responsable: 'Taller Naval E2E',
        fechaProgramada: new Date(ahora - 86400000).toISOString(),
      },
      expectedStatus: 201,
    },
  );
  const mantId = mantCreado.body.data._id;

  const tempUserCreado = await callApi<{ id: string }>(
    'Fase 1',
    'admin',
    'POST',
    '/auth/usuarios',
    {
      token: adminToken,
      body: {
        nombre: 'Temp E2E User',
        correo: tempCorreo,
        password: 'naviport123',
        rol: 'cliente',
      },
      expectedStatus: 201,
    },
  );
  const tempUserId = tempUserCreado.body.data.id;

  await callApi('Fase 1', 'admin', 'PATCH', `/auth/usuarios/${tempUserId}`, {
    token: adminToken,
    body: { nombre: 'Temp E2E Editado' },
    expectedStatus: 200,
  });

  const tempLogin1 = await callApi<{ accessToken: string }>(
    'Fase 1',
    'cliente (temp)',
    'POST',
    '/auth/login',
    {
      body: { correo: tempCorreo, password: 'naviport123' },
      expectedStatus: 200,
    },
  );
  const tempToken1 = tempLogin1.body.data.accessToken;

  await callApi(
    'Fase 1',
    'admin',
    'PATCH',
    `/auth/usuarios/${tempUserId}/estado`,
    {
      token: adminToken,
      body: { activo: false },
      expectedStatus: 200,
      detalle: 'Suspende usuario y revoca sesion en Redis',
    },
  );

  await callApi('Fase 1', 'cliente (suspendido)', 'GET', '/auth/perfil', {
    token: tempToken1,
    expectedStatus: 401,
    detalle: 'Token rechazado inmediatamente en tiempo real (401)',
  });

  await callApi(
    'Fase 1',
    'admin',
    'PATCH',
    `/auth/usuarios/${tempUserId}/estado`,
    {
      token: adminToken,
      body: { activo: true },
      expectedStatus: 200,
      detalle: 'Reactiva usuario temporal',
    },
  );

  // ==========================================================
  // FASE 2: OPERADOR / EMPLEADO
  // ==========================================================
  const opLogin = await callApi<{ accessToken: string }>(
    'Fase 2',
    'operador',
    'POST',
    '/auth/login',
    {
      body: { correo: 'operador@naviport.com', password: 'naviport123' },
      expectedStatus: 200,
    },
  );
  const opToken = opLogin.body.data.accessToken;

  await callApi('Fase 2', 'operador', 'PATCH', '/auth/turno', {
    token: opToken,
    body: {
      turnoActivo: true,
      turno: 'Matutino',
      horarioTurno: '08:00 - 16:00',
    },
    expectedStatus: 200,
    detalle: 'Inicia turno en MongoDB (turnos) y Redis (turno:activo)',
  });

  // Escaneo con Multipart FormData + imagen PNG mínima real
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const scanForm = new FormData();
  scanForm.append(
    'foto',
    new Blob([tinyPng], { type: 'image/png' }),
    'scan-e2e.png',
  );
  scanForm.append('codigoContenedor', contenedorCodigo);
  scanForm.append('viajeId', viajeId);
  scanForm.append('dañosDetectados', 'true');
  scanForm.append('estadoSello', 'sello_roto');
  scanForm.append('confianza', '93');
  scanForm.append('observaciones', 'Prueba E2E con imagen PNG real');

  const scanRes = await callApi<{
    codigoLeido: string;
    estadoSello: string;
    buqueNombre: string;
  }>('Fase 2', 'operador', 'POST', '/escaner/inspeccion-optica', {
    token: opToken,
    formData: scanForm,
    expectedStatus: 201,
    detalle: 'Upload Multer PNG + IA + +1 escaneo en turno',
  });
  assertCondition(
    scanRes.body.data.codigoLeido === contenedorCodigo,
    'Código leído debe coincidir con contenedor E2E',
  );

  await callApi('Fase 2', 'operador', 'GET', '/escaner/resumen-operador', {
    token: opToken,
    expectedStatus: 200,
  });

  await callApi(
    'Fase 2',
    'operador',
    'GET',
    '/escaner/historial?soloMios=true&limit=10',
    { token: opToken, expectedStatus: 200 },
  );

  await callApi('Fase 2', 'operador', 'POST', `/cargas/${cargaId}/eventos`, {
    token: opToken,
    body: {
      estado: 'Verificado en muelle E2E',
      ubicacion: 'Terminal Yangshan (CHN)',
      descripcion: 'Evento registrado por operador en prueba E2E',
      completado: true,
    },
    expectedStatus: 201,
    detalle: 'Agrega hito en timeline y crea notificacion para Cliente',
  });

  const incCreado = await callApi<{ _id: string }>(
    'Fase 2',
    'operador',
    'POST',
    '/incidentes/reportar',
    {
      token: opToken,
      body: {
        viajeId,
        buqueId,
        tipo: 'averia',
        descripcion: 'Precinto roto detectado durante inspección en muelle E2E',
        gravedad: 'alta',
        codigoContenedor: contenedorCodigo,
      },
      expectedStatus: 201,
      detalle: 'Crea incidente + marca viaje retrasado + Redis alerta + notif Gerente',
    },
  );
  const incidenteId = incCreado.body.data._id;

  await callApi('Fase 2', 'operador', 'POST', '/soporte', {
    token: opToken,
    body: {
      tipo: 'supervisor',
      asunto: `Autorización de nuevo precinto ${uniqueSuffix}`,
      mensaje: 'Se requiere reemplazo de sello en contenedor verificado.',
      codigoContenedor: contenedorCodigo,
      prioridad: 'alta',
    },
    expectedStatus: 201,
  });

  await callApi('Fase 2', 'operador', 'PATCH', '/auth/turno', {
    token: opToken,
    body: {
      turnoActivo: false,
      observacionesCierre: 'Cierre de turno E2E sin pendientes',
    },
    expectedStatus: 200,
  });

  const misTurnos = await callApi<{
    historial: Array<{ escaneosRealizados: number; incidentesReportados: number }>;
  }>('Fase 2', 'operador', 'GET', '/auth/turnos/mi-historial', {
    token: opToken,
    expectedStatus: 200,
    detalle: 'Verifica contadores acumulados en turno',
  });
  assertCondition(
    misTurnos.body.data.historial[0].escaneosRealizados >= 1 &&
      misTurnos.body.data.historial[0].incidentesReportados >= 1,
    'El turno cerrado debe registrar al menos 1 escaneo y 1 incidente',
  );

  // ==========================================================
  // FASE 3: CLIENTE
  // ==========================================================
  const pubReg = await callApi<{ rol: string }>(
    'Fase 3',
    'Público',
    'POST',
    '/auth/registro',
    {
      body: {
        nombre: 'Cliente Publico E2E',
        correo: publicCorreo,
        password: 'password123',
        rol: 'admin', // Intento de escalación de privilegios
      },
      expectedStatus: 201,
      detalle: 'Registro público fuerza rol=cliente (bloquea escalación)',
    },
  );
  assertCondition(
    pubReg.body.data.rol === 'cliente',
    'El registro público debe forzar rol cliente aunque se envíe admin',
  );

  const cliLogin = await callApi<{ accessToken: string }>(
    'Fase 3',
    'cliente',
    'POST',
    '/auth/login',
    {
      body: {
        correo: 'contacto@garyindustries.com',
        password: 'naviport123',
      },
      expectedStatus: 200,
    },
  );
  const cliToken = cliLogin.body.data.accessToken;

  await callApi('Fase 3', 'cliente', 'GET', '/cargas/resumen-cliente', {
    token: cliToken,
    expectedStatus: 200,
  });

  const misCargas = await callApi<Array<{ codigoContenedor: string }>>(
    'Fase 3',
    'cliente',
    'GET',
    `/cargas/mis-cargas?estado=en_curso&q=${encodeURIComponent(contenedorCodigo)}`,
    { token: cliToken, expectedStatus: 200 },
  );
  assertCondition(
    misCargas.body.data.some((c) => c.codigoContenedor === contenedorCodigo),
    'El cliente debe ver su nueva carga en Seguimiento',
  );

  await callApi('Fase 3', 'cliente', 'GET', `/cargas/${cargaId}`, {
    token: cliToken,
    expectedStatus: 200,
  });

  const timeline = await callApi<{ eventos: Array<{ estado: string }> }>(
    'Fase 3',
    'cliente',
    'GET',
    `/cargas/${cargaId}/timeline`,
    { token: cliToken, expectedStatus: 200 },
  );
  assertCondition(
    timeline.body.data.eventos.some(
      (e) => e.estado === 'Verificado en muelle E2E',
    ),
    'Timeline debe incluir el hito agregado por el operador',
  );

  const manifiesto = await callApi<{
    numeroDocumento: string;
    consignatario: { ruc: string };
  }>('Fase 3', 'cliente', 'GET', `/cargas/${cargaId}/manifiesto`, {
    token: cliToken,
    expectedStatus: 200,
    detalle: 'Manifiesto aduanero generado con datos de consignatario',
  });
  assertCondition(
    Boolean(manifiesto.body.data.numeroDocumento),
    'Manifiesto debe contener número de documento BL',
  );

  // Prueba de aislamiento de datos entre clientes distintos
  const tempLogin2 = await callApi<{ accessToken: string }>(
    'Fase 3',
    'cliente (ajeno)',
    'POST',
    '/auth/login',
    {
      body: { correo: tempCorreo, password: 'naviport123' },
      expectedStatus: 200,
    },
  );
  await callApi(
    'Fase 3',
    'cliente (ajeno)',
    'GET',
    `/cargas/${cargaId}`,
    {
      token: tempLogin2.body.data.accessToken,
      expectedStatus: 403,
      detalle: 'Aislamiento por clienteId bloquea acceso ajeno (403)',
    },
  );

  const notifs = await callApi<Array<{ id: string; leida: boolean }>>(
    'Fase 3',
    'cliente',
    'GET',
    '/cargas/notificaciones',
    { token: cliToken, expectedStatus: 200 },
  );
  assertCondition(
    notifs.body.data.length > 0,
    'Cliente debe tener notificaciones persistidas/activas',
  );

  await callApi(
    'Fase 3',
    'cliente',
    'PATCH',
    `/cargas/notificaciones/${encodeURIComponent(notifs.body.data[0].id)}/leer`,
    { token: cliToken, expectedStatus: 200 },
  );

  await callApi(
    'Fase 3',
    'cliente',
    'PATCH',
    '/cargas/notificaciones/leer-todas',
    { token: cliToken, expectedStatus: 200 },
  );

  await callApi('Fase 3', 'cliente', 'PATCH', '/auth/perfil', {
    token: cliToken,
    body: {
      detallesPerfil: {
        telefono: '+593 4 256 7890',
        direccionLegal: 'Av. 9 de Octubre 416, Guayaquil, Ecuador',
      },
    },
    expectedStatus: 200,
  });

  await callApi('Fase 3', 'cliente', 'PATCH', '/auth/preferencias', {
    token: cliToken,
    body: { idioma: 'es', notificacionesPush: true },
    expectedStatus: 200,
  });

  const ticketCli = await callApi<{ _id: string; codigo: string }>(
    'Fase 3',
    'cliente',
    'POST',
    '/soporte',
    {
      token: cliToken,
      body: {
        tipo: 'agente_aduanas',
        asunto: `Consulta aduana E2E ${uniqueSuffix}`,
        mensaje: 'Favor confirmar estado de aforo previo para contenedor.',
        codigoContenedor: contenedorCodigo,
        prioridad: 'media',
      },
      expectedStatus: 201,
    },
  );
  const ticketCliId = ticketCli.body.data._id;

  await callApi('Fase 3', 'cliente', 'GET', '/soporte/mis-tickets', {
    token: cliToken,
    expectedStatus: 200,
  });

  // ==========================================================
  // FASE 4: GERENTE
  // ==========================================================
  const gerLogin = await callApi<{ accessToken: string }>(
    'Fase 4',
    'gerente',
    'POST',
    '/auth/login',
    {
      body: { correo: 'gerente@naviport.com', password: 'naviport123' },
      expectedStatus: 200,
    },
  );
  const gerToken = gerLogin.body.data.accessToken;

  const kpiMiss = await callApi<{ origenCache: boolean }>(
    'Fase 4',
    'gerente',
    'GET',
    '/kpis/resumen',
    {
      token: gerToken,
      expectedStatus: 200,
      detalle: '1ra consulta KPI -> agrega en MongoDB (origenCache: false)',
    },
  );
  assertCondition(
    kpiMiss.body.data.origenCache === false,
    'Primera llamada a /kpis/resumen debe venir de MongoDB (origenCache=false)',
  );

  const kpiHit = await callApi<{ origenCache: boolean }>(
    'Fase 4',
    'gerente',
    'GET',
    '/kpis/resumen',
    {
      token: gerToken,
      expectedStatus: 200,
      detalle: '2da consulta KPI -> lee de Redis (origenCache: true)',
    },
  );
  assertCondition(
    kpiHit.body.data.origenCache === true,
    'Segunda llamada a /kpis/resumen debe venir de Redis (origenCache=true)',
  );

  const repMiss = await callApi<{ origenCache: boolean }>(
    'Fase 4',
    'gerente',
    'GET',
    '/kpis/reportes?periodo=mes',
    {
      token: gerToken,
      expectedStatus: 200,
      detalle: '1ra consulta Reportes -> MongoDB (origenCache: false)',
    },
  );
  assertCondition(
    repMiss.body.data.origenCache === false,
    'Primera llamada a /kpis/reportes debe venir de MongoDB',
  );

  const repHit = await callApi<{ origenCache: boolean }>(
    'Fase 4',
    'gerente',
    'GET',
    '/kpis/reportes?periodo=mes',
    {
      token: gerToken,
      expectedStatus: 200,
      detalle: '2da consulta Reportes -> Redis (origenCache: true)',
    },
  );
  assertCondition(
    repHit.body.data.origenCache === true,
    'Segunda llamada a /kpis/reportes debe venir de Redis',
  );

  await callApi(
    'Fase 4',
    'gerente',
    'GET',
    '/kpis/reportes/exportar-csv?periodo=mes',
    { token: gerToken, expectedStatus: 200 },
  );

  await callApi('Fase 4', 'gerente', 'GET', '/kpis/alertas-activas', {
    token: gerToken,
    expectedStatus: 200,
  });

  await callApi(
    'Fase 4',
    'gerente',
    'DELETE',
    `/kpis/alertas-activas/${encodeURIComponent(`averia_detectada:${contenedorCodigo}`)}`,
    { token: gerToken, expectedStatus: 200 },
  );

  await callApi(
    'Fase 4',
    'gerente',
    'PATCH',
    `/incidentes/${incidenteId}/estado`,
    {
      token: gerToken,
      body: { estado: 'resuelto' },
      expectedStatus: 200,
      detalle: 'Resuelve incidente y limpia alertas del viaje en Redis',
    },
  );

  await callApi(
    'Fase 4',
    'gerente',
    'PATCH',
    `/mantenimientos/${mantId}/estado`,
    {
      token: gerToken,
      body: { estado: 'completado' },
      expectedStatus: 200,
      detalle: 'Completa mantenimiento y limpia alerta vencida en Redis',
    },
  );

  await callApi('Fase 4', 'gerente', 'GET', '/soporte?estado=abierto', {
    token: gerToken,
    expectedStatus: 200,
  });

  await callApi(
    'Fase 4',
    'gerente',
    'PATCH',
    `/soporte/${ticketCliId}/responder`,
    {
      token: gerToken,
      body: {
        respuesta: 'Aforo aprobado en sistema aduanero para su contenedor.',
        estado: 'resuelto',
      },
      expectedStatus: 200,
      detalle: 'Responde ticket y notifica al cliente',
    },
  );

  await callApi('Fase 4', 'gerente', 'GET', '/auth/turnos', {
    token: gerToken,
    expectedStatus: 200,
  });

  // ==========================================================
  // FASE 5: ADMIN — Auditoría, Seguridad, Limpieza y Logout
  // ==========================================================
  const auditRes = await callApi<Array<{ accion: string }>>(
    'Fase 5',
    'admin',
    'GET',
    '/auth/auditoria?limite=50',
    {
      token: adminToken,
      expectedStatus: 200,
      detalle: 'Verifica auditoria_logs persistida de todas las fases',
    },
  );
  assertCondition(
    auditRes.body.data.length > 0,
    'Debe haber registros de auditoría',
  );

  await callApi('Fase 5', 'cliente (RBAC)', 'GET', '/auth/usuarios', {
    token: cliToken,
    expectedStatus: 403,
    detalle: 'RBAC bloquea acceso de cliente a /auth/usuarios (403)',
  });

  // Rate limiting en login (5 intentos fallidos + 6to bloqueado 429)
  const rlCorreo = `rl.${uniqueSuffix}@naviport.com`;
  for (let i = 1; i <= 5; i += 1) {
    await callApi('Fase 5', 'rate-limit', 'POST', '/auth/login', {
      body: { correo: rlCorreo, password: 'badpassword' },
      expectedStatus: 401,
      detalle: `Intento fallido ${i}/5`,
    });
  }
  await callApi('Fase 5', 'rate-limit', 'POST', '/auth/login', {
    body: { correo: rlCorreo, password: 'badpassword' },
    expectedStatus: 429,
    detalle: '6to intento bloqueado por Redis ratelimit:login (429)',
  });

  // Integridad referencial: buque con viaje asociado -> 409 Conflict
  await callApi('Fase 5', 'admin', 'DELETE', `/buques/${buqueId}`, {
    token: adminToken,
    expectedStatus: 409,
    detalle: 'Integridad referencial impide borrar buque con viaje (409)',
  });

  // Limpieza de entidades temporales sin dependencias
  await callApi('Fase 5', 'admin', 'DELETE', `/mantenimientos/${mantId}`, {
    token: adminToken,
    expectedStatus: 200,
  });
  await callApi('Fase 5', 'admin', 'DELETE', `/puertos/${puertoTempId}`, {
    token: adminToken,
    expectedStatus: 200,
  });

  await callApi('Fase 5', 'admin', 'POST', '/auth/logout', {
    token: adminToken,
    expectedStatus: 200,
    detalle: 'Revoca sesion:{adminId} en Redis',
  });

  await callApi('Fase 5', 'admin (post-logout)', 'GET', '/auth/perfil', {
    token: adminToken,
    expectedStatus: 401,
    detalle: 'Token revocado tras logout rechazado (401)',
  });

  console.log(`\n✅ VERIFICACIÓN COMPLETA EXITOSA: ${resultados.length} pasos ejecutados sin errores.\n`);
  for (const r of resultados) {
    console.log(
      `[${String(r.paso).padStart(2, '0')}] ${r.fase} | ${r.rol.padEnd(18)} | ${r.metodo.padEnd(6)} ${r.endpoint.padEnd(48)} -> HTTP ${r.status} ${r.detalle ? `(${r.detalle})` : ''}`,
    );
  }
}

main().catch((err: unknown) => {
  console.error('\n❌ ERROR EN VERIFICACIÓN EN VIVO:', err);
  process.exit(1);
});
