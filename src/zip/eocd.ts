import { ArchiveReader, assert, END_OF_CENTRAL_DIRECTORY, Mappable } from "../base";

export class EndOfCentralDirectory implements Mappable {
	_begin: number;
	_end: number;

	signature: Uint8Array;
	diskNumber: number;
	centralDirectoryStartDisk: number;
	localListingCount: number;
	globalListingCount: number;
	sizeOfCentralDirectory: number;
	startOfCentralDirectory: number;
	commentLength: number;
	comment: Uint8Array;

	constructor(reader: ArchiveReader) {
		this._begin = reader.position;
		// Assert that the signature is correct
		this.signature = reader.expect(END_OF_CENTRAL_DIRECTORY);
		this.diskNumber = reader.readUint(2);
		this.centralDirectoryStartDisk = reader.readUint(2);
		this.localListingCount = reader.readUint(2);
		this.globalListingCount = reader.readUint(2);
		this.sizeOfCentralDirectory = reader.readUint(4);
		this.startOfCentralDirectory = reader.readUint(4);
		this.commentLength = reader.readUint(2);

		this.comment = reader.read(this.commentLength);
		this._end = reader.position;

		// Assert that there is only one disk
		assert.strictEqual(this.diskNumber, 0);
		assert.strictEqual(this.centralDirectoryStartDisk, 0);
		assert.strictEqual(this.localListingCount, this.globalListingCount);
	}
}
