const path = require( 'path' )
const zzz = require( './unzzz' )

unzzz( path.join( __dirname, 'archive.zip' ) )
  .then( archive => {
    for ( each in archive.files ) {
      archive.unzipFile( each )
    }
  })
