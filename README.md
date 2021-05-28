# unzzz

![package version](https://mckay.la/vbadge/unzzz/f0606d)
[![build status](https://github.com/partheseas/unzzz/workflows/main/badge.svg)](https://github.com/partheseas/unzzz/actions)

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

const archive = await unzzz(pathToArchive);

for (const file of archive.files.keys()) {
	// Retrieve a decompressed buffer of the file
	console.log(await archive.unzipBuffer(file));
}
```
