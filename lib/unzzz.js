import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

import gardens from 'gardens'
const garden = gardens.createScope( 'unzzz' )

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

class Unzzz {
  constructor() {
    this.files = {}
    this.map = {}
  }

  read( archive ) {
    return new Promise( ( fulfill, reject ) => {
      fs.readFile( archive, ( error, archiveBuffer ) => {
        if ( error ) {
          reject( error )
          throw garden.error( 'Unable to read file' )
        }

        this.readBuffer( archiveBuffer ).then( fulfill, reject )
      })
    })
  }

  readBuffer( archiveBuffer ) {
    return new Promise( ( fulfill, reject ) => {
      this.archiveBuffer = archiveBuffer

      this._begin()
      this._validateMap()

      fulfill( this )
    })
  }

  _validateMap() {
    // This checks to make sure that all the data in the file is accounted for.
    // If there is unnecessary data in the file, that raises a red flag in my eyes.
    // Every block should end at either the beginning of the next block or the end
    // of the file.
    let position = 0
    while ( this.map[ position ] ) position = this.map[ position ]
    garden.assert_eq( position, this.archiveBuffer.length )
  }

  _begin() {
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
    garden.assert_eq( eocd.signature, leToInt( END_OF_CENTRAL_DIRECTORY ) )
    // Assert that there is only one disk
    garden.assert_eq( eocd.diskNumber, 0 )
    garden.assert_eq( eocd.centralDirectoryStartDisk, 0 )
    garden.assert_eq( eocd.localListingCount, eocd.globalListingCount )

    // Store mapping data
    this.map[ eocd._begin ] = eocd._end
    this.endOfCentralDirectory = eocd

    this._parseCentralDirectoryHeaders()
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
      garden.assert_eq( listing.signature, leToInt( CENTRAL_DIRECTORY ) )
      // Assert that information matches in both listings
      garden.assert_eq( listing.compressionMethod, 8 )
      garden.assert_eq( listing.localHeader.compressionMethod, 8 )
      garden.assert_eq( listing.modifiedTime, listing.localHeader.modifiedTime )
      garden.assert_eq( listing.modifiedDate, listing.localHeader.modifiedDate )
      garden.assert_eq( listing.crc32, listing.localHeader.crc32 )
      garden.assert_eq( listing.compressedSize, listing.localHeader.compressedSize )
      garden.assert_eq( listing.uncompressedSize, listing.localHeader.uncompressedSize )
      garden.assert_eq( listing.fileName, listing.localHeader.fileName )
      garden.assert_eq( listing.fileDisk, 0 )

      // Store mapping data
      this.map[ listing._begin ] = listing._end
      this.files[ listing.fileName ] = listing
    }

    // Assert that the central directory is the correct size
    garden.assert_eq( eocd.sizeOfCentralDirectory, reader.position - eocd.startOfCentralDirectory )
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
    localHeader._end = directoryListing.endOfData

    if ( localHeader.bitFlag & 8 ) {
      reader.position += directoryListing.compressedSize
      localHeader._descriptorBegin = reader.position

      // This signature is optional, so check if we need to eat it
      reader.peek( 4 ).equals( LOCAL_FILE_DESCRIPTOR ) && reader.readRaw( 4 )

      Object.assign( localHeader, {
        crc32: reader.readLittleEndian( 4 ),
        compressedSize: reader.readLittleEndian( 4 ),
        uncompressedSize: reader.readLittleEndian( 4 )
      })

      localHeader._end = reader.position
    }

    // Assert that the signature is correct
    garden.assert_eq( localHeader.signature, leToInt( LOCAL_FILE ) )

    // Store mapping data
    this.map[ localHeader._begin ] = localHeader._end
    return localHeader
  }

  unzipBuffer( from ) {
    return new Promise( ( fulfill, reject ) => {
      let listing = this.files[ from ]

      zlib.inflateRaw( this.archiveBuffer.slice( listing.startOfData, listing.endOfData ), ( error, buffer ) => {
        if ( error ) {
          reject( error )
          return garden.error( 'Failed to unzip file', error )
        }
        garden.assert_eq( listing.uncompressedSize, buffer.length )

        fulfill( buffer )
      })
    })
  }

  unzipFile( from, to = path.basename( from ) ) {
    return new Promise( ( fulfill, reject ) => {
      this.unzipBuffer( from ).then( buffer => {
        fs.writeFile( to, buffer, error => {
          if ( error ) {
            reject( error )
            return garden.error( `Failed to write file ${ to }`, error )
          }

          fulfill()
        })
      })
    })
  }

  safeUnzipFile( from, to = from ) {
    return new Promise( ( fulfill, reject ) => {
      this.unzipBuffer( from ).then( buffer => {
        fs.stat( to, ( error, stat ) => {
          // Ignore errors because it probably just doesn't exist.
          // We actually care about stat, because we don't want it to exist.
          if ( stat ) throw garden.error( `Attempting to unzip file to ${ to } but it already exists!` )

          fs.writeFile( to, buffer, error => {
            if ( error ) {
              reject( error )
              return garden.error( 'Failed to write file', error )
            }

            fulfill()
          })
        })
      })
    })
  }
}

export default function ( source ) {
  let archive = new Unzzz()
  if ( Buffer.isBuffer( source ) ) return archive.readBuffer( source )
  else if ( typeof source === 'string' ) return archive.read( source )
  else throw garden.typeerror( 'Unzzz: Argument `source` must be a file path (string) or a buffer.' )
}
