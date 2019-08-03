import test from 'ava';
import { Reader } from '..';

const buffer = Buffer.alloc( 256 );
buffer.forEach( ( _, i, self ) => {
  self[ i ] = i;
});

const parent = new Reader( buffer );

test( 'Readers can be cloned', t => {
  const reader1 = parent.clone();
  const reader2 = parent.clone( 40 );

  t.is( reader1.position, 0 );
  t.is( reader1.currentBuffer, buffer );
  t.not( reader1, parent );
  t.is( reader2.position, 40 );
  t.is( reader2.currentBuffer, buffer );
  t.not( reader2, parent );
});

test( 'Position can be changed absolutely', t => {
  const reader = parent.clone();

  reader.moveTo( 0x40 );
  t.is( reader.readLittleEndian( 4 ), 0x43424140 );
});

test( 'Position can be changed relatively', t => {
  const reader = parent.clone();

  reader.moveTo( 0x40 );
  reader.moveBy( 0x10 );
  t.is( reader.readLittleEndian( 4 ), 0x53525150 );

  reader.moveBy( -0x10 );
  t.is( reader.readLittleEndian( 4 ), 0x47464544 );
});

test( 'Position cannot be set out of bounds absolutely', t => {
  const reader = parent.clone();

  reader.moveTo( -1 );
  t.is( reader.position, 0 );

  reader.moveTo( buffer.length + 1 );
  t.is( reader.position, buffer.length - 1 );
});

test( 'Position cannot be set out of bounds relatively', t => {
  const back = parent.clone();
  const forward = parent.clone();

  back.moveBy( -1 );
  t.is( back.position, 0 );

  forward.moveBy( buffer.length + 1 );
  t.is( forward.position, buffer.length - 1 );
});

test( 'Position can be changed using findNext', t => {
  const reader = parent.clone();
  const found = reader.findNext( Buffer.from( [ 40, 41, 42 ] ) );

  t.true( found );
  t.is( reader.position, 40 );
});

test( 'Failure of findNext is handled properly', t => {
  const reader = parent.clone();
  const found = reader.findNext( Buffer.from( [ 40, 42, 43 ] ) );

  t.false( found );
  t.is( reader.position, 0 );
});

test( 'Can peek ahead without moving position', t => {
  const reader = parent.clone();
  const peek = reader.peek( 5 );

  t.true( Buffer.isBuffer( peek ) );
  t.true( peek.equals( buffer.slice( 0, 5 ) ) );
  t.is( reader.position, 0 );
});

test( 'Can read a raw buffer segment', t => {
  const reader = parent.clone();
  const read = reader.readRaw( 5 );

  t.true( Buffer.isBuffer( read ) );
  t.true( read.equals( buffer.slice( 0, 5 ) ) );
  t.is( reader.position, 5 );
});

test( 'Readers can parse LE integers', t => {
  const reader = parent.clone();

  t.is( reader.readLittleEndian( 4 ), 0x03020100 );
  t.is( reader.position, 4 );
  t.is( reader.readLittleEndian( 2 ), 0x0504 );
  t.is( reader.position, 6 );
});

test( 'Readers can parse signed LE integers', t => {
  const reader = parent.clone( 0x7d );

  t.is( reader.readSignedLittleEndian( 4 ), 0x807f7e7d >> 0 );
});

test( 'Reader can read strings', t => {
  const reader = parent.clone( 65 );

  t.is( reader.readString( 7 ), 'ABCDEFG' );
  t.is( reader.position, 72 );
});
