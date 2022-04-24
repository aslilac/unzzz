const poly = 0xedb88320;
const lookup = new Uint32Array(256);

for (let i = 0; i < lookup.length; i++) {
	let crc = i;
	for (let bit = 0; bit < 8; bit++) {
		crc = crc & 1 ? (crc >>> 1) ^ poly : crc >>> 1;
	}

	lookup[i] = crc;
}

function viewToUint8Array(view: ArrayBuffer | ArrayBufferView) {
	if (view instanceof ArrayBuffer) {
		return new Uint8Array(view);
	}

	return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

export function crc32(data: ArrayBuffer | ArrayBufferView): number {
	const view = viewToUint8Array(data);
	return ~view.reduce(
		(crc, byte) => lookup[(crc ^ byte) & 0xff]! ^ (crc >>> 8),
		0xffffffff,
	);
}
