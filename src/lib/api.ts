import { auth } from './firebase';

let pendingPreferredRole: string | null = null;

export function setPendingPreferredRole(role: string | null) {
  pendingPreferredRole = role;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${idToken}`);
  }

  if (pendingPreferredRole) {
    headers.set('x-preferred-role', pendingPreferredRole);
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function connectRealtimeStream(
  onEvent: (eventName: string, data: unknown) => void
): Promise<() => void> {
  try {
    const { ticket } = await apiRequest<{ ticket: string }>('/auth/sse-ticket', {
      method: 'POST',
    });

    const source = new EventSource(`/api/events?ticket=${encodeURIComponent(ticket)}`);

    const events = [
      'doubt:created',
      'doubt:updated',
      'quiz:created',
      'quiz:submitted',
      'classroom:updated',
      'announcement:created',
      'material:created',
    ];

    for (const evt of events) {
      source.addEventListener(evt, (e) => {
        try {
          const parsed = JSON.parse((e as MessageEvent).data);
          onEvent(evt, parsed);
        } catch {
          onEvent(evt, {});
        }
      });
    }

    return () => {
      source.close();
    };
  } catch {
    return () => {};
  }
}
