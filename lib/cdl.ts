import logger from "./base/log";
import Reader from "./base/reader";
import Mappable from "./types/mappable";
import { CENTRAL_DIRECTORY_LISTING } from "./types/signatures";
import LocalHeader from "./lh";

const log = logger.scope("cdl");

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
		log.assert(
			reader.peek(4).equals(CENTRAL_DIRECTORY_LISTING),
			"CentralDirectoryListing received reader at an invalid position",
		);

		Object.assign(this, {
			_begin: reader.position,
			signature: reader.readRaw(4),
			versionMadeBy: reader.readLittleEndian(2),
			versionNeeded: reader.readLittleEndian(2),
			bitFlag: reader.readLittleEndian(2),
			compressionMethod: reader.readLittleEndian(2),
			modifiedTime: reader.readLittleEndian(2),
			modifiedDate: reader.readLittleEndian(2),
			crc32: reader.readSignedLittleEndian(4),
			compressedSize: reader.readLittleEndian(4),
			uncompressedSize: reader.readLittleEndian(4),
			fileNameLength: reader.readLittleEndian(2),
			extraLength: reader.readLittleEndian(2),
			commentLength: reader.readLittleEndian(2),
			fileDisk: reader.readLittleEndian(2),
			internalAttributes: reader.readLittleEndian(2),
			externalAttributes: reader.readLittleEndian(4),
			fileHeaderOffset: reader.readLittleEndian(4),
		});

		Object.assign(this, {
			fileName: reader.readString(this.fileNameLength),
			extra: reader.readRaw(this.extraLength),
			comment: reader.readRaw(this.commentLength),
			_end: reader.position,
		});

		// Parse the corresponding local header
		this.localHeader = new LocalHeader(
			reader.clone(this.fileHeaderOffset),
			this,
		);

		// If the compressionMethod is "stored" then the sizes should be equal
		if (this.compressionMethod === 0) {
			log.assert_eq(this.compressedSize, this.uncompressedSize);
		}
		// Assert that information matches in both listings
		log.assert_eq(
			this.compressionMethod,
			this.localHeader.compressionMethod,
		);
		log.assert_eq(this.modifiedTime, this.localHeader.modifiedTime);
		log.assert_eq(this.modifiedDate, this.localHeader.modifiedDate);
		log.assert_eq(this.fileName, this.localHeader.fileName);
		log.assert_eq(this.fileDisk, 0);

		if (this.localHeader.descriptor) {
			// These values are required to be zero when a descriptor is present.
			log.assert_eq(this.localHeader.crc32, 0);
			log.assert_eq(this.localHeader.compressedSize, 0);
			log.assert_eq(this.localHeader.uncompressedSize, 0);

			log.assert_eq(this.crc32, this.localHeader.descriptor.crc32);
			log.assert_eq(
				this.compressedSize,
				this.localHeader.descriptor.compressedSize,
			);
			log.assert_eq(
				this.uncompressedSize,
				this.localHeader.descriptor.uncompressedSize,
			);
		} else {
			log.assert_eq(this.crc32, this.localHeader.crc32);
			log.assert_eq(this.compressedSize, this.localHeader.compressedSize);
			log.assert_eq(
				this.uncompressedSize,
				this.localHeader.uncompressedSize,
			);
		}
	}
}
