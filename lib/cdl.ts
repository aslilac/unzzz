import LocalHeader from './lh';
import Mappable from './mappable';
import Reader from './reader';

import gardens from '../gardens.config';
const garden = gardens.scope( 'cdl' );

const CENTRAL_DIRECTORY_LISTING = Buffer.from( [ 0x50, 0x4b, 0x01, 0x02 ] );

export default class CentralDirectoryListing implements Mappable {
  _begin: number;
  _end: number;

  signature: Buffer;
  versionMadeBy: number;
  versionNeeded: number;
  bitFlag: number;
  compressionMethod: number;
  modifiedTime: number;
  modifiedDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  fileNameLength: number;
  extraLength: number;
  commentLength: number;
  fileDisk: number;
  internalAttributes: number;
  externalAttributes: number;
  fileHeaderOffset: number;
  fileName: string;
  extra: Buffer;
  comment: Buffer;

  localHeader: LocalHeader;

  constructor( reader: Reader ) {
    // Assert that the signature is correct
    garden.assert(
      reader.peek( 4 ).equals( CENTRAL_DIRECTORY_LISTING ),
      'CentralDirectoryListing received reader at an invalid position'
    );

    Object.assign( this, {
      _begin: reader.position,
      signature: reader.readRaw( 4 ),
      versionMadeBy: reader.readLittleEndian( 2 ),
      versionNeeded: reader.readLittleEndian( 2 ),
      bitFlag: reader.readLittleEndian( 2 ),
      compressionMethod: reader.readLittleEndian( 2 ),
      modifiedTime: reader.readLittleEndian( 2 ),
      modifiedDate: reader.readLittleEndian( 2 ),
      crc32: reader.readSignedLittleEndian( 4 ),
      compressedSize: reader.readLittleEndian( 4 ),
      uncompressedSize: reader.readLittleEndian( 4 ),
      fileNameLength: reader.readLittleEndian( 2 ),
      extraLength: reader.readLittleEndian( 2 ),
      commentLength: reader.readLittleEndian( 2 ),
      fileDisk: reader.readLittleEndian( 2 ),
      internalAttributes: reader.readLittleEndian( 2 ),
      externalAttributes: reader.readLittleEndian( 4 ),
      fileHeaderOffset: reader.readLittleEndian( 4 )
    });

    Object.assign( this, {
      fileName: reader.readString( this.fileNameLength ),
      extra: reader.readRaw( this.extraLength ),
      comment: reader.readRaw( this.commentLength ),
      _end: reader.position
    });

    // Parse the corresponding local header
    this.localHeader = new LocalHeader( reader.clone( this.fileHeaderOffset ), this );

    // If the compressionMethod is "stored" then the sizes should be equal
    if ( this.compressionMethod === 0 ) {
      garden.assert_eq( this.compressedSize, this.uncompressedSize );
    }
    // Assert that information matches in both listings
    garden.assert_eq( this.compressionMethod, this.localHeader.compressionMethod );
    garden.assert_eq( this.modifiedTime, this.localHeader.modifiedTime );
    garden.assert_eq( this.modifiedDate, this.localHeader.modifiedDate );
    garden.assert_eq( this.fileName, this.localHeader.fileName );
    garden.assert_eq( this.fileDisk, 0 );

    if ( this.localHeader.descriptor ) {
      // These values are required to be zero when a descriptor is present.
      garden.assert_eq( this.localHeader.crc32, 0 );
      garden.assert_eq( this.localHeader.compressedSize, 0 );
      garden.assert_eq( this.localHeader.uncompressedSize, 0 );

      garden.assert_eq( this.crc32, this.localHeader.descriptor.crc32 );
      garden.assert_eq( this.compressedSize, this.localHeader.descriptor.compressedSize );
      garden.assert_eq( this.uncompressedSize, this.localHeader.descriptor.uncompressedSize );
    }
    else {
      garden.assert_eq( this.crc32, this.localHeader.crc32 );
      garden.assert_eq( this.compressedSize, this.localHeader.compressedSize );
      garden.assert_eq( this.uncompressedSize, this.localHeader.uncompressedSize );
    }
  }
}
