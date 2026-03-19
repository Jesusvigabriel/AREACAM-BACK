import { EventEmitter } from 'node:events';
import type { MotionEvent } from './types';

export type MotionEventProcessor = (event: MotionEvent) => Promise<void>;

interface QueueEvents {
  error: [unknown];
  drained: [];
}

export class MotionEventQueue extends EventEmitter {
  private queue: MotionEvent[] = [];
  private processor: MotionEventProcessor | null = null;
  private concurrency = 1;
  private active = 0;

  enqueue(event: MotionEvent): void {
    this.queue.push(event);
    this.processNext();
  }

  process(processor: MotionEventProcessor, concurrency = 1): void {
    this.processor = processor;
    this.concurrency = Math.max(1, concurrency);
    this.processNext();
  }

  private processNext(): void {
    if (!this.processor) {
      return;
    }

    while (this.active < this.concurrency && this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) {
        continue;
      }

      this.active += 1;

      Promise.resolve()
        .then(() => this.processor!(event))
        .catch((error) => {
          this.emit('error', error);
        })
        .finally(() => {
          this.active -= 1;
          if (this.queue.length === 0 && this.active === 0) {
            this.emit('drained');
          }
          this.processNext();
        });
    }
  }

  override emit<T extends keyof QueueEvents>(event: T, ...args: QueueEvents[T]): boolean {
    return super.emit(event, ...args);
  }

  override on<T extends keyof QueueEvents>(event: T, listener: (...args: QueueEvents[T]) => void): this {
    return super.on(event, listener);
  }
}
