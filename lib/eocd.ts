import Mappable from './mappable';
import Reader from './reader';

import gardens from '../gardens.config';
const garden = gardens.scope( 'eocd' );

const END_OF_CENTRAL_DIRECTORY = Buffer.from( [ 0x50, 0x4b, 0x05, 0x06 ] );

export default class EndOfCentralDirectory implements Mappable {
  _begin: number;
  _end: number;

  signature: Buffer;
  diskNumber: number;
  centralDirectoryStartDisk: number;
  localListingCount: number;
  globalListingCount: number;
  sizeOfCentralDirectory: number;
  startOfCentralDirectory: number;
  commentLength: number;
  comment: Buffer;

  constructor( reader: Reader ) {
    // Assert that the signature is correct
    garden.assert(
      reader.peek( 4 ).equals( END_OF_CENTRAL_DIRECTORY ),
      'EndOfCentralDirectory received reader at an invalid position'
    );

    Object.assign( this, {
      _begin: reader.position,
      signature: reader.readRaw( 4 ),
      diskNumber: reader.readLittleEndian( 2 ),
      centralDirectoryStartDisk: reader.readLittleEndian( 2 ),
      localListingCount: reader.readLittleEndian( 2 ),
      globalListingCount: reader.readLittleEndian( 2 ),
      sizeOfCentralDirectory: reader.readLittleEndian( 4 ),
      startOfCentralDirectory: reader.readLittleEndian( 4 ),
      commentLength: reader.readLittleEndian( 2 )
    });

    Object.assign( this, {
      comment: reader.readRaw( this.commentLength ),
      _end: reader.position
    });

    // Assert that there is only one disk
    garden.assert_eq( this.diskNumber, 0 );
    garden.assert_eq( this.centralDirectoryStartDisk, 0 );
    garden.assert_eq( this.localListingCount, this.globalListingCount );
    // Assert central directory is at start of disk
    // garden.assert_eq( eocd.startOfCentralDirectory, 0 );
  }
}
