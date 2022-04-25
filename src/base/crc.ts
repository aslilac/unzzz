import { viewToUint8Array } from "./util";

const poly = 0xedb88320;
const lookup = new Uint32Array(256);

for (let i = 0; i < lookup.length; i++) {
	let crc = i;
	for (let bit = 0; bit < 8; bit++) {
		crc = crc & 1 ? (crc >>> 1) ^ poly : crc >>> 1;
	}

	lookup[i] = crc;
}

export function crc32(view: ArrayBuffer | ArrayBufferView): number {
	const data = viewToUint8Array(view);
	return ~data.reduce(
		(crc, byte) => lookup[(crc ^ byte) & 0xff]! ^ (crc >>> 8),
		0xffffffff,
	);
}
