import { readerToArrayBuffer } from "./util";

function useZlib() {
	return (
		typeof DecompressionStream === "undefined" &&
		typeof process !== "undefined" &&
		process.versions?.node !== undefined
	);
}

export function inflate(buf: ArrayBuffer): Promise<ArrayBuffer> {
	return useZlib() ? inflateNode(buf) : inflateWeb(buf);
}

async function inflateWeb(buf: ArrayBuffer): Promise<ArrayBuffer> {
	const inflateStream = new DecompressionStream("deflate-raw");
	// TODO: Remove these once types are fixed eventually
	// eslint-disable-next-line
	// @ts-ignore - TypeScript (specifically @types/node) is lying
	const sourceStream: ReadableStream<Uint8Array> = new Blob([buf]).stream();
	const inflated = sourceStream.pipeThrough(inflateStream).getReader();

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
