const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const appdata = []

app.get('/task-lists', (req, res) => {
  res.json(appdata)
})

app.post('/add-task', (req, res) => {
  const enhancedTask = addDerivedField( req.body )
  enhancedTask.id = appdata.length ? Math.max(...appdata.map(task => task.id)) + 1 : 1 // I hate Math.max() :(
  appdata.push( enhancedTask )
  res.json(appdata)
})

app.post('/delete-task', (req, res) => {
  const index = appdata.findIndex( task => task.id === req.body.id )
  if( index !== -1 ) {
    console.log( "Deleting Task ", appdata[index] )
    appdata.splice(index, 1)
  }
  res.json(appdata)
})

app.post('toggle-task', (req, res) => {
  const task = appdata.find( task => task.id === req.body.id )
  if ( task ) {
    task.done = !task.done
    console.log( "Toggled Task ", task )
  }
  res.json(appdata)
})

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

app.listen(process.env.PORT || port, () => {
  console.log(`Listening on port ${port}`)
});