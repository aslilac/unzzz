export default class BufferReader {
  readonly currentBuffer: Buffer;
  private _position: number;

  constructor( buffer: Buffer, position = 0 ) {
    this.currentBuffer = buffer;
    this._position = position;
  }

  clone( position = this._position ) {
    return new BufferReader( this.currentBuffer, position );
  }

  findNext( data: Buffer ) {
    const foundAt = this.currentBuffer
      .slice( this.position )
      .indexOf( data );

    if ( ~foundAt ) {
      this._position += foundAt;
      return true;
    }

    return false;
  }

  moveTo( position: number ) {
    this._position = position;
  }

  moveBy( position: number ) {
    this._position += position;
  }

  get position() {
    return this._position;
  }

  peek( length: number ) {
    return this.currentBuffer.slice( this.position, this.position + length );
  }

  readRaw( length: number ) {
    const value = this.peek( length );
    this._position += length;
    return value;
  }

  readLittleEndian( length: number ) {
    const le = this.currentBuffer.readUIntLE( this.position, length );
    this._position += length;
    return le;
  }

  readString( length: number, encoding = 'utf-8' ) {
    return this.readRaw( length ).toString( encoding );
  }
}
