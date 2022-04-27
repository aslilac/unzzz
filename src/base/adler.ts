/**
 * This code is dead and should probably be removed :)
 */

import { viewToUint8Array } from "./util";

const adlerMod = 65521;

export function adler32(view: ArrayBuffer | ArrayBufferView): number {
	const data = viewToUint8Array(view);

	let a = 1;
	let b = 0;

	for (let i = 0; i < data.length; i++) {
		a = (a + data[i]!) % adlerMod;
		b = (b + a) % adlerMod;
	}

	return a | (b << 16);
}
