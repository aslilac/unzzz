const poly = 0xEDB88320;
const lookup = new Uint32Array( 256 );
lookup.forEach( ( _, i, self ) => {
  let crc = i;
  for ( let bit = 0; bit < 8; bit++ ) {
    crc = crc & 1
      ? crc >>> 1 ^ poly
      : crc >>> 1;
  }

  self[ i ] = crc;
});

export default function crc32( data: Buffer | Uint8Array | number[] ) {
  const input = Uint8Array.from( data );

  return ~input.reduce(
    ( crc, byte ) => lookup[ ( crc ^ byte ) & 0xFF ] ^ crc >>> 8,
    0xFFFFFFFF
  );
}
