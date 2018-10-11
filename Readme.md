# Unzzz

# Weave
[![Unzzz v0.0.1](https://img.shields.io/badge/unzzz-v0.0.1-44dfd1.svg)](https://www.npmjs.com/package/unzzz)
![Stability: Beta](https://img.shields.io/badge/stability-beta-69b0ba.svg)

## Overview
A lightweight implementation of reading .zip files, because JSZip is a behemoth
and I'm not about that life.

### Usage
```JavaScript
const unzzz = require( 'unzzz' )

unzzz( pathToArchive )
  .then( archive => {
    for ( each in archive.files ) {
      archive.unzipFile( each )
    }
  })
```

## Installation
```Shell
npm install unzzz
```
or just download a .zip and throw it into a node_modules folder somewhere. You should be good to go.
