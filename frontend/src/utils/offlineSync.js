import apiClient from '../api/client';

const OFFLINE_QUEUE_KEY = 'weintern_offline_attendance_queue';

export const offlineSync = {
  // Save an attendance record to offline queue
  enqueue: (attendanceRecord) => {
    try {
      const existing = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      const item = {
        ...attendanceRecord,
        queued_at: new Date().toISOString()
      };
      existing.push(item);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing));
      console.log(`Queued offline attendance for ${item.employee_id}. Total queued: ${existing.length}`);
      return item;
    } catch (e) {
      console.error('Failed to enqueue offline attendance:', e);
      return null;
    }
  },

  // Get current queue count
  getQueueCount: () => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      return queue.length;
    } catch {
      return 0;
    }
  },

  // Flush and sync all queued offline records to the backend
  syncQueue: async () => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      if (queue.length === 0) return { synced_count: 0 };

      console.log(`Attempting to sync ${queue.length} offline attendance records...`);
      const res = await apiClient.post('/attendance/sync-offline', queue);
      
      // Clear queue on success
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log(`Successfully synced ${res.data.synced_count} records.`);
      return res.data;
    } catch (e) {
      console.warn('Offline sync failed (will retry on next reconnection):', e);
      return { synced_count: 0, error: e.message };
    }
  },

  // Auto-listen to network reconnection events
  initAutoSyncListener: () => {
    window.addEventListener('online', () => {
      console.log('Internet connection restored. Triggering offline sync...');
      offlineSync.syncQueue();
    });
  }
};
