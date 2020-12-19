import Reader from "./reader";

const buffer = Buffer.alloc(256);
for (let i = 0; i < buffer.length; i++) {
	buffer[i] = i;
}

const parent = new Reader(buffer);

test("Readers can be cloned", () => {
	const reader1 = parent.clone();
	const reader2 = parent.clone(40);

	expect(reader1.position).toBe(0);
	expect(reader1.currentBuffer).toBe(buffer);
	expect(reader1).not.toBe(parent);
	expect(reader2.position).toBe(40);
	expect(reader2.currentBuffer).toBe(buffer);
	expect(reader2).not.toBe(parent);
});

test("Position can be changed absolutely", () => {
	const reader = parent.clone();

	reader.moveTo(0x40);
	expect(reader.readLittleEndian(4)).toBe(0x43424140);
});

test("Position can be changed relatively", () => {
	const reader = parent.clone();

	reader.moveTo(0x40);
	reader.moveBy(0x10);
	expect(reader.readLittleEndian(4)).toBe(0x53525150);

	reader.moveBy(-0x10);
	expect(reader.readLittleEndian(4)).toBe(0x47464544);
});

test("Position cannot be set out of bounds absolutely", () => {
	const reader = parent.clone();

	reader.moveTo(-1);
	expect(reader.position).toBe(0);

	reader.moveTo(buffer.length + 1);
	expect(reader.position).toBe(buffer.length - 1);
});

test("Position cannot be set out of bounds relatively", () => {
	const back = parent.clone();
	const forward = parent.clone();

	back.moveBy(-1);
	expect(back.position).toBe(0);

	forward.moveBy(buffer.length + 1);
	expect(forward.position).toBe(buffer.length - 1);
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

	expect(Buffer.isBuffer(peek)).toBe(true);
	expect(peek.equals(buffer.slice(0, 5))).toBe(true);
	expect(reader.position).toBe(0);
});

test("Can read a raw buffer segment", () => {
	const reader = parent.clone();
	const read = reader.readRaw(5);

	expect(Buffer.isBuffer(read)).toBe(true);
	expect(read.equals(buffer.slice(0, 5))).toBe(true);
	expect(reader.position).toBe(5);
});

test("Readers can parse LE integers", () => {
	const reader = parent.clone();

	expect(reader.readLittleEndian(4)).toBe(0x03020100);
	expect(reader.position).toBe(4);
	expect(reader.readLittleEndian(2)).toBe(0x0504);
	expect(reader.position).toBe(6);
});

test("Readers can parse signed LE integers", () => {
	const reader = parent.clone(0x7d);

	// We must "bit shift" the value so that it becomes
	// an i32, which will make the number negative.
	expect(reader.readSignedLittleEndian(4)).toBe(0x807f7e7d >> 0);
});

test("Reader can read strings", () => {
	const reader = parent.clone(65);

	expect(reader.readString(7)).toBe("ABCDEFG");
	expect(reader.position).toBe(72);
});
