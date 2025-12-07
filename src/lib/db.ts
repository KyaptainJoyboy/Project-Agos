const DB_NAME = 'agos-db';
const DB_VERSION = 1;

export interface PendingMessage {
  id: string;
  recipientId?: string;
  messageType: 'broadcast' | 'direct' | 'alert';
  subject?: string;
  content: string;
  priority: number;
  timestamp: number;
  syncStatus: 'pending' | 'syncing' | 'failed';
}

export interface CachedRoute {
  id: string;
  routeData: any;
  geometry: any;
  timestamp: number;
  version: number;
}

export interface PendingLocation {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryLevel?: number;
  isEmergency: boolean;
  statusMessage?: string;
  timestamp: number;
}

export interface RoadConditionReport {
  id: string;
  roadName: string;
  location: { lat: number; lng: number }[];
  status: 'passable' | 'flooded' | 'blocked' | 'unknown';
  severity: number;
  description?: string;
  photoUrl?: string;
  timestamp: number;
  syncStatus: 'pending' | 'syncing' | 'failed';
}

export interface DownloadedPackage {
  id: string;
  name: string;
  version: string;
  routeIds: string[];
  downloadedAt: number;
  sizeBytes: number;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('pendingMessages')) {
          const messageStore = db.createObjectStore('pendingMessages', { keyPath: 'id' });
          messageStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedRoutes')) {
          const routeStore = db.createObjectStore('cachedRoutes', { keyPath: 'id' });
          routeStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingLocations')) {
          const locationStore = db.createObjectStore('pendingLocations', { keyPath: 'id' });
          locationStore.createIndex('timestamp', 'timestamp', { unique: false });
          locationStore.createIndex('isEmergency', 'isEmergency', { unique: false });
        }

        if (!db.objectStoreNames.contains('roadConditionReports')) {
          const reportStore = db.createObjectStore('roadConditionReports', { keyPath: 'id' });
          reportStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          reportStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('downloadedPackages')) {
          const packageStore = db.createObjectStore('downloadedPackages', { keyPath: 'id' });
          packageStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('mapTiles')) {
          db.createObjectStore('mapTiles', { keyPath: 'url' });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async addPendingMessage(message: PendingMessage): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingMessages', 'readwrite');
      const store = transaction.objectStore('pendingMessages');
      const request = store.add(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingMessages(): Promise<PendingMessage[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingMessages', 'readonly');
      const store = transaction.objectStore('pendingMessages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateMessageSyncStatus(id: string, status: 'pending' | 'syncing' | 'failed'): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingMessages', 'readwrite');
      const store = transaction.objectStore('pendingMessages');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const message = getRequest.result;
        if (message) {
          message.syncStatus = status;
          const updateRequest = store.put(message);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deletePendingMessage(id: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingMessages', 'readwrite');
      const store = transaction.objectStore('pendingMessages');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cacheRoute(route: CachedRoute): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cachedRoutes', 'readwrite');
      const store = transaction.objectStore('cachedRoutes');
      const request = store.put(route);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedRoute(id: string): Promise<CachedRoute | null> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cachedRoutes', 'readonly');
      const store = transaction.objectStore('cachedRoutes');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedRoutes(): Promise<CachedRoute[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cachedRoutes', 'readonly');
      const store = transaction.objectStore('cachedRoutes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async addPendingLocation(location: PendingLocation): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingLocations', 'readwrite');
      const store = transaction.objectStore('pendingLocations');
      const request = store.add(location);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingLocations(): Promise<PendingLocation[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingLocations', 'readonly');
      const store = transaction.objectStore('pendingLocations');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePendingLocation(id: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingLocations', 'readwrite');
      const store = transaction.objectStore('pendingLocations');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addRoadConditionReport(report: RoadConditionReport): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roadConditionReports', 'readwrite');
      const store = transaction.objectStore('roadConditionReports');
      const request = store.add(report);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingRoadReports(): Promise<RoadConditionReport[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roadConditionReports', 'readonly');
      const store = transaction.objectStore('roadConditionReports');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRoadConditionReport(id: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('roadConditionReports', 'readwrite');
      const store = transaction.objectStore('roadConditionReports');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addDownloadedPackage(pkg: DownloadedPackage): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('downloadedPackages', 'readwrite');
      const store = transaction.objectStore('downloadedPackages');
      const request = store.put(pkg);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDownloadedPackages(): Promise<DownloadedPackage[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('downloadedPackages', 'readonly');
      const store = transaction.objectStore('downloadedPackages');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDownloadedPackage(id: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('downloadedPackages', 'readwrite');
      const store = transaction.objectStore('downloadedPackages');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldData(daysOld: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const db = this.ensureDB();

    const stores = ['pendingMessages', 'pendingLocations', 'roadConditionReports'];

    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(cutoffTime);
        const request = index.openCursor(range);

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    }
  }
}

export const offlineDB = new OfflineDB();
