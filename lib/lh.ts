import CentralDirectoryListing from './cdl';
import Mappable from './mappable';
import Reader from './reader';

import gardens from '../gardens.config';
const garden = gardens.scope( 'lh' );

const LOCAL_HEADER = Buffer.from( [ 0x50, 0x4b, 0x03, 0x04 ] );
const LOCAL_HEADER_DESCRIPTOR = Buffer.from( [ 0x50, 0x4b, 0x07, 0x08 ] );

export interface Descriptor extends Mappable {
  _begin: number,
  _end: number,

  signature: Buffer,
  crc32: number,
  compressedSize: number,
  uncompressedSize: number
}

export default class LocalHeader implements Mappable {
  _begin: number;
  _end: number;

  signature: Buffer;
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
  fileName: string;
  extra: Buffer;

  startOfCompressedFile: number;
  endOfCompressedFile: number;

  descriptor: Descriptor;

  constructor( reader: Reader, cdl: CentralDirectoryListing ) {
    // Assert that the signature is correct
    garden.assert(
      reader.peek( 4 ).equals( LOCAL_HEADER ),
      'LocalHeader received reader at an invalid position'
    );

    Object.assign( this, {
      _begin: reader.position,
      signature: reader.readRaw( 4 ),
      versionNeeded: reader.readLittleEndian( 2 ),
      bitFlag: reader.readLittleEndian( 2 ),
      compressionMethod: reader.readLittleEndian( 2 ),
      modifiedTime: reader.readLittleEndian( 2 ),
      modifiedDate: reader.readLittleEndian( 2 ),
      crc32: reader.readSignedLittleEndian( 4 ),
      compressedSize: reader.readLittleEndian( 4 ),
      uncompressedSize: reader.readLittleEndian( 4 ),
      fileNameLength: reader.readLittleEndian( 2 ),
      extraLength: reader.readLittleEndian( 2 )
    });

    Object.assign( this, {
      fileName: reader.readString( this.fileNameLength ),
      extra: reader.readRaw( this.extraLength )
    });

    // Store the beginning and ending positions of the compressed data
    this.startOfCompressedFile = reader.position;
    // We read `compressedSize` from `cdl` instead of `this` because local
    // headers are not guarenteed to have it, but the central directory is.
    reader.moveBy( cdl.compressedSize );
    this.endOfCompressedFile = reader.position;

    // Check if this file has a data descriptor after the compressed data
    if ( this.bitFlag & 8 ) {
      // These should all be zero if there is a descriptor
      garden.assert_eq( this.crc32, 0 );
      garden.assert_eq( this.compressedSize, 0 );
      garden.assert_eq( this.uncompressedSize, 0 );

      this.descriptor = {
        _begin: this.endOfCompressedFile,
        signature: reader.peek( 4 ).equals( LOCAL_HEADER_DESCRIPTOR )
          ? reader.readRaw( 4 )
          : null,
        crc32: reader.readLittleEndian( 4 ),
        compressedSize: reader.readLittleEndian( 4 ),
        uncompressedSize: reader.readLittleEndian( 4 ),
        _end: reader.position
      };
    }

    // We lump the compressed data (and optional descriptor) in with the
    // local header so that it is easier to account for in our map validation.
    this._end = this.descriptor
      ? this.descriptor._end
      : this.endOfCompressedFile;
  }
}
