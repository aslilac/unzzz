import { CentralDirectoryListing, decompressors } from "../zip";
import * as assert from "./assert";
import { crc32 } from "./crc";

export class ArchiveFile {
	fileName: string;

	constructor(
		private readonly cdl: CentralDirectoryListing,
		private readonly buf: ArrayBuffer,
	) {
		this.fileName = cdl.fileName;
	}

	async arrayBuffer(): Promise<ArrayBuffer> {
		const { compressionMethod, localHeader } = this.cdl;

		const decompressor = decompressors.get(compressionMethod);
		const compressedData = this.buf.slice(
			localHeader.startOfCompressedFile,
			localHeader.endOfCompressedFile,
		);

		if (typeof decompressor !== "function") {
			throw new Error(`Unsupported compressionMethod ${compressionMethod}`);
		}

		const uncompressedData = await decompressor(compressedData, this.cdl);

		if (!(uncompressedData instanceof ArrayBuffer)) {
			throw new Error(`Invalid result from decompressor ${compressionMethod}`);
		}

		assert.strictEqual(
			this.cdl.uncompressedSize,
			uncompressedData.byteLength,
			`Incorrect length for file ${name}`,
		);

		assert.strictEqual(
			this.cdl.crc32,
			crc32(uncompressedData),
			`Incorrect crc for file ${name}`,
		);

		return uncompressedData;
	}
}
