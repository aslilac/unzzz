import Reader from "./base/reader";
import Mappable from "./types/mappable";
import { END_OF_CENTRAL_DIRECTORY } from "./types/signatures";

import logger from "./base/log";
const log = logger.scope("eocd");

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
		log.assert(
			reader.peek(4).equals(END_OF_CENTRAL_DIRECTORY),
			"EndOfCentralDirectory received reader at an invalid position",
		);

		Object.assign(this, {
			_begin: reader.position,
			signature: reader.readRaw(4),
			diskNumber: reader.readLittleEndian(2),
			centralDirectoryStartDisk: reader.readLittleEndian(2),
			localListingCount: reader.readLittleEndian(2),
			globalListingCount: reader.readLittleEndian(2),
			sizeOfCentralDirectory: reader.readLittleEndian(4),
			startOfCentralDirectory: reader.readLittleEndian(4),
			commentLength: reader.readLittleEndian(2),
		});

		Object.assign(this, {
			comment: reader.readRaw(this.commentLength),
			_end: reader.position,
		});

		// Assert that there is only one disk
		log.assert_eq(this.diskNumber, 0);
		log.assert_eq(this.centralDirectoryStartDisk, 0);
		log.assert_eq(this.localListingCount, this.globalListingCount);
	}
}
