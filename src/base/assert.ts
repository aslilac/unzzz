const FAILED_ASSERTION_MESSAGE = "Assertion failed";

export function strictEqual(
	actual: unknown,
	expected: unknown,
	message: string = FAILED_ASSERTION_MESSAGE,
): void {
	if (actual !== expected) {
		throw new Error(message);
	}
}
