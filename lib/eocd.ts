import assert from "assert";

import Reader from "./base/reader";
import Mappable from "./types/mappable";
import { END_OF_CENTRAL_DIRECTORY } from "./types/signatures";

export default class EndOfCentralDirectory implements Mappable {
	_begin: number;
	_end: number;

	signature: Buffer;
	diskNumber: number;
	centralDirectoryStartDisk: number;
	localListingCount: number;
	globalListingCount: number;
	sizeOfCentralDirectory: number;
	startOfCentralDirectory: number;
	commentLength: number;
	comment: Buffer;

	constructor(reader: Reader) {
		// Assert that the signature is correct
		assert(
			reader.peek(4).equals(END_OF_CENTRAL_DIRECTORY),
			"EndOfCentralDirectory received reader at an invalid position",
		);

		this._begin = reader.position;
		this.signature = reader.readRaw(4);
		this.diskNumber = reader.readLittleEndian(2);
		this.centralDirectoryStartDisk = reader.readLittleEndian(2);
		this.localListingCount = reader.readLittleEndian(2);
		this.globalListingCount = reader.readLittleEndian(2);
		this.sizeOfCentralDirectory = reader.readLittleEndian(4);
		this.startOfCentralDirectory = reader.readLittleEndian(4);
		this.commentLength = reader.readLittleEndian(2);

		this.comment = reader.readRaw(this.commentLength);
		this._end = reader.position;

		// Assert that there is only one disk
		assert.strictEqual(this.diskNumber, 0);
		assert.strictEqual(this.centralDirectoryStartDisk, 0);
		assert.strictEqual(this.localListingCount, this.globalListingCount);
	}
}
