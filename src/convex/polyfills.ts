// Polyfill MessageChannel without using node:events.
// Only used in Convex's non-browser runtime; implements just enough of the
// MessagePort surface for libraries that feature-detect it.
if (typeof MessageChannel === 'undefined') {
	class MockMessagePort implements MessagePort {
		onmessage: ((ev: MessageEvent) => void) | null = null;
		onmessageerror: ((ev: MessageEvent) => void) | null = null;

		postMessage(): void {}
		start(): void {}
		close(): void {}
		addEventListener(): void {}
		removeEventListener(): void {}

		dispatchEvent(): boolean {
			return false;
		}
	}

	class MockMessageChannel implements MessageChannel {
		readonly port1: MessagePort;
		readonly port2: MessagePort;

		constructor() {
			this.port1 = new MockMessagePort() as MessagePort;
			this.port2 = new MockMessagePort() as MessagePort;
		}
	}

	globalThis.MessageChannel = MockMessageChannel as unknown as typeof MessageChannel;
}
