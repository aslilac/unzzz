// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function strictEqual(actual: any, expected: any, message?: string): void {
	if (actual !== expected) {
		throw new Error(message || `Expected ${actual} to equal ${expected}`);
	}
}
