import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function ConnectivityStatus() {
  const isOnline = useOnlineStatus();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      isOnline
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-amber-50 text-amber-700 border border-amber-200'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}

export function SyncStatus({ isSyncing }: { isSyncing: boolean }) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-600">
        <CloudOff className="w-4 h-4" />
        <span>Sync Paused</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700">
        <Cloud className="w-4 h-4 animate-pulse" />
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-green-50 text-green-700">
      <Cloud className="w-4 h-4" />
      <span>Synced</span>
    </div>
  );
}
