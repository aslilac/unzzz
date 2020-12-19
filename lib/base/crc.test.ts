import crc32 from "./crc";

test('crc32 of "123456789" is 0xcbf43926', () => {
	// We must "bit shift" the value so that it becomes
	// an i32, which is what the crc function returns.
	expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926 >> 0);
});
