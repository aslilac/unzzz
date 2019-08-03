import test from 'ava';
import { LocalHeader, Reader } from '..';

const sample = Buffer.from( [
  0x50, 0x4b, 0x03, 0x04, // signature
  20, 0, // versionNeeded
  0, 0, // bitFlag
  0, 0, // compressionMethod
  1, 2, // modifiedTime
  3, 4, // modifiedDate
  0, 0, 0, 0, // crc32
  5, 0, 0, 0, // compressedSize
  10, 0, 0, 0, // uncompressedSize
  8, 0, // fileNameLength
  0, 0, // extraLength
  ...Buffer.from( 'testfile' ), // fileName
  // extra
  0, 0, 0, 0, 0 // "compressed data"
] );

const descriptorSample = Buffer.from( [
  0x50, 0x4b, 0x03, 0x04, // signature
  20, 0, // versionNeeded
  8, 0, // bitFlag
  0, 0, // compressionMethod
  1, 2, // modifiedTime
  3, 4, // modifiedDate
  0, 0, 0, 0, // crc32
  0, 0, 0, 0, // compressedSize
  0, 0, 0, 0, // uncompressedSize
  8, 0, // fileNameLength
  0, 0, // extraLength
  ...Buffer.from( 'testfile' ), // fileName
  // extra
  0, 0, 0, 0, 0, // "compressed data"
  0x50, 0x4b, 0x07, 0x08, // descriptor signature
  0, 0, 0, 0, // crc32
  5, 0, 0, 0, // compressedSize
  10, 0, 0, 0 // uncompressedSize
] );

const descriptorSampleNoSignature = Buffer.from( [
  0x50, 0x4b, 0x03, 0x04, // signature
  20, 0, // versionNeeded
  8, 0, // bitFlag
  0, 0, // compressionMethod
  1, 2, // modifiedTime
  3, 4, // modifiedDate
  0, 0, 0, 0, // crc32
  0, 0, 0, 0, // compressedSize
  0, 0, 0, 0, // uncompressedSize
  8, 0, // fileNameLength
  0, 0, // extraLength
  ...Buffer.from( 'testfile' ), // fileName
  // extra
  0, 0, 0, 0, 0, // "compressed data"
  0, 0, 0, 0, // crc32
  5, 0, 0, 0, // compressedSize
  10, 0, 0, 0 // uncompressedSize
] );

test( 'LocalHeader initializes from buffer properly', t => {
  const localHeader = new LocalHeader(
    new Reader( sample ),
    { compressedSize: 5 }
  );

  t.is( localHeader.versionNeeded, 20 );
  t.is( localHeader.modifiedTime, 0x0201 );
  t.is( localHeader.modifiedDate, 0x0403 );
  t.is( localHeader.compressedSize, 5 );
  t.is( localHeader.uncompressedSize, 10 );
  t.is( localHeader.fileNameLength, 8 );
  t.is( localHeader.fileName, 'testfile' );
});

test( 'LocalHeader initializes properly when a Descriptor is present', t => {
  const localHeader = new LocalHeader(
    new Reader( descriptorSample ),
    { compressedSize: 5 }
  );

  t.is( localHeader.versionNeeded, 20 );
  t.is( localHeader.modifiedTime, 0x0201 );
  t.is( localHeader.modifiedDate, 0x0403 );
  t.is( localHeader.compressedSize, 0 );
  t.is( localHeader.uncompressedSize, 0 );
  t.is( localHeader.fileNameLength, 8 );
  t.is( localHeader.fileName, 'testfile' );
  t.is( localHeader.descriptor.compressedSize, 5 );
  t.is( localHeader.descriptor.uncompressedSize, 10 );
});

test( 'LocalHeader initializes properly when a Descriptor is present without a signature', t => {
  const localHeader = new LocalHeader(
    new Reader( descriptorSampleNoSignature ),
    { compressedSize: 5 }
  );

  t.is( localHeader.versionNeeded, 20 );
  t.is( localHeader.modifiedTime, 0x0201 );
  t.is( localHeader.modifiedDate, 0x0403 );
  t.is( localHeader.compressedSize, 0 );
  t.is( localHeader.uncompressedSize, 0 );
  t.is( localHeader.fileNameLength, 8 );
  t.is( localHeader.fileName, 'testfile' );
  t.is( localHeader.descriptor.compressedSize, 5 );
  t.is( localHeader.descriptor.uncompressedSize, 10 );
});
