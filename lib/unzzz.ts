import assert from "assert";
import { promises as fs } from "fs";
import zlib from "zlib";

import Reader from "./base/reader";
import crc32 from "./base/crc";
import { END_OF_CENTRAL_DIRECTORY } from "./types/signatures";
import CentralDirectoryListing from "./cdl";
import EndOfCentralDirectory from "./eocd";

// export type ArchiveFiles = Record<string, CentralDirectoryListing>;
export type ArchiveFiles = Map<string, CentralDirectoryListing>;
export type BufferMap = Record<number, number>;

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
	compressed: Buffer,
	cdl: CentralDirectoryListing,
) => Promise<Buffer>;

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

	private map: BufferMap = {};
	private archiveBuffer: Buffer | null = null;

	/**
	 * If you wish to add in a custom decompressor to support additional
	 * compression methods, you can extend this object to do so. The key
	 * should match the compressionMethod identifier as defined by
	 * https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT in section 4.4.5.
	 * The function should match the signature defined by the [[Decompressor]] type.
	 */
	static decompressors = new Map<number, Decompressor>();

	async readFromFile(archivePath: string): Promise<this> {
		const archiveBuffer = await fs.readFile(archivePath);
		return this.readFromBuffer(archiveBuffer);
	}

	readFromBuffer(archiveBuffer: Buffer): Promise<this> {
		this.archiveBuffer = archiveBuffer;
		const reader = new Reader(archiveBuffer);

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

		return Promise.resolve(this);
	}

	private validateMap() {
		if (!this.archiveBuffer) {
			throw new ReferenceError("Attempted to validate an uninitialized buffer");
		}

		// This checks to make sure that all the data in the file is accounted for.
		// If there is unnecessary data in the file, that raises a red flag in my eyes.
		// Every block should end at either the beginning of the next block or the end
		// of the file.
		let position = 0;
		while (this.map[position]) position = this.map[position]!;
		assert.strictEqual(
			position,
			this.archiveBuffer.length,
			"The zip buffer appears to contain undocumented space in it, which can be malicious.",
		);
	}

	async unzipBuffer(name: string): Promise<Buffer | null> {
		if (!this.archiveBuffer) {
			throw new ReferenceError("Attempted to read from an uninitialized buffer");
		}

		const cdl = this.files.get(name);
		if (!cdl) return null;

		const decompressor = Unzzz.decompressors.get(cdl.compressionMethod);
		const compressedData = this.archiveBuffer.slice(
			cdl.localHeader.startOfCompressedFile,
			cdl.localHeader.endOfCompressedFile,
		);

		if (typeof decompressor === "function") {
			const uncompressedData: Buffer = await decompressor(compressedData, cdl);

			if (Buffer.isBuffer(uncompressedData)) {
				assert.strictEqual(
					cdl.uncompressedSize,
					uncompressedData.length,
					"Uncompressed data has an incorrect length.",
				);

				assert.strictEqual(
					cdl.crc32,
					crc32(uncompressedData),
					"Uncompressed data has an incorrect crc32 value.",
				);

				return uncompressedData;
			}

			throw new TypeError(
				`Invalid decompression for compressionMethod ${cdl.compressionMethod}!`,
			);
		}

		// If we make it here and haven't returned a buffer, then the decompressor
		throw new Error(
			`No decompressor available for compressionMethod ${cdl.compressionMethod}!`,
		);
	}

	/**
	 * Decompresses a given file and writes it to disk at the specified location.
	 * @param name The name of the file represented in the archive.
	 * @param destination It is recommended not to use the file name from the
	 * archive as a part of this parameter. The ZIP specification does not prevent
	 * a file from beginning with '../' or '/', which could make you vulnerable
	 * to attacks. A malicious archive could extract one its files to anywhere on
	 * your disk and overwrite files that you might rely on to handle sensitive data.
	 */
	async unzipFile(name: string, destination: string): Promise<void> {
		const uncompressedData = await this.unzipBuffer(name);

		if (!uncompressedData) {
			throw new ReferenceError(`No file "${name}" in archive to extract`);
		}

		return fs.writeFile(destination, uncompressedData);
	}
}

// Decompressor for method 'store'
Unzzz.decompressors.set(0, (compressed) => Promise.resolve(compressed));

// Decompressor for method 'deflate'
Unzzz.decompressors.set(
	8,
	(compressed) =>
		new Promise((fulfill, reject) => {
			zlib.inflateRaw(compressed, (error, buffer) => {
				if (error) {
					reject(error);
					return;
				}

				fulfill(buffer);
			});
		}),
);

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
 * for (const name in archive.files) {
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
export default function unzzz(source: Buffer | string): Promise<Unzzz> {
	const archive = new Unzzz();

	if (Buffer.isBuffer(source)) {
		return archive.readFromBuffer(source);
	} else if (typeof source === "string") {
		return archive.readFromFile(source);
	} else {
		throw new TypeError(`Received invalid source: ${source}`);
	}
}
