declare global {
	interface DecompressionStream {
		new (algorithm: string): TransformStream<Uint8Array, Uint8Array>;
	}

	const DecompressionStream: DecompressionStream;
}

export {};
