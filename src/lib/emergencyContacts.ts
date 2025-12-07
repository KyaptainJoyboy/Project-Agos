export interface EmergencyContact {
  id: string;
  category: 'rescue' | 'police' | 'hospital' | 'fire' | 'barangay' | 'disaster' | 'university';
  name: string;
  number: string;
  description: string;
  available24h: boolean;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'rescue-1',
    category: 'rescue',
    name: 'Tuguegarao City Disaster Risk Reduction Office',
    number: '078-844-1621',
    description: 'Primary rescue and emergency response',
    available24h: true,
  },
  {
    id: 'rescue-2',
    category: 'rescue',
    name: 'Philippine Red Cross - Cagayan',
    number: '078-844-8484',
    description: 'Emergency medical and rescue services',
    available24h: true,
  },
  {
    id: 'police-1',
    category: 'police',
    name: 'Tuguegarao City Police Station',
    number: '078-844-1166',
    description: 'Emergency police assistance',
    available24h: true,
  },
  {
    id: 'police-2',
    category: 'police',
    name: 'PNP Emergency Hotline',
    number: '117',
    description: 'National police emergency hotline',
    available24h: true,
  },
  {
    id: 'hospital-1',
    category: 'hospital',
    name: 'Cagayan Valley Medical Center',
    number: '078-844-8339',
    description: 'Major hospital and trauma center',
    available24h: true,
  },
  {
    id: 'hospital-2',
    category: 'hospital',
    name: 'St. Paul Hospital Tuguegarao',
    number: '078-844-1043',
    description: 'Private hospital near SPUP campus',
    available24h: true,
  },
  {
    id: 'hospital-3',
    category: 'hospital',
    name: 'Ambulance Emergency',
    number: '078-304-2222',
    description: 'Emergency ambulance services',
    available24h: true,
  },
  {
    id: 'fire-1',
    category: 'fire',
    name: 'Bureau of Fire Protection - Tuguegarao',
    number: '078-844-1479',
    description: 'Fire and rescue services',
    available24h: true,
  },
  {
    id: 'fire-2',
    category: 'fire',
    name: 'BFP Emergency Hotline',
    number: '160',
    description: 'National fire emergency hotline',
    available24h: true,
  },
  {
    id: 'barangay-1',
    category: 'barangay',
    name: 'Barangay Ugac Sur',
    number: '078-844-5501',
    description: 'Local barangay emergency response',
    available24h: false,
  },
  {
    id: 'barangay-2',
    category: 'barangay',
    name: 'Barangay Centro',
    number: '078-844-5502',
    description: 'Downtown barangay emergency response',
    available24h: false,
  },
  {
    id: 'barangay-3',
    category: 'barangay',
    name: 'Barangay Caritan Norte',
    number: '078-844-5503',
    description: 'Caritan Norte emergency response',
    available24h: false,
  },
  {
    id: 'disaster-1',
    category: 'disaster',
    name: 'NDRRMC Emergency Hotline',
    number: '911',
    description: 'National disaster response hotline',
    available24h: true,
  },
  {
    id: 'disaster-2',
    category: 'disaster',
    name: 'PAGASA Weather Bureau',
    number: '078-844-2345',
    description: 'Weather updates and flood warnings',
    available24h: true,
  },
  {
    id: 'disaster-3',
    category: 'disaster',
    name: 'Coast Guard Tuguegarao',
    number: '078-844-7890',
    description: 'Water rescue and flood response',
    available24h: true,
  },
  {
    id: 'university-1',
    category: 'university',
    name: 'SPUP Security Office',
    number: '078-844-0125',
    description: 'Campus security and emergency response',
    available24h: true,
  },
  {
    id: 'university-2',
    category: 'university',
    name: 'SPUP Clinic',
    number: '078-844-0126',
    description: 'Campus medical assistance',
    available24h: false,
  },
  {
    id: 'university-3',
    category: 'university',
    name: 'SPUP Student Affairs',
    number: '078-844-0127',
    description: 'Student welfare and support',
    available24h: false,
  },
];

export function getCategorizedContacts() {
  return {
    rescue: EMERGENCY_CONTACTS.filter(c => c.category === 'rescue'),
    police: EMERGENCY_CONTACTS.filter(c => c.category === 'police'),
    hospital: EMERGENCY_CONTACTS.filter(c => c.category === 'hospital'),
    fire: EMERGENCY_CONTACTS.filter(c => c.category === 'fire'),
    barangay: EMERGENCY_CONTACTS.filter(c => c.category === 'barangay'),
    disaster: EMERGENCY_CONTACTS.filter(c => c.category === 'disaster'),
    university: EMERGENCY_CONTACTS.filter(c => c.category === 'university'),
  };
}
