import test from 'ava';
import { CentralDirectoryListing, Reader } from '..';

function mock( ...files ) {
  let position = 0;

  // Create local headers
  const l = Buffer.concat(
    files.map( details => {
      const descriptor = Buffer.from( [
        0, 0, 0, 0, // crc32
        5, 0, 0, 0, // compressedSize
        5, 0, 0, 0 // uncompressedSize
      ] );

      const lh = Buffer.from( [
        // LocalHeader
        // ===========
        0x50, 0x4b, 0x03, 0x04, // signature
        20, 0, // versionNeeded
        details.descriptor ? 8 : 0, 0, // bitFlag
        0, 0, // compressionMethod
        1, 2, // modifiedTime
        3, 4, // modifiedDate
        0, 0, 0, 0, // crc32
        details.descriptor ? 0 : 5, 0, 0, 0, // compressedSize
        details.descriptor ? 0 : 5, 0, 0, 0, // uncompressedSize
        details.fileName.length, 0, // fileNameLength
        0, 0, // extraLength
        ...Buffer.from( details.fileName ), // fileName
        // extra
        ...Buffer.alloc( 5 ),
        ...details.descriptorSignature
          ? [ 0x50, 0x4b, 0x07, 0x08 ]
          : [],
        ...details.descriptor
          ? descriptor
          : []
      ] );

      details.fileHeaderOffset = position;
      position += lh.length;

      return lh;
    })
  );

  // Create central directory listings
  const cd = Buffer.concat(
    files.map( details => {
      const offset = Buffer.alloc( 4 );
      offset.writeUInt32LE( details.fileHeaderOffset );

      const cdl = Buffer.from( [
        // CentralDirectoryListing
        // =======================
        0x50, 0x4b, 0x01, 0x02, // signature
        20, 0, // versionMadeBy
        20, 0, // versionNeeded
        0, 0, // bitFlag
        0, 0, // compressionMethod
        1, 2, // modifiedTime
        3, 4, // modifiedDate
        0, 0, 0, 0, // crc32
        5, 0, 0, 0, // compressedSize
        5, 0, 0, 0, // uncompressedSize
        8, 0, // fileNameLength
        0, 0, // extraLength
        0, 0, // commentLength
        0, 0, // fileDisk
        0, 0, // internalAttributes
        0, 0, 0, 0, // externalAttributes
        ...offset, // fileHeaderOffset
        ...Buffer.from( 'testfile' ), // fileName
        // extra
        // comment
      ] );

      return cdl;
    })
  );

  return Buffer.concat( [ l, cd ] );
}

test( 'CentralDirectoryListing initializes from buffer properly', t => {
  const sample = mock({
    fileName: 'testfile'
  });
  const reader = new Reader( sample );
  reader.findNext( Buffer.from( [ 0x50, 0x4b, 0x01, 0x02 ] ) );

  const { localHeader } = new CentralDirectoryListing( reader );

  t.is( localHeader.versionNeeded, 20 );
  t.is( localHeader.modifiedTime, 0x0201 );
  t.is( localHeader.modifiedDate, 0x0403 );
  t.is( localHeader.compressedSize, 5 );
  t.is( localHeader.uncompressedSize, 5 );
  t.is( localHeader.fileNameLength, 8 );
  t.is( localHeader.fileName, 'testfile' );
});

test( 'LocalHeader initializes properly when a Descriptor is present without a signature', t => {
  const sample = mock({
    fileName: 'testfile',
    descriptor: true
  });
  const reader = new Reader( sample );
  reader.findNext( Buffer.from( [ 0x50, 0x4b, 0x01, 0x02 ] ) );

  const { localHeader } = new CentralDirectoryListing( reader );

  t.is( localHeader.versionNeeded, 20 );
  t.is( localHeader.modifiedTime, 0x0201 );
  t.is( localHeader.modifiedDate, 0x0403 );
  t.is( localHeader.fileNameLength, 8 );
  t.is( localHeader.fileName, 'testfile' );
  t.is( localHeader.descriptor.compressedSize, 5 );
  t.is( localHeader.descriptor.uncompressedSize, 5 );
});

test( 'LocalHeader initializes properly when a Descriptor is present with a signature', t => {
  const sample = mock({
    fileName: 'testfile',
    descriptor: true,
    descriptorSignature: true
  });
  const reader = new Reader( sample );
  reader.findNext( Buffer.from( [ 0x50, 0x4b, 0x01, 0x02 ] ) );

  const { localHeader } = new CentralDirectoryListing( reader );

  t.is( localHeader.versionNeeded, 20 );
  t.is( localHeader.modifiedTime, 0x0201 );
  t.is( localHeader.modifiedDate, 0x0403 );
  t.is( localHeader.fileNameLength, 8 );
  t.is( localHeader.fileName, 'testfile' );
  t.is( localHeader.descriptor.compressedSize, 5 );
  t.is( localHeader.descriptor.uncompressedSize, 5 );
});
