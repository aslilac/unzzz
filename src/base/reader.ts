type WordSize = 1 | 2 | 4;

export class ArchiveReader {
	readonly currentBuffer: ArrayBuffer;

	constructor(buffer: ArrayBuffer, public position = 0) {
		if (!(buffer instanceof ArrayBuffer)) {
			throw new TypeError("TypeScript let you do something bad");
		}

		this.currentBuffer = buffer;
	}

	clone(position = this.position): ArchiveReader {
		return new ArchiveReader(this.currentBuffer, position);
	}

	findNext(data: Uint8Array): boolean {
		const u8v = new Uint8Array(this.currentBuffer, this.position);

		let foundAt = -1;
		for (let i = 0; i <= u8v.length - data.length; i++) {
			let mismatch = false;
			for (let j = 0; j < data.length; j++) {
				if (u8v[i + j] !== data[j]) {
					mismatch = true;
					break;
				}
			}

			if (!mismatch) {
				foundAt = i;
				break;
			}
		}

		if (~foundAt) {
			this.position += foundAt;
			return true;
		}

		return false;
	}

	moveTo(position: number): void {
		// Using min and max bounds the position to within the buffer.
		this.position = Math.max(
			0,
			Math.min(position, this.currentBuffer.byteLength - 1),
		);
	}

	moveBy(delta: number): void {
		this.moveTo(this.position + delta);
	}

	peek(length: number): Uint8Array {
		return new Uint8Array(this.currentBuffer, this.position, length);
	}

	read(length: number): Uint8Array {
		const value = this.peek(length);
		this.position += length;
		return value;
	}

	expect(data: Uint8Array) {
		const view = new Uint8Array(this.currentBuffer, this.position, data.length);

		for (let i = 0; i < data.length; i++) {
			if (view[i] !== data[i]) {
				throw new Error(`Unexpected data at ${this.position}`);
			}
		}

		this.position += data.length;
		return view;
	}

	expectMaybe(data: Uint8Array) {
		const view = new Uint8Array(this.currentBuffer, this.position, data.length);

		for (let i = 0; i < data.length; i++) {
			if (view[i] !== data[i]) {
				return null;
			}
		}

		this.position += data.length;
		return view;
	}

	readInt(length: WordSize): number {
		const dv = new DataView(this.currentBuffer, this.position);
		this.position += length;

		switch (length) {
			case 1:
				return dv.getInt8(0);
			case 2:
				return dv.getInt16(0, true);
			case 4:
				return dv.getInt32(0, true);
		}
	}

	readUint(length: WordSize): number {
		const dv = new DataView(this.currentBuffer, this.position);
		this.position += length;

		switch (length) {
			case 1:
				return dv.getUint8(0);
			case 2:
				return dv.getUint16(0, true);
			case 4:
				return dv.getUint32(0, true);
		}
	}

	readString(length: number): string {
		const decoder = new TextDecoder();
		const data = new Uint8Array(this.currentBuffer, this.position, length);
		this.position += length;
		return decoder.decode(data);
	}
}
