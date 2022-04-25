import { adler32 } from "./adler";
import { ZLIB_HEADER } from "./signatures";

function useZlib() {
	return (
		typeof DecompressionStream === "undefined" &&
		typeof process !== "undefined" &&
		process.versions?.node !== undefined
	);
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
	return useZlib() ? inflateNode(buf) : inflateWeb(buf);
}

// function rawToZlib(buf: ArrayBuffer): Promise<ArrayBuffer> {
// 	const adler = new ArrayBuffer(4);
// 	const av = new DataView(adler);
// 	av.setUint32(0, adler32(buf));
// 	return new Blob([ZLIB_HEADER, buf, adler]).arrayBuffer();
// }

function inflateWeb(buf: ArrayBuffer): Promise<ArrayBuffer> {
	// This should all be removed in favor of just using deflate-raw,
	// once people actually support it
	const adlerSignature = new ArrayBuffer(4);
	const av = new DataView(adlerSignature);
	av.setUint32(0, adler32(buf));

	const inflateStream = new DecompressionStream("deflate");
	// TODO: Remove these once types are fixed eventually
	// eslint-disable-next-line
	// @ts-ignore - TypeScript (specifically @types/node) is lying
	const sourceStream: ReadableStream<Uint8Array> = new Blob([
		ZLIB_HEADER,
		buf,
		adlerSignature,
	]).stream();
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
