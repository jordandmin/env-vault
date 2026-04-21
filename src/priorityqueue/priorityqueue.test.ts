import {
  createPriorityQueueStore,
  enqueue,
  dequeue,
  peek,
  listForVault,
  removeItem,
  queueSize,
} from './priorityqueue';

const VAULT = 'vault-1';
const OTHER_VAULT = 'vault-2';

describe('priorityqueue', () => {
  it('enqueues and dequeues a single item', () => {
    const store = createPriorityQueueStore<string>();
    enqueue(store, VAULT, 'task-a');
    const item = dequeue(store, VAULT);
    expect(item).not.toBeNull();
    expect(item!.payload).toBe('task-a');
    expect(queueSize(store, VAULT)).toBe(0);
  });

  it('dequeues in priority order: critical before high before normal before low', () => {
    const store = createPriorityQueueStore<string>();
    enqueue(store, VAULT, 'low-task', 'low');
    enqueue(store, VAULT, 'normal-task', 'normal');
    enqueue(store, VAULT, 'critical-task', 'critical');
    enqueue(store, VAULT, 'high-task', 'high');

    expect(dequeue(store, VAULT)!.payload).toBe('critical-task');
    expect(dequeue(store, VAULT)!.payload).toBe('high-task');
    expect(dequeue(store, VAULT)!.payload).toBe('normal-task');
    expect(dequeue(store, VAULT)!.payload).toBe('low-task');
  });

  it('dequeues FIFO within the same priority', () => {
    const store = createPriorityQueueStore<string>();
    enqueue(store, VAULT, 'first', 'high');
    enqueue(store, VAULT, 'second', 'high');
    expect(dequeue(store, VAULT)!.payload).toBe('first');
    expect(dequeue(store, VAULT)!.payload).toBe('second');
  });

  it('returns null when queue is empty', () => {
    const store = createPriorityQueueStore<string>();
    expect(dequeue(store, VAULT)).toBeNull();
  });

  it('peek does not remove the item', () => {
    const store = createPriorityQueueStore<string>();
    enqueue(store, VAULT, 'task', 'normal');
    const peeked = peek(store, VAULT);
    expect(peeked).not.toBeNull();
    expect(queueSize(store, VAULT)).toBe(1);
  });

  it('listForVault returns items sorted by priority', () => {
    const store = createPriorityQueueStore<string>();
    enqueue(store, VAULT, 'b', 'low');
    enqueue(store, VAULT, 'a', 'critical');
    const list = listForVault(store, VAULT);
    expect(list[0].payload).toBe('a');
    expect(list[1].payload).toBe('b');
  });

  it('isolates items by vaultId', () => {
    const store = createPriorityQueueStore<string>();
    enqueue(store, VAULT, 'v1-task');
    enqueue(store, OTHER_VAULT, 'v2-task');
    expect(queueSize(store, VAULT)).toBe(1);
    expect(queueSize(store, OTHER_VAULT)).toBe(1);
    dequeue(store, VAULT);
    expect(queueSize(store, VAULT)).toBe(0);
    expect(queueSize(store, OTHER_VAULT)).toBe(1);
  });

  it('removeItem removes a specific item by id', () => {
    const store = createPriorityQueueStore<string>();
    const item = enqueue(store, VAULT, 'removable');
    expect(removeItem(store, item.id)).toBe(true);
    expect(queueSize(store, VAULT)).toBe(0);
  });

  it('removeItem returns false for unknown id', () => {
    const store = createPriorityQueueStore<string>();
    expect(removeItem(store, 'nonexistent')).toBe(false);
  });
});
