const poly = 0xedb88320;
const lookup = new Uint32Array(256);

for (let i = 0; i < lookup.length; i++) {
	let crc = i;
	for (let bit = 0; bit < 8; bit++) {
		crc = crc & 1 ? (crc >>> 1) ^ poly : crc >>> 1;
	}

	lookup[i] = crc;
}

export default function crc32(data: Buffer | Uint8Array | number[]): number {
	const input = Uint8Array.from(data);

	return ~input.reduce(
		(crc, byte) => lookup[(crc ^ byte) & 0xff] ^ (crc >>> 8),
		0xffffffff,
	);
}
