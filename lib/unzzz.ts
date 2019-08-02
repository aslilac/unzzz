import { promises as fs } from 'fs';
import zlib from 'zlib';

import CentralDirectoryListing from './cdl';
import EndOfCentralDirectory from './eocd';
import Reader from './reader';

import gardens from '../gardens.config';
const garden = gardens.scope( 'unzzz' );

interface ArchiveFiles {
  [ name: string ]: CentralDirectoryListing
}

interface BufferMap {
  [ entry: number ]: number
}

export class Unzzz {
  readonly files: ArchiveFiles = {};
  readonly map: BufferMap = {};

  private archiveBuffer: Buffer;
  private reader: Reader;

  async read( archivePath: string ): Promise<this> {
    const archiveBuffer = await fs.readFile( archivePath );
    return this.readBuffer( archiveBuffer );
  }

  readBuffer( archiveBuffer: Buffer ): Promise<this> {
    this.archiveBuffer = archiveBuffer;

    this.reader = new Reader( archiveBuffer );

    // The "EndOfCentralDirectory" is the main entry point of a zip file
    const eocd = new EndOfCentralDirectory( this.reader );

    // Store mapping data
    this.map[ eocd._begin ] = eocd._end;

    this.reader.moveTo( eocd.startOfCentralDirectory );
    for ( let i = 0; i < eocd.globalListingCount; i++ ) {
      const cdl = new CentralDirectoryListing( this.reader );

      // Store mapping data
      this.map[ cdl._begin ] = cdl._end;
      this.map[ cdl.localHeader._begin ] = cdl.localHeader._end;
      // Normalize the file names so that no one can be nefarious.
      this.files[ cdl.fileName ] = cdl;
    }

    this.validateMap();

    return Promise.resolve( this );
  }

  private validateMap() {
    // This checks to make sure that all the data in the file is accounted for.
    // If there is unnecessary data in the file, that raises a red flag in my eyes.
    // Every block should end at either the beginning of the next block or the end
    // of the file.
    let position = 0;
    while ( this.map[ position ] ) position = this.map[ position ];
    garden.assert_eq(
      position,
      this.archiveBuffer.length,
      'The zip buffer appears to contain empty space in it, which can be malicious.'
    );
  }

  unzipBuffer( name: string ): Promise<Buffer> {
    return new Promise( ( fulfill, reject ) => {
      const cdl = this.files[ name ];
      const compressedData = this.archiveBuffer.slice(
        cdl.localHeader.startOfCompressedFile,
        cdl.localHeader.endOfCompressedFile
      );

      if ( cdl.compressionMethod === 0 ) {
        fulfill( compressedData );
      }

      else if ( cdl.compressionMethod === 8 ) {
        zlib.inflateRaw(
          compressedData,
          ( error, buffer ) => {
            if ( error ) return reject( error );

            garden.assert_eq(
              cdl.uncompressedSize,
              buffer.length,
              'Uncompressed data has incorrect length.'
            );

            fulfill( buffer );
          }
        );
      }
    });
  }

  /**
   * Decompresses a given file and writes it to disk at the specified location.
   * @param name The name of the file represented in the archive.
   * @param destination It is recommended not to use the file name from the
   * archive as a part of this parameter. The ZIP specification does not prevent
   * a file from beginning with '../' or '/', which could make you vulnerable
   * to attacks. A malicious archive could extract one its files to anywhere on
   * your disk, overwritting files that you might rely on to handle sensitive data.
   */
  async unzipFile( name: string, destination: string ): Promise<void> {
    const uncompressedData = await this.unzipBuffer( name );
    return fs.writeFile( destination, uncompressedData );
  }
}

/**
 * This function returns a promise which will fulfill with an [[Unzzz]],
 * an actionable class that enables you to interact with the archive.
 *
 * ```JavaScript
 * const archive = await unzzz( 'archive.zip' );
 * const uncompressedData = await archive.unzipBuffer( fileName );
 *
 * let i = 0;
 * for ( const name in archive.files ) {
 *   // It's generally a bad idea to use the name given in the archive
 *   // when writting a file to disk. See notes on the unzipFile method
 *   // for details on why.
 *   // Something like this is a much better solution.
 *   // Files output: 1.js, 2.jpg, 3.html, etc.
 *   archive.unzipFile( name, `i${path.extname( name )}` );
 * }
 * ```
 *
 * @param source Can be either a path to where the archive is stored on disk
 * or a buffer of a valid zip archive.
 */
function unzzz( source: Buffer | string ): Promise<Unzzz> {
  const archive = new Unzzz();

  return Buffer.isBuffer( source )
    ? archive.readBuffer( source )
    : archive.read( source );
}

Object.assign( unzzz, {

});

export default unzzz;
