import test from 'ava';
import { crc } from '..';

test( 'crc32 of "123456789" is 0xcbf43926', t => {
  // We must "bit shift" the value so that it becomes
  // an i32, which is what the crc function returns.
  t.is( crc( Buffer.from( '123456789' ) ), 0xcbf43926 >> 0 );
});
