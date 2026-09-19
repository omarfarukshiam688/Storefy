export type OrderEventType =
  | 'order.created'
  | 'order.confirmed'
  | 'order.processing'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  | 'payment.updated';

export interface OrderEvent {
  type: OrderEventType;
  orderId: string;
  tenantId: string;
  previousStatus?: string;
  nextStatus?: string;
  timestamp: string;
}

type OrderEventHandler = (event: OrderEvent) => void;

const handlers: Set<OrderEventHandler> = new Set();

export function onOrderEvent(handler: OrderEventHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitOrderEvent(event: OrderEvent): void {
  for (const handler of handlers) {
    try {
      handler(event);
    } catch {
      // Prevent a single failing handler from breaking others
    }
  }
}
