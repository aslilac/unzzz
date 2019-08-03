import LocalHeader from './lh';
import Mappable from './mappable';
import Reader from './reader';

import gardens from '../gardens.config';
const garden = gardens.scope( 'cdl' );

const CENTRAL_DIRECTORY = Buffer.from( [ 0x50, 0x4b, 0x01, 0x02 ] );

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

    this.localHeader = new LocalHeader( reader.clone( this.fileHeaderOffset ), this );

    // Assert that the signature is correct
    garden.assert( this.signature.equals( CENTRAL_DIRECTORY ) );
    // Assert that information matches in both listings
    // These assert to 0 or 8 because we currently only support stored and deflate
    garden.assert( [ 0, 8 ].includes( this.compressionMethod ) );
    garden.assert( [ 0, 8 ].includes( this.localHeader.compressionMethod ) );
    garden.assert_eq( this.modifiedTime, this.localHeader.modifiedTime );
    garden.assert_eq( this.modifiedDate, this.localHeader.modifiedDate );
    garden.assert_eq( this.fileName, this.localHeader.fileName );
    garden.assert_eq( this.fileDisk, 0 );

    if ( this.localHeader.descriptor ) {
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
