// Offline Queue & Sync Manager for Cuadrilla App
export interface OfflineAction {
  id: string;
  type: 'RESOLVER_REPORTE' | 'REGISTRAR_TONELADAS' | 'RECHAZAR_REPORTE';
  payload: any;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'aseo_cuadrilla_offline_queue_v1';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error leyendo cola offline:', err);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error guardando cola offline:', err);
  }
}

export function addOfflineAction(type: OfflineAction['type'], payload: any): OfflineAction {
  const queue = getOfflineQueue();
  const action: OfflineAction = {
    id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(action);
  saveOfflineQueue(queue);
  return action;
}

export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);
}

export function clearOfflineQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function processOfflineQueue(
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  const remainingQueue: OfflineAction[] = [];

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      if (action.type === 'RESOLVER_REPORTE') {
        const res = await fetch('/api/cuadrilla/reportes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        successCount++;
      } else if (action.type === 'REGISTRAR_TONELADAS') {
        const res = await fetch('/api/cuadrilla/toneladas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        successCount++;
      } else if (action.type === 'RECHAZAR_REPORTE') {
        const res = await fetch('/api/cuadrilla/reportes/rechazar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        successCount++;
      }
    } catch (err) {
      console.warn(`Error procesando acción offline ${action.id}:`, err);
      failedCount++;
      action.retries += 1;
      remainingQueue.push(action);
    }

    if (onProgress) {
      onProgress(i + 1, queue.length);
    }
  }

  saveOfflineQueue(remainingQueue);
  return { success: successCount, failed: failedCount };
}
