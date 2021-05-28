export default class BufferReader {
	readonly currentBuffer: Buffer;

	constructor(buffer: Buffer, private _position = 0) {
		this.currentBuffer = buffer;
	}

	clone(position = this._position): BufferReader {
		return new BufferReader(this.currentBuffer, position);
	}

	findNext(data: Buffer): boolean {
		const foundAt = this.currentBuffer.slice(this.position).indexOf(data);

		if (~foundAt) {
			this._position += foundAt;
			return true;
		}

		return false;
	}

	moveTo(position: number): void {
		// Using min and max bounds the position to within the buffer.
		this._position = Math.max(0, Math.min(position, this.currentBuffer.length - 1));
	}

	moveBy(position: number): void {
		this.moveTo(this._position + position);
	}

	get position(): number {
		return this._position;
	}

	peek(length: number): Buffer {
		return this.currentBuffer.slice(this.position, this.position + length);
	}

	readRaw(length: number): Buffer {
		const value = this.peek(length);
		this._position += length;
		return value;
	}

	readSignedLittleEndian(length: number): number {
		const le = this.currentBuffer.readIntLE(this.position, length);
		this._position += length;
		return le;
	}

	readLittleEndian(length: number): number {
		const le = this.currentBuffer.readUIntLE(this.position, length);
		this._position += length;
		return le;
	}

	readString(length: number, encoding: BufferEncoding = "utf-8"): string {
		return this.readRaw(length).toString(encoding);
	}
}
