import {
	ArchiveReader,
	assert,
	LOCAL_HEADER,
	LOCAL_HEADER_DESCRIPTOR,
	Mappable,
} from "../base";

export interface Descriptor extends Mappable {
	_begin: number;
	_end: number;

	signature: Uint8Array | null;
	crc32: number;
	compressedSize: number;
	uncompressedSize: number;
}

export class LocalHeader implements Mappable {
	_begin: number;
	_end: number;

	signature: Uint8Array;
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
	fileName: string;
	extra: Uint8Array;

	startOfCompressedFile: number;
	endOfCompressedFile: number;

	descriptor?: Descriptor;

	constructor(reader: ArchiveReader, compressedDataSize: number) {
		this._begin = reader.position;
		// Assert that the signature is correct
		this.signature = reader.expect(LOCAL_HEADER);
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

		this.fileName = reader.readString(this.fileNameLength);
		this.extra = reader.read(this.extraLength);

		// Store the beginning and ending positions of the compressed data
		this.startOfCompressedFile = reader.position;
		// We read `compressedSize` from `cdl` instead of `this` because local
		// headers are not guarenteed to have it, but the central directory is.
		reader.moveBy(compressedDataSize);
		this.endOfCompressedFile = reader.position;

		// Check if this file has a data descriptor after the compressed data
		if (this.bitFlag & 8) {
			// These should all be zero if there is a descriptor
			assert.strictEqual(this.crc32, 0);
			assert.strictEqual(this.compressedSize, 0);
			assert.strictEqual(this.uncompressedSize, 0);

			this.descriptor = {
				_begin: this.endOfCompressedFile,
				signature: reader.expectMaybe(LOCAL_HEADER_DESCRIPTOR),
				crc32: reader.readUint(4),
				compressedSize: reader.readUint(4),
				uncompressedSize: reader.readUint(4),
				_end: reader.position,
			};
		}

		// We lump the compressed data (and optional descriptor) in with the
		// local header so that it is easier to account for in our map validation.
		this._end = this.descriptor ? this.descriptor._end : this.endOfCompressedFile;
	}
}
