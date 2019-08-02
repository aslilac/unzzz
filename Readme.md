# Unzzz
![package version](https://img.shields.io/badge/dynamic/json.svg?color=f0606d&label=unzzz&query=%24.version&url=https%3A%2F%2Funpkg.io%2Funzzz%2Fpackage.json&prefix=v)
![stability](https://img.shields.io/badge/stability-beta-6680f2.svg)
[![build status](https://travis-ci.org/partheseas/unzzz.svg?branch=master)](https://travis-ci.org/partheseas/unzzz)

A lightweight package for reading .zip files, because JSZip is a behemoth
and I'm not about that life.

For the sake of being lightweight, it only supports DEFLATE compression, and
does not crc32 check the decompressed data for validity. Aside from that, it
tries to be *very* safe and validates pretty much everything else possible.

## Installation
```Shell
yarn add unzzz
```
You should use Yarn and [pnp](https://yarnpkg.com/en/docs/pnp).

## Usage
- [Documentation](https://unzzz.now.sh)

```JavaScript
import unzzz from 'unzzz'

unzzz( pathToArchive )
  .then( archive => {
    // Iterate over all the files in the archive
    for ( let each in archive.files ) {
      // Retrieve a decompressed buffer of the file
      archive.unzipBuffer( each )
        .then( buffer => console.log( buffer ) )
    }

    // Pull out specific files and save the uncompressed files to storage
    archive.unzipFile( 'dir/filename.ext', destination )
  })
```
