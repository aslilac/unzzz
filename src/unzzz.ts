import {
	ArchiveFile,
	ArchiveReader,
	assert,
	END_OF_CENTRAL_DIRECTORY,
	viewToSlice,
} from "./base";
import { CentralDirectoryListing, EndOfCentralDirectory } from "./zip";

// export type ArchiveFiles = Record<string, CentralDirectoryListing>;
export type ArchiveFiles = Map<string, ArchiveFile>;
export type ArchiveMap = Record<number, number>;

export class Unzzz {
	private readonly _files: ArchiveFiles = new Map();
	private readonly map: ArchiveMap = {};

	constructor(private readonly buf: ArrayBuffer) {
		const reader = new ArchiveReader(buf);

		// The "EndOfCentralDirectory" is the main entry point of a zip file
		reader.findNext(END_OF_CENTRAL_DIRECTORY);
		const eocd = new EndOfCentralDirectory(reader);

		// Store mapping data
		this.map[eocd._begin] = eocd._end;

		reader.moveTo(eocd.startOfCentralDirectory);
		for (let i = 0; i < eocd.globalListingCount; i++) {
			const cdl = new CentralDirectoryListing(reader);
			const file = new ArchiveFile(cdl, this.buf);

			// Store mapping data
			this.map[cdl._begin] = cdl._end;
			this.map[cdl.localHeader._begin] = cdl.localHeader._end;

			// TODO: Normalize the file names so that no one can be nefarious.
			this._files.set(cdl.fileName, file);
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
		assert.strictEqual(
			position,
			this.buf.byteLength,
			"This buffer appears to contain undocumented space in it, which can be malicious.",
		);
	}

	[Symbol.iterator]() {
		return this._files.values();
	}

	files() {
		return this._files.values();
	}

	async unzipBuffer(name: string): Promise<ArrayBuffer | null> {
		const file = this._files.get(name);

		if (!file) {
			return null;
		}

		return file.arrayBuffer();
	}
}

export default function unzzz(source: ArrayBuffer | ArrayBufferView): Unzzz {
	if (source instanceof ArrayBuffer) {
		return new Unzzz(source);
	}

	return new Unzzz(viewToSlice(source));
}
