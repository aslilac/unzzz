/// <reference types="jest" />
import { adler32 } from "./adler";

test("adler32", () => {
	const sample = new Uint8Array([0, 1, 2, 3, 4, 5]);
	expect(adler32(sample)).toBe(0x00290010 >> 0);
	expect(adler32(sample.buffer)).toBe(0x00290010 >> 0);
});
