import { create } from 'zustand';

interface ServiceWorkerStore {
  portExists: boolean;
  heartbeat: number;
  status: 'ok' | 'not_running';

  update(portExists: boolean, heartbeat: number): void;
  _getStatus(): 'ok' | 'not_running';
}

export const useServiceWorkerStore = create<ServiceWorkerStore>((set, get) => ({
  portExists: false,
  heartbeat: 0,
  status: 'not_running',

  update(portExists: boolean, heartbeat: number): void {
    const status = get()._getStatus();
    set({ portExists, heartbeat, status });
  },

  _getStatus() {
    const { portExists, heartbeat } = get();
    const now = Date.now();
    const noResponseTimeout = 1000 * 3;
    const isOK = portExists && heartbeat > 0 && now - heartbeat < noResponseTimeout;
    return isOK ? 'ok' : 'not_running';
  },
}));
