import {
  createEventBusStore,
  subscribe,
  unsubscribe,
  publish,
  getSubscriberCount,
  clearEvent,
  clearAll,
} from "./eventbus";

describe("eventbus", () => {
  it("subscribes and receives published events", async () => {
    const store = createEventBusStore();
    const received: string[] = [];
    subscribe<string>(store, "test.event", (p) => { received.push(p); });
    await publish(store, "test.event", "hello");
    expect(received).toEqual(["hello"]);
  });

  it("supports multiple handlers for the same event", async () => {
    const store = createEventBusStore();
    const calls: number[] = [];
    subscribe(store, "ev", () => { calls.push(1); });
    subscribe(store, "ev", () => { calls.push(2); });
    await publish(store, "ev", null);
    expect(calls).toHaveLength(2);
  });

  it("unsubscribes a specific handler", async () => {
    const store = createEventBusStore();
    const calls: number[] = [];
    const handler = () => { calls.push(1); };
    subscribe(store, "ev", handler);
    unsubscribe(store, "ev", handler);
    await publish(store, "ev", null);
    expect(calls).toHaveLength(0);
  });

  it("returns an unsubscribe function from subscribe", async () => {
    const store = createEventBusStore();
    const calls: number[] = [];
    const off = subscribe(store, "ev", () => { calls.push(1); });
    off();
    await publish(store, "ev", null);
    expect(calls).toHaveLength(0);
  });

  it("does nothing when publishing to event with no subscribers", async () => {
    const store = createEventBusStore();
    await expect(publish(store, "no.listeners", "data")).resolves.toBeUndefined();
  });

  it("getSubscriberCount returns correct count", () => {
    const store = createEventBusStore();
    expect(getSubscriberCount(store, "ev")).toBe(0);
    subscribe(store, "ev", () => {});
    subscribe(store, "ev", () => {});
    expect(getSubscriberCount(store, "ev")).toBe(2);
  });

  it("clearEvent removes all handlers for an event", async () => {
    const store = createEventBusStore();
    const calls: number[] = [];
    subscribe(store, "ev", () => { calls.push(1); });
    clearEvent(store, "ev");
    await publish(store, "ev", null);
    expect(calls).toHaveLength(0);
  });

  it("clearAll removes all handlers for all events", async () => {
    const store = createEventBusStore();
    const calls: number[] = [];
    subscribe(store, "a", () => { calls.push(1); });
    subscribe(store, "b", () => { calls.push(2); });
    clearAll(store);
    await publish(store, "a", null);
    await publish(store, "b", null);
    expect(calls).toHaveLength(0);
  });

  it("awaits async handlers before resolving", async () => {
    const store = createEventBusStore();
    const order: string[] = [];
    subscribe(store, "async.ev", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push("handler");
    });
    await publish(store, "async.ev", null);
    order.push("after");
    expect(order).toEqual(["handler", "after"]);
  });
});
