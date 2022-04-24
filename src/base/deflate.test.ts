/// <reference types="jest" />
import { inflate } from "./deflate";

const EXAMPLE = new Uint8Array([0x63, 0x60, 0x64, 0x62, 0x66, 0x61, 0x05, 0x00]);

test("inflate", async () => {
	expect(new Uint8Array(await inflate(EXAMPLE))).toEqual(
		new Uint8Array([0, 1, 2, 3, 4, 5]),
	);
});
