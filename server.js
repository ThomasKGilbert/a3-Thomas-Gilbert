const http = require( 'http' ),
      fs   = require( 'fs' ),
      // IMPORTANT: you must run `npm install` in the directory for this assignment
      // to install the mime library if you're testing this on your local machine.
      // On Render, make sure `npm install` is your build command.
      mime = require( 'mime' ),
      dir  = 'public/',
      port = 3000

const appdata = []

const server = http.createServer( function( request,response ) {
  if( request.method === 'GET' ) {
    handleGet( request, response )    
  }else if( request.method === 'POST' ){
    handlePost( request, response ) 
  }
})

const handleGet = function( request, response ) {
  const filename = dir + request.url.slice( 1 ) 

  if( request.url === '/' ) {
    sendFile( response, 'public/index.html' )
  } else if( request.url === '/task-list' ) {
    response.writeHead( 200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(appdata))
  } else{
    sendFile( response, filename )
  }
}

const handlePost = function( request, response ) {
  let dataString = ''

  request.on( 'data', function( data ) {
      dataString += data 
  })

  request.on( 'end', function() {
    console.log( JSON.parse( dataString ) )

    const incomingTask = JSON.parse(dataString)

    if(request.url === '/add-task' ) {
      const enhancedTask = addDerivedField( incomingTask )
      enhancedTask.id = appdata.length ? Math.max(...appdata.map(task => task.id)) + 1 : 1 // I hate Math.max() :(
      appdata.push( enhancedTask )

      response.writeHead( 200, "OK", {'Content-Type': 'application/json' })
      response.end(JSON.stringify(appdata))
    } else if (request.url === '/delete-task' ) {
      const index = appdata.findIndex( task => task.id === incomingTask.id )
      if( index !== -1 ) {
        console.log( "Deleting Task ", appdata[index] )
        appdata.splice(index, 1)
      }

      response.writeHead( 200, "OK", {'Content-Type': 'application/json' })
      response.end(JSON.stringify(appdata))
    }else if(request.url === '/toggle-task' ) {
      const task = appdata.find( task => task.id === incomingTask.id )
      if ( task ) {
        task.done = !task.done
        console.log( "Toggled Task ", task )
      }

      response.writeHead( 200, "OK", {'Content-Type': 'application/json' })
      response.end(JSON.stringify(appdata))
    } else{
      response.writeHead(404)
      response.end("404 Not Found")
    }
  })
}

const addDerivedField = function( newTask ) {
  const daysTillDeadline = newTask.priority === 'high' ? 1 : newTask.priority === 'medium' ? 3 : 6

  const dateCreated = new Date( newTask.creationDate )
  const deadlineDate = new Date( dateCreated )
  deadlineDate.setDate( dateCreated.getDate() + daysTillDeadline )

  return {
    ...newTask,
    deadline: deadlineDate.toISOString().split('T')[0]
  }
}

const sendFile = function( response, filename ) {
   const type = mime.getType( filename ) 

   fs.readFile( filename, function( err, content ) {

     // if the error = null, then we've loaded the file successfully
     if( err === null ) {

       // status code: https://httpstatuses.com
       response.writeHeader( 200, { 'Content-Type': type })
       response.end( content )

     }else{

       // file not found, error code 404
       response.writeHeader( 404 )
       response.end( '404 Error: File Not Found' )

     }
   })
}

server.listen( process.env.PORT || port )
