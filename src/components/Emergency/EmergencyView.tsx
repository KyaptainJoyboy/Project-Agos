import { useState } from 'react';
import { Phone, Clock, AlertCircle, Shield, Heart, Flame, Users, Radio, School } from 'lucide-react';
import { EMERGENCY_CONTACTS, getCategorizedContacts, EmergencyContact } from '../../lib/emergencyContacts';

const CATEGORY_ICONS = {
  rescue: AlertCircle,
  police: Shield,
  hospital: Heart,
  fire: Flame,
  barangay: Users,
  disaster: Radio,
  university: School,
};

const CATEGORY_COLORS = {
  rescue: 'bg-red-500',
  police: 'bg-blue-600',
  hospital: 'bg-emerald-500',
  fire: 'bg-orange-500',
  barangay: 'bg-purple-500',
  disaster: 'bg-amber-500',
  university: 'bg-indigo-500',
};

const CATEGORY_LABELS = {
  rescue: 'Rescue',
  police: 'Police',
  hospital: 'Medical',
  fire: 'Fire',
  barangay: 'Barangay',
  disaster: 'Disaster',
  university: 'SPUP',
};

export function EmergencyView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [shareLocation, setShareLocation] = useState(false);
  const categorized = getCategorizedContacts();

  const handleCall = (contact: EmergencyContact) => {
    if (shareLocation && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const message = `Emergency call initiated. Location: ${position.coords.latitude}, ${position.coords.longitude}`;
          console.log(message);
          alert(`Calling ${contact.name}...\n\n${shareLocation ? `Your location will be shared:\nLat: ${position.coords.latitude.toFixed(6)}\nLng: ${position.coords.longitude.toFixed(6)}` : ''}`);
        },
        () => {
          alert(`Calling ${contact.name}...`);
        }
      );
    } else {
      alert(`Calling ${contact.name}...\n\nNumber: ${contact.number}`);
    }

    window.location.href = `tel:${contact.number}`;
  };

  const displayContacts = selectedCategory
    ? categorized[selectedCategory as keyof typeof categorized]
    : EMERGENCY_CONTACTS;

  return (
    <div className="flex flex-col h-full pb-16 overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Emergency Contacts</h1>
            <p className="text-red-100 text-sm">Tap to call instantly</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Share my location when calling</span>
            </div>
            <button
              onClick={() => setShareLocation(!shareLocation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                shareLocation ? 'bg-white' : 'bg-white/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                  shareLocation ? 'translate-x-6 bg-red-600' : 'translate-x-1 bg-white'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const Icon = CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS];
            const isSelected = selectedCategory === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(isSelected ? null : key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  isSelected
                    ? `${CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS]} text-white shadow-lg scale-105`
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {CATEGORY_LABELS[selectedCategory as keyof typeof CATEGORY_LABELS]} contacts
            </p>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Show All
            </button>
          </div>
        )}

        <div className="space-y-3">
          {displayContacts.map((contact) => {
            const Icon = CATEGORY_ICONS[contact.category];
            const color = CATEGORY_COLORS[contact.category];

            return (
              <div
                key={contact.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 ${color} rounded-xl text-white flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-1">{contact.name}</h3>
                    <p className="text-sm text-slate-600 mb-2">{contact.description}</p>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-slate-700">{contact.number}</span>
                      {contact.available24h && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          24/7
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCall(contact)}
                    className={`${color} text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-opacity flex-shrink-0 flex items-center gap-2`}
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {displayContacts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No contacts in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
