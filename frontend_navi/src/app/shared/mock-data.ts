export type UserRole = 'cliente' | 'operador' | 'gerente' | 'admin';

export interface ShipmentTimelineEvent {
  title: string;
  timestamp: string;
  description: string;
  state: 'done' | 'active' | 'pending';
}

export interface ShipmentMock {
  id: string;
  code: string;
  vessel: string;
  status: 'EN RUTA' | 'ENTREGADO' | 'EN ADUANA';
  originCity: string;
  originTerminal: string;
  originCode: string;
  destinationCity: string;
  destinationTerminal: string;
  destinationCode: string;
  progress: number;
  departureDate: string;
  arrivalDate: string;
  etaText: string;
  etaSummary: string;
  stageLabel: string;
  containersCount: number;
  weightTons: number;
  timeline: ShipmentTimelineEvent[];
}

export interface ScanRecordMock {
  id: string;
  code: string;
  vessel: string;
  timeAgo: string;
  info: string;
  status: 'OK' | 'Sello' | 'Avería';
  confidence: number;
  image: string;
}

export interface FleetShipMock {
  id: string;
  imo: string;
  name: string;
  type: 'Portacontenedores' | 'Granelero' | 'Refrigerado';
  capacityTn: number;
  status: 'EN RUTA' | 'RETRASO CLIMA' | 'MANTENIMIENTO' | 'EN PUERTO';
  adminStatus: 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO';
  route: string;
  progress: number;
  captain: string;
  eta: string;
}

export interface NotificationItemMock {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  tone: 'info' | 'warning' | 'success';
}

export const CLIENT_SHIPMENTS_MOCK: ShipmentMock[] = [
  {
    id: 'BU-1234XYZ',
    code: '#BU-1234XYZ',
    vessel: 'Maersk Horizon',
    status: 'EN RUTA',
    originCity: 'Shanghai',
    originTerminal: 'Terminal Yangshan (CHN)',
    originCode: 'CHN',
    destinationCity: 'Guayaquil',
    destinationTerminal: 'Puerto Marítimo (ECU)',
    destinationCode: 'ECU',
    progress: 0.65,
    departureDate: '12 Mar',
    arrivalDate: '3 Jul',
    etaText: '5 días (3 Jul)',
    etaSummary: '6 días (18 Octubre)',
    stageLabel: 'En Tránsito - Océano Pacífico',
    containersCount: 4,
    weightTons: 88.4,
    timeline: [
      {
        title: 'Recogido - Puerto Shanghai',
        timestamp: '12 Octubre - 19:20',
        description: 'Contenedor sellado #MSK-4409 verificado en muelle terminal 3.',
        state: 'done',
      },
      {
        title: 'En Tránsito - Océano Pacífico',
        timestamp: 'Actualizado hace 2 horas',
        description: 'Velocidad: 21.4 nudos • Coordenadas: 14°N 165°W.',
        state: 'active',
      },
      {
        title: 'Arribo y Desaduanización - Guayaquil',
        timestamp: 'Estimado: 18 Octubre',
        description: 'Asignado a Muelle Sur Terminales Portuarias.',
        state: 'pending',
      },
    ],
  },
  {
    id: 'US-1234XYZ',
    code: '#US-1234XYZ',
    vessel: 'Maersk Horizon',
    status: 'EN RUTA',
    originCity: 'Miami',
    originTerminal: 'PortMiami Terminal (USA)',
    originCode: 'USA',
    destinationCity: 'Guayaquil',
    destinationTerminal: 'Puerto Marítimo (ECU)',
    destinationCode: 'ECU',
    progress: 0.58,
    departureDate: '15 Mar',
    arrivalDate: '3 Jul',
    etaText: '7 días (3 Jul)',
    etaSummary: '7 días (19 Octubre)',
    stageLabel: 'En Tránsito - Canal de Panamá',
    containersCount: 2,
    weightTons: 42.0,
    timeline: [
      {
        title: 'Despacho - PortMiami',
        timestamp: '14 Octubre - 08:40',
        description: 'Inspección pre-embarque completada con sello electrónico intacto.',
        state: 'done',
      },
      {
        title: 'En Tránsito - Canal de Panamá',
        timestamp: 'Actualizado hace 45 min',
        description: 'Velocidad: 18.2 nudos • Esclusa Miraflores superada.',
        state: 'active',
      },
      {
        title: 'Arribo Programado - Guayaquil',
        timestamp: 'Estimado: 19 Octubre',
        description: 'Documentación SENAE pre-validada.',
        state: 'pending',
      },
    ],
  },
  {
    id: 'CN-7789GYE',
    code: '#CN-7789GYE',
    vessel: 'MSC Irina',
    status: 'ENTREGADO',
    originCity: 'Shanghai',
    originTerminal: 'Terminal Yangshan (CHN)',
    originCode: 'CHN',
    destinationCity: 'Guayaquil',
    destinationTerminal: 'Puerto Marítimo (ECU)',
    destinationCode: 'ECU',
    progress: 1,
    departureDate: '02 Feb',
    arrivalDate: '28 Mar',
    etaText: 'Entregado (28 Mar)',
    etaSummary: 'Completado sin novedades',
    stageLabel: 'Entregado en Bodega Cliente',
    containersCount: 3,
    weightTons: 64.5,
    timeline: [
      {
        title: 'Recogido - Puerto Shanghai',
        timestamp: '02 Febrero - 11:00',
        description: 'Carga consolidada embarcada sin incidencias.',
        state: 'done',
      },
      {
        title: 'Desaduanización - Guayaquil',
        timestamp: '27 Marzo - 14:35',
        description: 'Levante aduanero aprobado automáticamente.',
        state: 'done',
      },
      {
        title: 'Entregado - Gary Industries',
        timestamp: '28 Marzo - 09:15',
        description: 'Recepción firmada digitalmente en planta.',
        state: 'done',
      },
    ],
  },
];

export const OPERATOR_SCANS_MOCK: ScanRecordMock[] = [
  {
    id: 'scan-1',
    code: '#MSK-1234',
    vessel: 'Maersk Buque',
    timeAgo: 'Hace 8min',
    info: 'Contenedor 40ft HC • Precinto íntegro',
    status: 'OK',
    confidence: 98,
    image: 'assets/figma/container-scan.png',
  },
  {
    id: 'scan-2',
    code: '#MSK-1567',
    vessel: 'Maersk Buque',
    timeAgo: 'Hace 15min',
    info: 'Observación menor en sello lateral',
    status: 'Sello',
    confidence: 85,
    image: 'assets/figma/container-scan.png',
  },
  {
    id: 'scan-3',
    code: '#CN-9823',
    vessel: 'MSC Irina',
    timeAgo: 'Hace 32min',
    info: 'Lectura OCR verificada en grúa 04',
    status: 'OK',
    confidence: 96,
    image: 'assets/figma/container-scan.png',
  },
];

export const FLEET_SHIPS_MOCK: FleetShipMock[] = [
  {
    id: 'ship-1',
    imo: 'IMO-6360226',
    name: 'MSC Irina',
    type: 'Portacontenedores',
    capacityTn: 52000,
    status: 'EN RUTA',
    adminStatus: 'ACTIVO',
    route: 'Shanghai a Guayaquil',
    progress: 0.82,
    captain: 'Luis Andrade',
    eta: '18 Oct',
  },
  {
    id: 'ship-2',
    imo: 'IMO-9708851',
    name: 'Buque Guayas',
    type: 'Granelero',
    capacityTn: 15000,
    status: 'RETRASO CLIMA',
    adminStatus: 'INACTIVO',
    route: 'Miami a Guayaquil',
    progress: 0.64,
    captain: 'Carlos Mendoza',
    eta: '20 Oct',
  },
  {
    id: 'ship-3',
    imo: 'IMO-9632179',
    name: 'Maersk Horizon',
    type: 'Refrigerado',
    capacityTn: 18500,
    status: 'MANTENIMIENTO',
    adminStatus: 'MANTENIMIENTO',
    route: 'Ningbo a Guayaquil',
    progress: 0.45,
    captain: 'Elena Paredes',
    eta: '24 Oct',
  },
  {
    id: 'ship-4',
    imo: 'IMO-9839430',
    name: 'Ocean Pacific',
    type: 'Portacontenedores',
    capacityTn: 48000,
    status: 'EN RUTA',
    adminStatus: 'ACTIVO',
    route: 'Shanghai a Guayaquil',
    progress: 0.75,
    captain: 'Luis Andrade',
    eta: '19 Oct',
  },
  {
    id: 'ship-5',
    imo: 'IMO-9452100',
    name: 'Ever Given Star',
    type: 'Portacontenedores',
    capacityTn: 41200,
    status: 'RETRASO CLIMA',
    adminStatus: 'ACTIVO',
    route: 'Miami a Guayaquil',
    progress: 0.52,
    captain: 'Marco Vera',
    eta: '22 Oct',
  },
  {
    id: 'ship-6',
    imo: 'IMO-9551104',
    name: 'Andes Mariner',
    type: 'Granelero',
    capacityTn: 26400,
    status: 'MANTENIMIENTO',
    adminStatus: 'MANTENIMIENTO',
    route: 'Guayaquil Astillero',
    progress: 0.3,
    captain: 'Sofía Castro',
    eta: '27 Oct',
  },
  {
    id: 'ship-7',
    imo: 'IMO-9328844',
    name: 'Guayas Express',
    type: 'Portacontenedores',
    capacityTn: 36000,
    status: 'EN PUERTO',
    adminStatus: 'ACTIVO',
    route: 'Terminal GYE Sur',
    progress: 1,
    captain: 'Diego León',
    eta: 'En Muelle',
  },
  {
    id: 'ship-8',
    imo: 'IMO-9901245',
    name: 'Pacific Voyager',
    type: 'Refrigerado',
    capacityTn: 29800,
    status: 'EN PUERTO',
    adminStatus: 'ACTIVO',
    route: 'PortMiami Muelle 2',
    progress: 0.94,
    captain: 'Rosa Cevallos',
    eta: 'Listo Zarpe',
  },
];

export const CLIENT_NOTIFICATIONS_MOCK: NotificationItemMock[] = [
  {
    id: 'notif-1',
    title: 'Buque Maersk Horizon actualizó posición',
    detail: 'Embarque #BU-1234XYZ navega a 21.4 nudos rumbo a Guayaquil.',
    time: 'Hace 2 horas',
    unread: true,
    tone: 'info',
  },
  {
    id: 'notif-2',
    title: 'Manifiesto aduanero disponible',
    detail: 'Documento PDF listo para descargar en el detalle de #BU-1234XYZ.',
    time: 'Hace 5 horas',
    unread: true,
    tone: 'success',
  },
  {
    id: 'notif-3',
    title: 'Recordatorio de arribo cercano',
    detail: 'Próxima llegada estimada en Puerto Marítimo de Guayaquil: 6 días.',
    time: 'Ayer',
    unread: false,
    tone: 'warning',
  },
];

export interface BarPointMock {
  label: string;
  heightPct: number;
  highlight?: boolean;
}

export const GERENTE_MONTHLY_BARS: BarPointMock[] = [
  { label: 'Ene', heightPct: 72 },
  { label: 'Feb', heightPct: 88 },
  { label: 'Mar', heightPct: 60 },
  { label: 'Abr', heightPct: 82 },
  { label: 'May', heightPct: 90 },
  { label: 'Jun', heightPct: 84 },
  { label: 'Jul', heightPct: 54 },
  { label: 'Ago', heightPct: 89 },
  { label: 'Sep', heightPct: 66 },
  { label: 'Oct', heightPct: 96, highlight: true },
];

export const GERENTE_PUNTUALIDAD_BARS: BarPointMock[] = [
  { label: 'Ene', heightPct: 84 },
  { label: 'Feb', heightPct: 88 },
  { label: 'Mar', heightPct: 82 },
  { label: 'Abr', heightPct: 90 },
  { label: 'May', heightPct: 91 },
  { label: 'Jun', heightPct: 89 },
  { label: 'Jul', heightPct: 86 },
  { label: 'Ago', heightPct: 93 },
  { label: 'Sep', heightPct: 92 },
  { label: 'Oct', heightPct: 94, highlight: true },
];

export const GERENTE_RECENT_ALERTS = [
  {
    code: '#BU-1234XYZ',
    vessel: 'Maersk Horizon',
    route: 'Shanghai → Guayaquil',
    eta: '18 Oct · En ruta',
    badge: 'EN RUTA',
    tone: 'badge-ruta-soft',
  },
  {
    code: '#AL-204',
    vessel: 'Buque Guayas',
    route: 'Miami → Guayaquil',
    eta: 'Demora +14h por oleaje',
    badge: 'RETRASO CLIMA',
    tone: 'badge-retraso',
  },
  {
    code: '#MNT-89',
    vessel: 'Maersk Horizon',
    route: 'Dique Seco · GYE',
    eta: 'Revisión sistema propulsión',
    badge: 'MANTENIMIENTO',
    tone: 'badge-mantenimiento',
  },
];

export const GERENTE_ROUTE_LOADS = [
  { name: 'Shanghai (CHN) → Guayaquil (ECU)', tons: '8,420 Tn', pct: 0.78 },
  { name: 'Miami (USA) → Guayaquil (ECU)', tons: '4,180 Tn', pct: 0.52 },
  { name: 'Ningbo (CHN) → Guayaquil (ECU)', tons: '1,900 Tn', pct: 0.28 },
];

export interface PortMock {
  code: string;
  name: string;
  country: string;
  cranes: number;
  capacityTeu: string;
  status: 'ACTIVO' | 'MANTENIMIENTO';
}

export interface VoyageMock {
  code: string;
  vessel: string;
  route: string;
  eta: string;
  operator: string;
  status: 'ACTIVO' | 'MANTENIMIENTO';
}

export interface AdminUserMock {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export const ADMIN_INITIAL_SHIPS: FleetShipMock[] = [
  {
    ...FLEET_SHIPS_MOCK[0],
    imo: 'IMO-6360226',
    capacityTn: 24000,
    adminStatus: 'ACTIVO',
  },
  {
    ...FLEET_SHIPS_MOCK[1],
    imo: 'IMO-9708851',
    name: 'Buque Guayas',
    type: 'Granelero',
    capacityTn: 15000,
    adminStatus: 'INACTIVO',
  },
  {
    ...FLEET_SHIPS_MOCK[2],
    imo: 'IMO-9632179',
    name: 'Maersk Horizon',
    type: 'Refrigerado',
    capacityTn: 18500,
    adminStatus: 'MANTENIMIENTO',
  },
  ...FLEET_SHIPS_MOCK.slice(3),
];

export const ADMIN_PORTS_MOCK: PortMock[] = [
  {
    code: 'CNSHA',
    name: 'Terminal Yangshan',
    country: 'Shanghai, China',
    cranes: 24,
    capacityTeu: '4.2M TEU',
    status: 'ACTIVO',
  },
  {
    code: 'USMIA',
    name: 'PortMiami Terminal',
    country: 'Miami, EE.UU.',
    cranes: 14,
    capacityTeu: '1.3M TEU',
    status: 'ACTIVO',
  },
  {
    code: 'ECGYE',
    name: 'Puerto Marítimo GYE',
    country: 'Guayaquil, Ecuador',
    cranes: 12,
    capacityTeu: '2.1M TEU',
    status: 'ACTIVO',
  },
];

export const ADMIN_VOYAGES_MOCK: VoyageMock[] = [
  {
    code: '#BU-1234XYZ',
    vessel: 'Maersk Horizon',
    route: 'Shanghai (CHN) → Guayaquil (ECU)',
    eta: '18 Oct 2026',
    operator: 'Gary Barreiro',
    status: 'ACTIVO',
  },
  {
    code: '#US-1234XYZ',
    vessel: 'MSC Irina',
    route: 'Miami (USA) → Guayaquil (ECU)',
    eta: '19 Oct 2026',
    operator: 'Luis Andrade',
    status: 'ACTIVO',
  },
  {
    code: '#MN-4080GYE',
    vessel: 'Buque Guayas',
    route: 'Astillero Muelle Sur',
    eta: '25 Oct 2026',
    operator: 'Taller Naval',
    status: 'MANTENIMIENTO',
  },
];

export const ADMIN_USERS_MOCK: AdminUserMock[] = [
  { name: 'Gary Industries', email: 'garyin@gmail.com', role: 'cliente', active: true },
  { name: 'Gary Barreiro', email: 'garyba@gmail.com', role: 'operador', active: true },
  { name: 'Carlos Mendoza', email: 'gerente@naviport.ec', role: 'gerente', active: true },
  { name: 'Admin Flota', email: 'admin@naviport.ec', role: 'admin', active: true },
];
