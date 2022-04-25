# unzzz

A lightweight package for reading .zip files written in TypeScript.

Alternatives that exist (such as JSZip) feel overly heavy for certain use cases.
Unzzz strives to be compact, fast, and dependency free by only focusing on the
unzipping of files, rather than trying to be a swiss army knife.
It tries to be _very_ safe, accurate and validates everything possible to prevent
bad things from happening if you're using a corrupted or invalid file.

For the sake of being lightweight, it only supports DEFLATE compression by default.
The good news is that the vast majority of zip files use DEFLATE compression, and
unzzz is extensible. Adding support for additional compression methods just takes
a few lines of code! Details can be found in the documentation.

## Installation

```shell
npm add unzzz
```

## Usage

-   [Documentation](https://unzzz.now.sh)

```javascript
import unzzz from "unzzz";

const archive = unzzz(await file.arrayBuffer());

for await (const archiveFile of archive) {
	// Log the file name, and the first 10 bytes of each file in the archive
	console.log(
		archiveFile.fileName,
		new Uint8Array(await archiveFile.arrayBuffer(), 0, 10),
	);
}
```
