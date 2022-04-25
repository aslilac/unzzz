import { ArchiveReader, assert, CENTRAL_DIRECTORY_LISTING, Mappable } from "../base";
import { LocalHeader } from "./lh";

export class CentralDirectoryListing implements Mappable {
	_begin: number;
	_end: number;

	signature: Uint8Array;
	versionMadeBy: number;
	versionNeeded: number;
	bitFlag: number;
	compressionMethod: number;
	modifiedTime: number;
	modifiedDate: number;
	crc32: number;
	compressedSize: number;
	uncompressedSize: number;
	fileNameLength: number;
	extraLength: number;
	commentLength: number;
	fileDisk: number;
	internalAttributes: number;
	externalAttributes: number;
	fileHeaderOffset: number;
	fileName: string;
	extra: Uint8Array;
	comment: Uint8Array;

	localHeader: LocalHeader;

	constructor(reader: ArchiveReader) {
		this._begin = reader.position;
		// Assert that the signature is correct
		this.signature = reader.expect(CENTRAL_DIRECTORY_LISTING);
		this.versionMadeBy = reader.readUint(2);
		this.versionNeeded = reader.readUint(2);
		this.bitFlag = reader.readUint(2);
		this.compressionMethod = reader.readUint(2);
		this.modifiedTime = reader.readUint(2);
		this.modifiedDate = reader.readUint(2);
		this.crc32 = reader.readInt(4);
		this.compressedSize = reader.readUint(4);
		this.uncompressedSize = reader.readUint(4);
		this.fileNameLength = reader.readUint(2);
		this.extraLength = reader.readUint(2);
		this.commentLength = reader.readUint(2);
		this.fileDisk = reader.readUint(2);
		this.internalAttributes = reader.readUint(2);
		this.externalAttributes = reader.readUint(4);
		this.fileHeaderOffset = reader.readUint(4);

		this.fileName = reader.readString(this.fileNameLength);
		this.extra = reader.read(this.extraLength);
		this.comment = reader.read(this.commentLength);
		this._end = reader.position;

		// Parse the corresponding local header
		this.localHeader = new LocalHeader(
			reader.clone(this.fileHeaderOffset),
			this.compressedSize,
		);

		// If the compressionMethod is "stored" then the sizes should be equal
		if (this.compressionMethod === 0) {
			assert.strictEqual(this.compressedSize, this.uncompressedSize);
		}

		// Assert that information matches in both listings
		assert.strictEqual(this.compressionMethod, this.localHeader.compressionMethod);
		assert.strictEqual(this.modifiedTime, this.localHeader.modifiedTime);
		assert.strictEqual(this.modifiedDate, this.localHeader.modifiedDate);
		assert.strictEqual(this.fileName, this.localHeader.fileName);
		assert.strictEqual(this.fileDisk, 0);

		if (this.localHeader.descriptor) {
			// These values are required to be zero when a descriptor is present.
			assert.strictEqual(this.localHeader.crc32, 0);
			assert.strictEqual(this.localHeader.compressedSize, 0);
			assert.strictEqual(this.localHeader.uncompressedSize, 0);

			assert.strictEqual(this.crc32, this.localHeader.descriptor.crc32);
			assert.strictEqual(
				this.compressedSize,
				this.localHeader.descriptor.compressedSize,
			);
			assert.strictEqual(
				this.uncompressedSize,
				this.localHeader.descriptor.uncompressedSize,
			);
		} else {
			assert.strictEqual(this.crc32, this.localHeader.crc32);
			assert.strictEqual(this.compressedSize, this.localHeader.compressedSize);
			assert.strictEqual(this.uncompressedSize, this.localHeader.uncompressedSize);
		}
	}
}
