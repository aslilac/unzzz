/// <reference types="jest" />
import { crc32 } from "./crc";

test('crc32 of "123456789" is 0xcbf43926', () => {
	const encoder = new TextEncoder();
	const sample1 = encoder.encode("123456789");
	expect(crc32(sample1)).toBe(0xcbf43926 >> 0);
	expect(crc32(sample1.buffer)).toBe(0xcbf43926 >> 0);
	const sample2 = encoder.encode("12345678");
	expect(crc32(new Uint32Array(sample2))).toBe(0x4606d255 >> 0);
});
