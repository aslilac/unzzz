import assert from "assert";

import { ArchiveReader, crc32, END_OF_CENTRAL_DIRECTORY, inflate } from "./base";
import CentralDirectoryListing from "./cdl";
import EndOfCentralDirectory from "./eocd";

// export type ArchiveFiles = Record<string, CentralDirectoryListing>;
export type ArchiveFiles = Map<string, CentralDirectoryListing>;
export type ArchiveMap = Record<number, number>;

/**
 * **Notice:** Not to be used for directly decompressing archives. For that, use
 * the [[unzzz]] function documented below. This type is for developing plugins
 * that can extend the number of supported compression methods.
 *
 * A function that can be used by unzzz to decompress a buffer and extract a file
 * from an archive.
 *
 * *The `cdl` parameter can sometimes be ignored, but certain compression methods
 * will set values on this object (such as the `bitFlags` property) that must be
 * used by the decompressor.*
 */
export type Decompressor = (
	compressed: ArrayBuffer,
	cdl: CentralDirectoryListing,
) => Promise<ArrayBuffer>;

export class Unzzz {
	/**
	 * A map which relates the name of a file in the archive to some interal
	 * details used to extract the file. If you wish to iterate over all of the
	 * items in an archive, this provides an easy way to do it.
	 *
	 * You don't need to worry about the values stored in the object, only the
	 * names of the keys.
	 *
	 * ```JavaScript
	 * for (const file in archive.files) {
	 *  const buffer = await archive.unzipBuffer(file);
	 *  // ...
	 * }
	 * ```
	 */
	readonly files: ArchiveFiles = new Map();

	private readonly map: ArchiveMap = {};

	[Symbol.iterator]() {
		return this.files.keys();
	}

	/**
	 * If you wish to add in a custom decompressor to support additional
	 * compression methods, you can extend this object to do so. The key
	 * should match the compressionMethod identifier as defined by
	 * https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT in section 4.4.5.
	 * The function should match the signature defined by the [[Decompressor]] type.
	 */
	static decompressors = new Map<number, Decompressor>();

	constructor(private readonly _buf: ArrayBuffer) {
		const reader = new ArchiveReader(_buf);

		// The "EndOfCentralDirectory" is the main entry point of a zip file
		reader.findNext(END_OF_CENTRAL_DIRECTORY);
		const eocd = new EndOfCentralDirectory(reader);

		// Store mapping data
		this.map[eocd._begin] = eocd._end;

		reader.moveTo(eocd.startOfCentralDirectory);
		for (let i = 0; i < eocd.globalListingCount; i++) {
			const cdl = new CentralDirectoryListing(reader);

			// Store mapping data
			this.map[cdl._begin] = cdl._end;
			this.map[cdl.localHeader._begin] = cdl.localHeader._end;
			// Normalize the file names so that no one can be nefarious.
			this.files.set(cdl.fileName, cdl);
		}

		assert.strictEqual(
			eocd.sizeOfCentralDirectory,
			reader.position - eocd.startOfCentralDirectory,
			"Central Directory has an incorrect length",
		);

		this.validateMap();
	}

	private validateMap() {
		// This checks to make sure that all the data in the file is accounted for.
		// If there is unnecessary data in the file, that raises a red flag in my eyes.
		// Every block should end at either the beginning of the next block or the end
		// of the file.
		let position = 0;
		while (this.map[position]) position = this.map[position]!;
		// assert.strictEqual(
		// 	position,
		// 	this.archiveBuffer.byteLength,
		// 	"The zip buffer appears to contain undocumented space in it, which can be malicious.",
		// );
	}

	async unzipBuffer(name: string): Promise<ArrayBuffer | null> {
		const cdl = this.files.get(name);
		if (!cdl) return null;

		const decompressor = Unzzz.decompressors.get(cdl.compressionMethod);
		const compressedData = this._buf.slice(
			cdl.localHeader.startOfCompressedFile,
			cdl.localHeader.endOfCompressedFile,
		);

		if (typeof decompressor !== "function") {
			// If we make it here and haven't returned a buffer, then the decompressor
			throw new Error(
				`No decompressor available for compressionMethod ${cdl.compressionMethod}`,
			);
		}

		const uncompressedData = await decompressor(compressedData, cdl);

		if (!(uncompressedData instanceof ArrayBuffer)) {
			throw new Error(
				`Expected an ArrayBuffer from decompressor ${cdl.compressionMethod}`,
			);
		}

		assert.strictEqual(
			cdl.uncompressedSize,
			uncompressedData.byteLength,
			"Uncompressed data has an incorrect length.",
		);

		assert.strictEqual(
			cdl.crc32,
			crc32(uncompressedData),
			"Uncompressed data has an incorrect crc32 value.",
		);

		return uncompressedData;
	}
}

// Decompressor for method 'store'
Unzzz.decompressors.set(0, (data) => Promise.resolve(data));

// Decompressor for method 'deflate'
Unzzz.decompressors.set(8, inflate);

/**
 * This function returns a promise which will fulfill with an [[Unzzz]],
 * an actionable class that enables you to interact with the archive.
 *
 * ```JavaScript
 * import unzzz from "unzzz";
 *
 * const archive = await unzzz("archive.zip");
 * const uncompressedData = await archive.unzipBuffer(fileName);
 *
 * let i = 0;
 * for (const file of archive) {
 *   // It's generally a bad idea to use the name given in the archive
 *   // when writting a file to disk. See notes on the unzipFile method
 *   // for details on why.
 *   // Something like this is a much better solution.
 *   // Files output: 1.js, 2.jpg, 3.html, etc.
 *   archive.unzipFile(name, `${i++}${path.extname(name)}`);
 * }
 * ```
 *
 * @param source Can be either a path to where the archive is stored on disk
 * or a buffer of a valid zip archive.
 */
export default function unzzz(source: ArrayBuffer): Unzzz {
	return new Unzzz(source);
}
