export function viewToUint8Array(view: ArrayBuffer | ArrayBufferView) {
	if (view instanceof ArrayBuffer) {
		return new Uint8Array(view);
	}

	return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
