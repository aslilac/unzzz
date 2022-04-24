function isNode() {
	return typeof process !== "undefined" && process.versions?.node !== undefined;
}

export async function readerToArrayBuffer(
	reader: ReadableStreamDefaultReader<ArrayBuffer>,
): Promise<ArrayBuffer> {
	const chunks = [];

	do {
		const { done, value } = await reader.read();

		if (done) break;
		chunks.push(value);
	} while (true); // eslint-disable-line no-constant-condition

	const blob = new Blob(chunks);
	return blob.arrayBuffer();
}

export function inflate(buf: ArrayBuffer): Promise<ArrayBuffer> {
	return isNode() ? inflateNode(buf) : inflateWeb(buf);
}

function inflateWeb(buf: ArrayBuffer): Promise<ArrayBuffer> {
	const inflateStream = new DecompressionStream("deflate-raw");
	// @ts-expect-error - blob.stream() returns the web-standard `ReadableStream`,
	// not a `NodeJS.ReadableStream`.
	const sourceStream: ReadableStream<Uint8Array> = new Blob([buf]).stream();
	const inflated: ReadableStreamDefaultReader<Uint8Array> = sourceStream
		.pipeThrough(inflateStream)
		.getReader();

	return readerToArrayBuffer(inflated);
}

async function inflateNode(buf: ArrayBuffer): Promise<ArrayBuffer> {
	const zlib = await import("zlib");

	return new Promise((fulfill, reject) => {
		zlib.inflateRaw(buf, (error, buffer) => {
			if (error) {
				reject(error);
				return;
			}

			fulfill(
				buffer.buffer.slice(
					buffer.byteOffset,
					buffer.byteOffset + buffer.byteLength,
				),
			);
		});
	});
}
