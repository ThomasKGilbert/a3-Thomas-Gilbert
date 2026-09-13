require('dotenv').config()

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@${process.env.HOST}`
// check for sanity
console.log( 'uri:', uri )
const client = new MongoClient( uri )

let collection = null

async function run() {
  await client.connect()
  collection = await client.db('todo_db').collection('todos');
}

run()

app.get('/task-list', async (req, res) => {
  const tasks  = await collection.find({}).toArray();
  res.json(tasks)
})

app.post('/add-task', async (req, res) => {
  const enhancedTask = addDerivedField( req.body )
  await collection.insertOne(enhancedTask);
  const tasks  = await collection.find({}).toArray();
  res.json(tasks)
})

app.post('/delete-task', async (req, res) => {
  await collection.deleteOne({_id: new ObjectId(req.body.id)})
  const tasks  = await collection.find({}).toArray();
  res.json(tasks)
})

app.post('/toggle-task', async (req, res) => {
  const task = await collection.findOne({_id: new ObjectId(req.body.id)})
  if ( task ) {
    await collection.updateOne({_id: new ObjectId(req.body.id)}, {$set: {done: !task.done}} )
    console.log( "Toggled Task ", task )
  }
  const tasks  = await collection.find({}).toArray();
  res.json(tasks)
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