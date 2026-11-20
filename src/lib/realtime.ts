import crypto from 'crypto';
import type { Response } from 'express';

interface SseClient {
  id: string;
  userId: number;
  role: string;
  res: Response;
}

interface SseTicket {
  userId: number;
  role: string;
  expiresAt: number;
}

const clients = new Map<string, SseClient>();
const tickets = new Map<string, SseTicket>();

export function issueSseTicket(userId: number, role: string): string {
  // Clean up expired tickets opportunistically
  const now = Date.now();
  for (const [key, ticket] of tickets.entries()) {
    if (ticket.expiresAt < now) {
      tickets.delete(key);
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  tickets.set(token, {
    userId,
    role,
    expiresAt: now + 60_000, // 60 seconds single-use ticket
  });
  return token;
}

export function consumeSseTicket(token: string): SseTicket | null {
  const ticket = tickets.get(token);
  if (!ticket) return null;
  tickets.delete(token);
  if (ticket.expiresAt < Date.now()) return null;
  return ticket;
}

export function registerSseClient(
  userId: number,
  role: string,
  res: Response
): string {
  const id = crypto.randomUUID();
  clients.set(id, { id, userId, role, res });
  return id;
}

export function removeSseClient(id: string): void {
  clients.delete(id);
}

export function broadcastEvent(
  eventType: string,
  payload: Record<string, unknown>,
  targetUserIds?: number[]
): void {
  const serialized = `event: ${eventType}\ndata: ${JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  })}\n\n`;

  for (const [id, client] of clients.entries()) {
    if (targetUserIds && !targetUserIds.includes(client.userId)) {
      continue;
    }
    try {
      client.res.write(serialized);
    } catch {
      clients.delete(id);
    }
  }
}
