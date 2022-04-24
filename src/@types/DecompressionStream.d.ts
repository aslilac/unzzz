declare global {
	interface CompressionStream {
		new (algorithm: string): TransformStream<Uint8Array, Uint8Array>;
	}
	interface DecompressionStream {
		new (algorithm: string): TransformStream<Uint8Array, Uint8Array>;
	}

	const DecompressionStream: DecompressionStream;
}

export {};
