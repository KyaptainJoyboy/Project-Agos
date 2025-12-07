import { SimulationMode } from './simulationManager';

export interface AlertMessage {
  id: string;
  timestamp: number;
  source: 'NDRRMC' | 'LGU' | 'PAGASA' | 'PNP' | 'BFP' | 'SYSTEM';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

const NORMAL_MESSAGES: Omit<AlertMessage, 'id' | 'timestamp'>[] = [
  {
    source: 'LGU',
    severity: 'info',
    title: 'Weather Update',
    message: 'Fair weather conditions across Tuguegarao City. No significant weather disturbances expected.',
  },
  {
    source: 'SYSTEM',
    severity: 'info',
    title: 'System Status',
    message: 'All evacuation centers are operational and ready. Community alert systems active.',
  },
];

const LIGHT_FLOOD_MESSAGES: Omit<AlertMessage, 'id' | 'timestamp'>[] = [
  {
    source: 'PAGASA',
    severity: 'warning',
    title: 'Weather Advisory',
    message: 'Moderate to heavy rainfall expected in the next 6-12 hours. Monitor water levels in low-lying areas.',
  },
  {
    source: 'LGU',
    severity: 'warning',
    title: 'Flood Warning - Level 1',
    message: 'Minor flooding reported in Pengue-Ruyu and Centro areas. Residents advised to prepare evacuation kits.',
  },
  {
    source: 'NDRRMC',
    severity: 'info',
    title: 'Evacuation Centers Ready',
    message: 'All designated evacuation centers are on standby. Contact your barangay for assistance.',
  },
  {
    source: 'PNP',
    severity: 'warning',
    title: 'Traffic Advisory',
    message: 'Several roads near Cagayan River experiencing slow traffic due to rising water levels. Use alternate routes.',
  },
];

const SEVERE_FLOOD_MESSAGES: Omit<AlertMessage, 'id' | 'timestamp'>[] = [
  {
    source: 'NDRRMC',
    severity: 'critical',
    title: 'FLOOD ALERT - LEVEL 3',
    message: 'SEVERE FLOODING in multiple barangays. Immediate evacuation advised for residents in low-lying areas.',
  },
  {
    source: 'PAGASA',
    severity: 'critical',
    title: 'Heavy Rainfall Warning',
    message: 'Intense rainfall continues. Cagayan River approaching critical level. Flash floods possible in next 2-4 hours.',
  },
  {
    source: 'LGU',
    severity: 'critical',
    title: 'Evacuation Order',
    message: 'Mandatory evacuation for Pengue-Ruyu, Centro, Caritan Norte, and Cataggaman Pardo. Proceed to nearest evacuation center.',
  },
  {
    source: 'BFP',
    severity: 'warning',
    title: 'Rescue Operations Active',
    message: 'Fire and rescue teams deployed in flood-affected areas. Call 160 or 078-844-1479 if you need assistance.',
  },
  {
    source: 'PNP',
    severity: 'critical',
    title: 'Road Closures',
    message: 'Multiple roads flooded and impassable. Maharlika Highway sections closed. Avoid travel unless absolutely necessary.',
  },
];

const CITYWIDE_EVACUATION_MESSAGES: Omit<AlertMessage, 'id' | 'timestamp'>[] = [
  {
    source: 'NDRRMC',
    severity: 'critical',
    title: 'CITYWIDE EVACUATION ORDER',
    message: 'CRITICAL EMERGENCY: All residents must evacuate immediately. This is not a drill. Proceed to designated evacuation centers NOW.',
  },
  {
    source: 'PAGASA',
    severity: 'critical',
    title: 'EXTREME WEATHER EVENT',
    message: 'Catastrophic flooding imminent. Cagayan River at CRITICAL LEVEL. Life-threatening conditions expected.',
  },
  {
    source: 'LGU',
    severity: 'critical',
    title: 'Emergency Declaration',
    message: 'State of Calamity declared for Tuguegarao City. All emergency services mobilized. Seek shelter immediately.',
  },
  {
    source: 'NDRRMC',
    severity: 'critical',
    title: 'ALL CENTERS ACCEPTING EVACUEES',
    message: 'All evacuation centers operating at full capacity. Additional facilities being opened. Do not stay in flood zones.',
  },
  {
    source: 'PNP',
    severity: 'critical',
    title: 'TOTAL ROAD NETWORK DISRUPTION',
    message: 'City road network severely affected. Emergency vehicles only. Residents must shelter in place or reach nearest safe zone.',
  },
  {
    source: 'BFP',
    severity: 'critical',
    title: 'Emergency Response Status',
    message: 'All rescue units deployed. Water rescue operations in progress. Stay on high ground and await rescue if trapped.',
  },
];

const STUDENT_SAFETY_MESSAGES: Omit<AlertMessage, 'id' | 'timestamp'>[] = [
  {
    source: 'LGU',
    severity: 'warning',
    title: 'Student Safety Advisory',
    message: 'Flooding affecting areas near SPUP. Students in dorms and boarding houses advised to move to evacuation centers.',
  },
  {
    source: 'SYSTEM',
    severity: 'warning',
    title: 'SPUP Emergency Protocol',
    message: 'SPUP Gymnasium accepting students. Coordinate with Student Affairs Office. Alternative shelter at City Convention Center.',
  },
  {
    source: 'PNP',
    severity: 'warning',
    title: 'Campus Area Traffic',
    message: 'Roads around SPUP experiencing flooding. Students advised to use designated safe routes to evacuation centers.',
  },
  {
    source: 'NDRRMC',
    severity: 'info',
    title: 'Student Evacuation Routes',
    message: 'Safe evacuation routes from SPUP area mapped and monitored. Follow AGOS routing guidance for safest path.',
  },
];

export function getAlertMessages(mode: SimulationMode): AlertMessage[] {
  let baseMessages: Omit<AlertMessage, 'id' | 'timestamp'>[] = [];

  switch (mode) {
    case 'normal':
      baseMessages = NORMAL_MESSAGES;
      break;
    case 'light_flood':
      baseMessages = LIGHT_FLOOD_MESSAGES;
      break;
    case 'severe_flood':
      baseMessages = SEVERE_FLOOD_MESSAGES;
      break;
    case 'citywide_evacuation':
      baseMessages = CITYWIDE_EVACUATION_MESSAGES;
      break;
    case 'student_safety':
      baseMessages = STUDENT_SAFETY_MESSAGES;
      break;
    default:
      baseMessages = NORMAL_MESSAGES;
  }

  const now = Date.now();
  return baseMessages.map((msg, index) => ({
    ...msg,
    id: `alert-${mode}-${index}`,
    timestamp: now - (baseMessages.length - index) * 300000,
  }));
}

export function getLatestAlert(mode: SimulationMode): AlertMessage | null {
  const messages = getAlertMessages(mode);
  return messages.length > 0 ? messages[0] : null;
}
