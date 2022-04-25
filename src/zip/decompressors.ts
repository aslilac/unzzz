import { inflate } from "../base";
import { CentralDirectoryListing } from "./cdl";

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

/**
 * If you wish to add in a custom decompressor to support additional
 * compression methods, you can extend this object to do so. The key
 * should match the compressionMethod identifier as defined by
 * https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT in section 4.4.5.
 * The function should match the signature defined by the [[Decompressor]] type.
 */
export const decompressors = new Map<number, Decompressor>();

// Decompressor for method 'store'
decompressors.set(0, (data) => Promise.resolve(data));

// Decompressor for method 'deflate'
decompressors.set(8, inflate);
