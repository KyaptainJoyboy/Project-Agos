import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, AlertOctagon, Clock } from 'lucide-react';
import { simulationManager } from '../../lib/simulationManager';
import { getAlertMessages, AlertMessage } from '../../lib/alertMessages';

const SOURCE_COLORS = {
  NDRRMC: 'bg-red-600',
  LGU: 'bg-blue-600',
  PAGASA: 'bg-orange-600',
  PNP: 'bg-indigo-600',
  BFP: 'bg-amber-600',
  SYSTEM: 'bg-slate-600',
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const SEVERITY_COLORS = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-amber-50 border-amber-300 text-amber-900',
  critical: 'bg-red-50 border-red-300 text-red-900',
};

export function AlertsSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    loadAlerts();

    const unsubscribe = simulationManager.subscribe(() => {
      loadAlerts();
      setHasUnread(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadAlerts = () => {
    const mode = simulationManager.getMode();
    const messages = getAlertMessages(mode);
    setAlerts(messages);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed top-4 right-4 z-[1001] bg-white rounded-full p-3 shadow-lg border-2 border-slate-200 hover:border-blue-500 transition-all"
      >
        <Bell className={`w-6 h-6 ${criticalAlerts.length > 0 ? 'text-red-600 animate-pulse' : 'text-slate-600'}`} />
        {(hasUnread || criticalAlerts.length > 0) && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[1002]"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-white z-[1003] shadow-2xl transform transition-transform">
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">Emergency Alerts</h2>
                    <p className="text-xs text-red-100">{alerts.length} active message{alerts.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex gap-4 text-center">
                    {criticalAlerts.length > 0 && (
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
                        <div className="text-xs text-slate-600 uppercase font-medium">Critical</div>
                      </div>
                    )}
                    {warningAlerts.length > 0 && (
                      <div className="flex-1">
                        <div className="text-2xl font-bold text-amber-600">{warningAlerts.length}</div>
                        <div className="text-xs text-slate-600 uppercase font-medium">Warning</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {alerts.map((alert) => {
                  const Icon = SEVERITY_ICONS[alert.severity];
                  const severityClass = SEVERITY_COLORS[alert.severity];
                  const sourceColor = SOURCE_COLORS[alert.source];

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-lg p-4 border-2 ${severityClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 ${sourceColor} text-white rounded-lg flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className={`inline-block px-2 py-0.5 ${sourceColor} text-white text-xs font-bold rounded mb-1`}>
                                {alert.source}
                              </span>
                              <h3 className="font-bold text-sm">{alert.title}</h3>
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed mb-2">{alert.message}</p>

                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {alerts.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No active alerts</p>
                    <p className="text-sm">System monitoring normally</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
