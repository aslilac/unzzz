# Unzzz
![package version](https://img.shields.io/badge/dynamic/json.svg?color=f0606d&label=unzzz&query=%24.version&url=https%3A%2F%2Funpkg.io%2Funzzz%2Fpackage.json&prefix=v)
![stability](https://img.shields.io/badge/stability-release-66f29a.svg)
[![build status](https://travis-ci.org/partheseas/unzzz.svg?branch=master)](https://travis-ci.org/partheseas/unzzz)

A lightweight package for reading .zip files written in TypeScript.

Alternatives that exist (such as JSZip) feel overly heavy for certain use cases.
Unzzz strives to be compact, fast, and light on dependencies for installs by only
focusing on the unzipping of files, rather than trying to be a swiss army knife.

For the sake of being lightweight, it only supports DEFLATE compression by default,
and does not currently crc32 check the decompressed data for validity. Aside from that, it
tries to be *very* safe, accurate and validates pretty much everything else possible.

## Installation
```Shell
yarn add unzzz
```
You should use Yarn and [pnp](https://yarnpkg.com/en/docs/pnp).

## Usage
- [Documentation](https://unzzz.now.sh)

```JavaScript
import unzzz from 'unzzz';

unzzz( pathToArchive )
  .then( archive => {
    // Iterate over all the files in the archive
    for ( const each in archive.files ) {
      // Retrieve a decompressed buffer of the file
      archive.unzipBuffer( each )
        .then( buffer => console.log( buffer ) );
    }

    // Pull out specific files and save the uncompressed files to storage
    archive.unzipFile( 'dir/filename.ext', destination );
  });
```

**Notice:** When using CommonJS to import this module, you will need to import
the "default" property. This is not necessary when using a tool like TypeScript,
Webpack, Parcel, or Rollup.

```JavaScript
const unzzz = require( 'unzzz' ).default;
```
