import unzzz from "./unzzz";

interface MockFile {
	fileName: string;
	descriptor?: boolean;
	descriptorSignature?: boolean;
	_fileHeaderOffset?: number; // filled in by mock
}

function mock(...files: MockFile[]) {
	let position = 0;

	// Create local headers
	const l = Buffer.concat(
		files.map((details) => {
			const descriptor = Buffer.from([
				0,
				0,
				0,
				0, // crc32
				5,
				0,
				0,
				0, // compressedSize
				5,
				0,
				0,
				0, // uncompressedSize
			]);

			const lh = Buffer.from([
				// LocalHeader
				// ===========
				0x50,
				0x4b,
				0x03,
				0x04, // signature
				20,
				0, // versionNeeded
				details.descriptor ? 8 : 0,
				0, // bitFlag
				0,
				0, // compressionMethod
				1,
				2, // modifiedTime
				3,
				4, // modifiedDate
				0,
				0,
				0,
				0, // crc32
				details.descriptor ? 0 : 5,
				0,
				0,
				0, // compressedSize
				details.descriptor ? 0 : 5,
				0,
				0,
				0, // uncompressedSize
				details.fileName.length,
				0, // fileNameLength
				0,
				0, // extraLength
				...Buffer.from(details.fileName), // fileName
				// extra
				...Buffer.alloc(5),
				...(details.descriptorSignature
					? [0x50, 0x4b, 0x07, 0x08]
					: []),
				...(details.descriptor ? descriptor : []),
			]);

			details._fileHeaderOffset = position;
			position += lh.length;

			return lh;
		}),
	);

	// Create central directory listings
	const cd = Buffer.concat(
		files.map((details) => {
			const offset = Buffer.alloc(4);
			offset.writeUInt32LE(details._fileHeaderOffset);

			const cdl = Buffer.from([
				// CentralDirectoryListing
				// =======================
				0x50,
				0x4b,
				0x01,
				0x02, // signature
				20,
				0, // versionMadeBy
				20,
				0, // versionNeeded
				0,
				0, // bitFlag
				0,
				0, // compressionMethod
				1,
				2, // modifiedTime
				3,
				4, // modifiedDate
				0,
				0,
				0,
				0, // crc32
				5,
				0,
				0,
				0, // compressedSize
				5,
				0,
				0,
				0, // uncompressedSize
				details.fileName.length,
				0, // fileNameLength
				0,
				0, // extraLength
				0,
				0, // commentLength
				0,
				0, // fileDisk
				0,
				0, // internalAttributes
				0,
				0,
				0,
				0, // externalAttributes
				...offset, // _fileHeaderOffset
				...Buffer.from(details.fileName), // fileName
				// extra
				// comment
			]);

			return cdl;
		}),
	);

	const cdPositioning = Buffer.alloc(8);
	cdPositioning.writeUInt32LE(cd.length); // sizeOfCentralDirectory
	cdPositioning.writeUInt32LE(l.length, 4); // startOfCentralDirectory

	const eocd = Buffer.from([
		// EndOfCentralDirectory
		// =====================
		0x50,
		0x4b,
		0x05,
		0x06, // signature
		0,
		0, // diskNumber
		0,
		0, // centralDirectoryStartDisk
		files.length,
		0, // localListingCount
		files.length,
		0, // globalListingCount
		...cdPositioning,
		0,
		0, // commentLength
		// comment
	]);

	return Buffer.concat([l, cd, eocd]);
}

test("Mocked archive is parsed properly", async () => {
	const sample = mock(
		{
			fileName: "a",
		},
		{
			fileName: "b",
			descriptor: true,
		},
		{
			fileName: "c",
			descriptor: true,
			descriptorSignature: true,
		},
	);

	const archive = await unzzz(sample);
	expect(Object.keys(archive.files)).toContainEqual(["a", "b", "c"]);
});
