# unzzz

A lightweight package for reading .zip files, using native Web APIs like
`ArrayBuffer` and `DecompressionStream` and `Iterator`.

It focuses on being lightweight and portable; working in modern browsers, Node, and Deno,
without any dependencies.

## Usage

-   [Documentation](https://unzzz.vercel.app)

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
