require('dotenv').config()

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
}))

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@${process.env.HOST}`
// check for sanity
console.log( 'uri:', uri )
const client = new MongoClient( uri )

let usersCollection = null
let tasksCollection = null

async function run() {
  await client.connect()
  const db = client.db('todo_db')
  tasksCollection = db.collection('tasks');
  usersCollection = db.collection('users');
}

run()

app.get('/', (req, res) => {
  if(!req.session.userId) {
    return res.redirect('/login.html')
  }
  res.sendFile(__dirname + '/public/index.html')
})

app.use(express.static('public', {index: false}));

app.get('/task-list', requireLogin, async (req, res) => {
  const tasks  = await tasksCollection.find({userId: req.session.userId}).toArray();
  res.json(tasks)
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const userExists = await usersCollection.findOne({username})

  if(!userExists) {
    //user doesn't have an account, create one
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await usersCollection.insertOne({username, password: hashedPassword})

    req.session.userId = result.insertedId
    req.session.username = username

    return res.json({success: true, newAccount: true})
  }

  const passwordMatch = await bcrypt.compare(password, userExists.password)

  if(!passwordMatch) {
    return res.status(401).json({success: false, message: 'Incorrect password' })
  }

  req.session.userId = userExists._id;
  req.session.username = userExists.username;
  res.json({success: true, newAccount: false})
})

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({success: true})
  })
})

app.post('/add-task', requireLogin, async (req, res) => {
  const enhancedTask = addDerivedField( req.body )
  enhancedTask.userId = req.session.userId
  await tasksCollection.insertOne(enhancedTask);
  const tasks  = await tasksCollection.find({userId: req.session.userId}).toArray();
  res.json(tasks)
})

app.post('/edit-task', requireLogin, async (req, res) => {
  const { id, task, priority } = req.body

  const existingTask = await tasksCollection.findOne({_id: new ObjectId(id), userId: req.session.userId})

  if(!existingTask) {
    return res.status(404).json({message: 'Task not found'})
  }

  const daysTillDeadline = priority === 'high' ? 1 : priority === 'medium' ? 3 : 6

  const dateCreated = new Date( existingTask.creationDate )
  const deadlineDate = new Date( dateCreated )
  deadlineDate.setDate( dateCreated.getDate() + daysTillDeadline )

  await tasksCollection.updateOne(
      { _id: new ObjectId(id), userId: req.session.userId },
      { $set: {
        task, priority, deadline: deadlineDate.toISOString().split('T')[0]
        }}
  )

  const tasks = await tasksCollection.find({userId: req.session.userId}).toArray()
  res.json(tasks)
})

app.post('/delete-task', requireLogin, async (req, res) => {
  await tasksCollection.deleteOne({_id: new ObjectId(req.body.id), userId: req.session.userId})
  const tasks  = await tasksCollection.find({userId: req.session.userId}).toArray();
  res.json(tasks)
})

app.post('/toggle-task', requireLogin, async (req, res) => {
  const task = await tasksCollection.findOne({_id: new ObjectId(req.body.id), userId: req.session.userId})
  if ( task ) {
    await tasksCollection.updateOne({_id: new ObjectId(req.body.id), userId: req.session.userId}, {$set: {done: !task.done}} )
    console.log( "Toggled Task ", task )
  }
  const tasks  = await tasksCollection.find({userId: req.session.userId}).toArray();
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

function requireLogin(req, res, next) {
  if(!req.session.userId) {
    return res.status(401).json({message: 'Not logged in'})
  }
  next()
}

app.listen(process.env.PORT || port, () => {
  console.log(`Listening on port ${port}`)
});