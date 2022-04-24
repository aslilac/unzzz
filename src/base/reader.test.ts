/// <reference types="jest" />
import { ArchiveReader } from "./reader";

const buf = new ArrayBuffer(256);
const u8a = new Uint8Array(buf);
for (let i = 0; i < u8a.length; i++) {
	u8a[i] = i;
}

const parent = new ArchiveReader(buf);

test("Readers can be cloned", () => {
	const reader1 = parent.clone();
	const reader2 = parent.clone(40);

	expect(reader1.position).toBe(0);
	expect(reader1.currentBuffer).toBe(buf);
	expect(reader1).not.toBe(parent);
	expect(reader2.position).toBe(40);
	expect(reader2.currentBuffer).toBe(buf);
	expect(reader2).not.toBe(parent);
});

test("Position can be changed absolutely", () => {
	const reader = parent.clone();

	reader.moveTo(0x40);
	expect(reader.readUint(4)).toBe(0x43424140);
});

test("Position can be changed relatively", () => {
	const reader = parent.clone();

	reader.moveTo(0x40);
	reader.moveBy(0x10);
	expect(reader.readUint(4)).toBe(0x53525150);

	reader.moveBy(-0x10);
	expect(reader.readUint(4)).toBe(0x47464544);
});

test("Position cannot be set out of bounds absolutely", () => {
	const reader = parent.clone();

	reader.moveTo(-1);
	expect(reader.position).toBe(0);

	reader.moveTo(buf.byteLength + 1);
	expect(reader.position).toBe(buf.byteLength - 1);
});

test("Position cannot be set out of bounds relatively", () => {
	const back = parent.clone();
	const forward = parent.clone();

	back.moveBy(-1);
	expect(back.position).toBe(0);

	forward.moveBy(buf.byteLength + 1);
	expect(forward.position).toBe(buf.byteLength - 1);
});

test("Position can be changed using findNext", () => {
	const reader = parent.clone();
	const found = reader.findNext(Buffer.from([40, 41, 42]));

	expect(found).toBe(true);
	expect(reader.position).toBe(40);
});

test("Failure of findNext is handled properly", () => {
	const reader = parent.clone();
	const found = reader.findNext(Buffer.from([40, 42, 43]));

	expect(found).toBe(false);
	expect(reader.position).toBe(0);
});

test("Can peek ahead without moving position", () => {
	const reader = parent.clone();
	const peek = reader.peek(5);

	expect(peek).toBeInstanceOf(Uint8Array);
	expect(peek).toEqual(new Uint8Array(buf, 0, 5));
	expect(reader.position).toBe(0);
});

test("Can read a raw buffer segment", () => {
	const reader = parent.clone();
	const read = reader.read(5);

	expect(read).toBeInstanceOf(Uint8Array);
	expect(read).toEqual(new Uint8Array(buf, 0, 5));
	expect(reader.position).toBe(5);
});

test("Readers can parse LE integers", () => {
	const reader = parent.clone();

	expect(reader.readUint(4)).toBe(0x03020100);
	expect(reader.position).toBe(4);
	expect(reader.readUint(2)).toBe(0x0504);
	expect(reader.position).toBe(6);
});

test("Readers can parse signed LE integers", () => {
	const reader = parent.clone(0x7d);

	// We must "bit shift" the value so that it becomes
	// an i32, which will make the number negative.
	expect(reader.readInt(4)).toBe(0x807f7e7d >> 0);
});

test("Reader can read strings", () => {
	const reader = parent.clone(65);

	expect(reader.readString(7)).toBe("ABCDEFG");
	expect(reader.position).toBe(72);
});
