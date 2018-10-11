const garden = require( 'gardens' ).createScope( 'zzz' )

const assert = require( 'assert' )
const fs = require( 'fs' )
const path = require( 'path' )
const zlib = require( 'zlib' )

// const endOfCentralDirectory = Buffer.from([ 0x06, 0x05, 0x4b, 0x50 ])
const END_OF_CENTRAL_DIRECTORY = Buffer.from([ 0x50, 0x4b, 0x05, 0x06 ])
const CENTRAL_DIRECTORY = Buffer.from([ 0x50, 0x4b, 0x01, 0x02 ])
const LOCAL_FILE = Buffer.from([ 0x50, 0x4b, 0x03, 0x04 ])
const LOCAL_FILE_DESCRIPTOR = Buffer.from([ 0x50, 0x4b, 0x07, 0x08 ])

// Convert a Little Endian buffer to an int
function leToInt( bufferSegment ) {
  let total = 0
  bufferSegment.forEach( ( item, significance ) => {
    total += item * 2**(significance*8)
  })

  return total
}

class Reader {
  constructor( buffer, position = 0 ) {
    this.currentBuffer = buffer
    this.position = position
  }

  findNext( data ) {
    let foundAt = this.currentBuffer.slice( this.position ).indexOf( data )
    this.position += foundAt

    return foundAt > -1
  }

  moveTo( position ) {
    this.position = position
  }

  peek( length ) {
    return this.currentBuffer.slice( this.position, this.position + length )
  }

  readLittleEndian( length ) {
    let value = leToInt( this.currentBuffer.slice( this.position, this.position + length ) )
    this.position += length
    return value
  }

  readRaw( length ) {
    let value = this.currentBuffer.slice( this.position, this.position + length )
    this.position += length
    return value
  }

  readString( length, encoding = 'utf-8' ) {
    let value = this.currentBuffer.slice( this.position, this.position + length ).toString( encoding )
    this.position += length
    return value
  }
}

class Zzz {
  constructor() {
    this.files = {}
  }

  read( archive ) {
    return new Promise( ( fulfill, reject ) => {
      fs.readFile( archive, ( error, archiveBuffer ) => {
        if ( error ) {
          reject( error )
          return garden.error( 'Unable to read file' )
        }

        this.archiveBuffer = archiveBuffer

        this._parseEndOfCentralDirectoryHeader()
        this._parseCentralDirectoryHeaders()

        fulfill( this )
      })
    })
  }

  _parseEndOfCentralDirectoryHeader() {
    let reader = new Reader( this.archiveBuffer )
    reader.findNext( END_OF_CENTRAL_DIRECTORY )

    let eocd = {
      _begin: reader.position,
      signature: reader.readLittleEndian( 4 ),
      diskNumber: reader.readLittleEndian( 2 ),
      centralDirectoryStartDisk: reader.readLittleEndian( 2 ),
      localListingCount: reader.readLittleEndian( 2 ),
      globalListingCount: reader.readLittleEndian( 2 ),
      sizeOfCentralDirectory: reader.readLittleEndian( 4 ),
      startOfCentralDirectory: reader.readLittleEndian( 4 ),
      commentLength: reader.readLittleEndian( 2 )
    }

    // This is separate so that we can know the commentLength
    Object.assign( eocd, {
      comment: reader.readRaw( eocd.commentLength ),
      _end: reader.position
    })

    // Assert that the signature is correct
    assert.equal( eocd.signature, leToInt( END_OF_CENTRAL_DIRECTORY ) )
    // Assert that there is only one disk
    assert.equal( eocd.diskNumber, 0 )
    assert.equal( eocd.centralDirectoryStartDisk, 0 )
    assert.equal( eocd.localListingCount, eocd.globalListingCount )

    this.endOfCentralDirectory = eocd
  }

  _parseCentralDirectoryHeaders() {
    let eocd = this.endOfCentralDirectory
    let reader = new Reader( this.archiveBuffer, eocd.startOfCentralDirectory )

    // Read all of our listings
    for ( let i = 0; i < eocd.globalListingCount; i++ ) {
      let listing = {
        _begin: reader.position,
        // TODO validate signatures and remove .toString()
        signature: reader.readLittleEndian( 4 ),
        versionMadeBy: reader.readLittleEndian( 2 ),
        versionNeeded: reader.readLittleEndian( 2 ),
        bitFlag: reader.readLittleEndian( 2 ),
        compressionMethod: reader.readLittleEndian( 2 ),
        modifiedTime: reader.readLittleEndian( 2 ),
        modifiedDate: reader.readLittleEndian( 2 ),
        crc32: reader.readLittleEndian( 4 ),
        compressedSize: reader.readLittleEndian( 4 ),
        uncompressedSize: reader.readLittleEndian( 4 ),
        fileNameLength: reader.readLittleEndian( 2 ),
        extraLength: reader.readLittleEndian( 2 ),
        commentLength: reader.readLittleEndian( 2 ),
        fileDisk: reader.readLittleEndian( 2 ),
        internalAttributes: reader.readLittleEndian( 2 ),
        externalAttributes: reader.readLittleEndian( 4 ),
        fileHeaderOffset: reader.readLittleEndian( 4 )
      }

      // This is separate so that we can know fileNameLength, extraLength, commentLength
      Object.assign( listing, {
        fileName: reader.readString( listing.fileNameLength ),
        extra: reader.readRaw( listing.extraLength ),
        comment: reader.readRaw( listing.commentLength ),
        _end: reader.position
      })

      // Parse the local header once we've located it
      listing.localHeader = this._parseLocalFileHeader( listing )

      // Assert that the signature is correct
      assert.equal( listing.signature, leToInt( CENTRAL_DIRECTORY ) )
      // Assert that information matches in both listings
      assert.equal( listing.compressionMethod, 8 )
      assert.equal( listing.localHeader.compressionMethod, 8 )
      assert.equal( listing.modifiedTime, listing.localHeader.modifiedTime )
      assert.equal( listing.modifiedDate, listing.localHeader.modifiedDate )
      assert.equal( listing.crc32, listing.localHeader.crc32 )
      assert.equal( listing.compressedSize, listing.localHeader.compressedSize )
      assert.equal( listing.uncompressedSize, listing.localHeader.uncompressedSize )
      assert.equal( listing.fileName, listing.localHeader.fileName )
      assert.equal( listing.fileDisk, 0 )

      // Map file name to this information
      this.files[ listing.fileName ] = listing
    }

    // garden.log( Object.keys( this.listings ).map( name => {
    //   let each = this.listings[ name ]
    //   return {
    //     fileName: each.fileName,
    //     compressedSize: each.compressedSize,
    //     lrange: [ each._begin, each._end ],
    //     frange: [ each.localHeader._begin, each.localHeader._end ],
    //     datarange: [ each.startOfData, each.endOfData ],
    //     drange: [ each.localHeader._descriptorBegin, each.localHeader._descriptorEnd ],
    //   }
    // }) )
  }

  _parseLocalFileHeader( directoryListing ) {
    let reader = new Reader( this.archiveBuffer, directoryListing.fileHeaderOffset )

    let localHeader = {
      _begin: reader.position,
      signature: reader.readLittleEndian( 4 ),
      versionNeeded: reader.readLittleEndian( 2 ),
      bitFlag: reader.readLittleEndian( 2 ),
      compressionMethod: reader.readLittleEndian( 2 ),
      modifiedTime: reader.readLittleEndian( 2 ),
      modifiedDate: reader.readLittleEndian( 2 ),
      crc32: reader.readLittleEndian( 4 ),
      compressedSize: reader.readLittleEndian( 4 ),
      uncompressedSize: reader.readLittleEndian( 4 ),
      fileNameLength: reader.readLittleEndian( 2 ),
      extraLength: reader.readLittleEndian( 2 )
    }

    localHeader.fileName = reader.readString( localHeader.fileNameLength )
    localHeader.extra = reader.readRaw( localHeader.extraLength )

    // This must be set before the descriptor nonsense because that puts us in
    // COMPLETELY the wrong spot.
    directoryListing.startOfData = reader.position
    directoryListing.endOfData = directoryListing.startOfData + directoryListing.compressedSize
    localHeader._end = reader.position

    if ( localHeader.bitFlag & 8 ) {
      reader.position += directoryListing.compressedSize
      localHeader._descriptorBegin = reader.position

      // assert( reader.position === endOfHeader + directoryListing.compressedSize )
      // This signature is optional, so check if we need to eat it
      reader.peek( 4 ).equals( LOCAL_FILE_DESCRIPTOR ) && reader.readRaw( 4 )

      Object.assign( localHeader, {
        crc32: reader.readLittleEndian( 4 ),
        compressedSize: reader.readLittleEndian( 4 ),
        uncompressedSize: reader.readLittleEndian( 4 )
      })

      localHeader._descriptorEnd = reader.position
    }

    // Assert that the signature is correct
    assert.equal( localHeader.signature, leToInt( LOCAL_FILE ) )

    return localHeader
  }

  unzipFile( from, to = path.basename( from ) ) {
    let listing = this.files[ from ]

    zlib.inflateRaw( this.archiveBuffer.slice( listing.startOfData, listing.endOfData ), ( error, buffer ) => {
      if ( error ) return garden.error( 'Failed to unzip!!!', error )
      fs.writeFile( to, buffer, error => {
        if ( error ) return garden.error( 'Failed to write!!!', error )
      })
    })
  }
}

module.exports = function ( ...args ) {
  let archive = new Zzz()
  return archive.read( ...args )
}
