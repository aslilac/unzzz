export function viewToUint8Array(view: ArrayBuffer | ArrayBufferView) {
	if (view instanceof ArrayBuffer) {
		return new Uint8Array(view);
	}

	return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

export function viewToSlice(view: ArrayBufferView) {
	return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
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
