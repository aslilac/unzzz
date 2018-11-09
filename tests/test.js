const path = require( 'path' )
const unzzz = require( 'unzzz' )

unzzz( path.join( __dirname, 'archive.zip' ) )
  .then( archive => {
    let i = 0;
    for ( each in archive.files ) {
      if ( i++ < 3 ) archive.unzipFile( each, path.join( __dirname, 'output', path.basename( each ) ) )
      console.log( each )
    }
  })


// unzzz( path.join( __dirname, 'archive.zip' ) )
//   .then( archive => {
//     for ( each in archive.files ) {
//       archive.unzipBuffer( each )
//         .then( unzzz )
//         .then( innerArchive => {
//           innerArchive.unzipBuffer( 'index.html' )
//             .then( html => {})
//
//           innerArchive.unzipBuffer( 'index.css' )
//             .then( css => {})
//
//           innerArchive.unzipBuffer( 'index.js' )
//             .then( js => {})
//         })
//     }
//   })
//
// async function grader() {
//   let archive = await unzzz( path.join( __dirname, 'archive.zip' ) )
//   for ( each in archive.files ) {
//     let innerArchive = await unzzz( await archive.unzipBuffer( each ) )
//     let html = await innerArchive.unzipBuffer( 'index.html' )
//     let css = await innerArchive.unzipBuffer( 'index.css' )
//     let js = await innerArchive.unzipBuffer( 'index.js' )
//   }
// }
