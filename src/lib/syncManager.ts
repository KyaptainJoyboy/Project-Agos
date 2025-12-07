import { offlineDB } from './db';
import { supabase } from './supabase';

class SyncManager {
  private syncInProgress = false;
  private syncInterval: number | null = null;

  async startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncAll().catch(console.error);
      }
    }, intervalMs);

    if (navigator.onLine) {
      await this.syncAll();
    }
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      await this.syncMessages();
      await this.syncLocations();
      await this.syncRoadReports();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncMessages() {
    const messages = await offlineDB.getPendingMessages();

    for (const message of messages) {
      try {
        await offlineDB.updateMessageSyncStatus(message.id, 'syncing');

        const { error } = await supabase.from('messages').insert({
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          recipient_id: message.recipientId || null,
          message_type: message.messageType,
          subject: message.subject,
          content: message.content,
          priority: message.priority,
          sync_status: 'synced',
        });

        if (error) throw error;

        await offlineDB.deletePendingMessage(message.id);
      } catch (error) {
        console.error('Failed to sync message:', error);
        await offlineDB.updateMessageSyncStatus(message.id, 'failed');
      }
    }
  }

  async syncLocations() {
    const locations = await offlineDB.getPendingLocations();

    for (const location of locations) {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) continue;

        const { error } = await supabase.from('evacuee_locations').insert({
          user_id: userId,
          location: `POINT(${location.longitude} ${location.latitude})`,
          accuracy_meters: location.accuracy,
          battery_level: location.batteryLevel,
          is_emergency: location.isEmergency,
          status_message: location.statusMessage,
        });

        if (error) throw error;

        await offlineDB.deletePendingLocation(location.id);
      } catch (error) {
        console.error('Failed to sync location:', error);
      }
    }
  }

  async syncRoadReports() {
    const reports = await offlineDB.getPendingRoadReports();

    for (const report of reports) {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) continue;

        const lineString = report.location.map(coord => `${coord.lng} ${coord.lat}`).join(',');

        const { error } = await supabase.from('road_conditions').insert({
          road_name: report.roadName,
          location: `LINESTRING(${lineString})`,
          status: report.status,
          severity: report.severity,
          description: report.description,
          photo_url: report.photoUrl,
          reported_by: userId,
          is_verified: false,
        });

        if (error) throw error;

        await offlineDB.deleteRoadConditionReport(report.id);
      } catch (error) {
        console.error('Failed to sync road report:', error);
      }
    }
  }

  async requestBackgroundSync(tag: string) {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
      } catch (error) {
        console.error('Background sync registration failed:', error);
        await this.syncAll();
      }
    } else {
      await this.syncAll();
    }
  }
}

export const syncManager = new SyncManager();
