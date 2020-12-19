import assert from "assert";

import Reader from "./base/reader";
import Mappable from "./types/mappable";
import { CENTRAL_DIRECTORY_LISTING } from "./types/signatures";
import LocalHeader from "./lh";

export default class CentralDirectoryListing implements Mappable {
	_begin: number;
	_end: number;

	signature: Buffer;
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
	extra: Buffer;
	comment: Buffer;

	localHeader: LocalHeader;

	constructor(reader: Reader) {
		// Assert that the signature is correct
		assert(
			reader.peek(4).equals(CENTRAL_DIRECTORY_LISTING),
			"CentralDirectoryListing received reader at an invalid position",
		);

		this._begin = reader.position;
		this.signature = reader.readRaw(4);
		this.versionMadeBy = reader.readLittleEndian(2);
		this.versionNeeded = reader.readLittleEndian(2);
		this.bitFlag = reader.readLittleEndian(2);
		this.compressionMethod = reader.readLittleEndian(2);
		this.modifiedTime = reader.readLittleEndian(2);
		this.modifiedDate = reader.readLittleEndian(2);
		this.crc32 = reader.readSignedLittleEndian(4);
		this.compressedSize = reader.readLittleEndian(4);
		this.uncompressedSize = reader.readLittleEndian(4);
		this.fileNameLength = reader.readLittleEndian(2);
		this.extraLength = reader.readLittleEndian(2);
		this.commentLength = reader.readLittleEndian(2);
		this.fileDisk = reader.readLittleEndian(2);
		this.internalAttributes = reader.readLittleEndian(2);
		this.externalAttributes = reader.readLittleEndian(4);
		this.fileHeaderOffset = reader.readLittleEndian(4);

		this.fileName = reader.readString(this.fileNameLength);
		this.extra = reader.readRaw(this.extraLength);
		this.comment = reader.readRaw(this.commentLength);
		this._end = reader.position;

		// Parse the corresponding local header
		this.localHeader = new LocalHeader(
			reader.clone(this.fileHeaderOffset),
			this,
		);

		// If the compressionMethod is "stored" then the sizes should be equal
		if (this.compressionMethod === 0) {
			assert.strictEqual(this.compressedSize, this.uncompressedSize);
		}
		// Assert that information matches in both listings
		assert.strictEqual(
			this.compressionMethod,
			this.localHeader.compressionMethod,
		);
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
			assert.strictEqual(
				this.compressedSize,
				this.localHeader.compressedSize,
			);
			assert.strictEqual(
				this.uncompressedSize,
				this.localHeader.uncompressedSize,
			);
		}
	}
}
