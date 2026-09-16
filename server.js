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
app.use(express.static('public'));

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@${process.env.HOST}`
// check for sanity
console.log( 'uri:', uri )
const client = new MongoClient( uri )

let usersCollection = null
let tasksCollection = null

async function run() {
  await client.connect()
  const db = client.db('todo_db')
  taskscollection = db.collection('tasks');
  usersCollection = db.collection('users');
}

run()

app.get('/', (req, res) => {
  if(!req.session.userId) {
    return res.redirect('/login.html')
  }
  res.sendFile(__dirname + '/public/index.html')
})

app.get('/task-list', requireLogin, async (req, res) => {
  const tasks  = await taskscollection.find({}).toArray();
  res.json(tasks)
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const userExists = await usersCollection.findOne({username})

  if(!userExists) {
    //user doesn't have an account, create one
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await usersCollection.insertOne({username, password: hashedPassword})

    req.session.userId = result.insertId
    req.session.username = username

    return res.json({success: true, newAccount: true})
  }

  const passworkdMatch = await bcrypt.compare(password, userExists.password)

  if(!passworkdMatch) {
    return res.status(401).json({success: false, message: 'Incorrect password' })
  }

  req.session.userId = userExists._id;
  req.session.username = userExists.username;
  res.json({success: true, newAccount: false})
})

app.post('logout', (req, res) => {
  req.session.destroy(() => {
    res.json({success: true})
  })
})

app.post('/add-task', requireLogin, async (req, res) => {
  const enhancedTask = addDerivedField( req.body )
  await taskscollection.insertOne(enhancedTask);
  const tasks  = await taskscollection.find({}).toArray();
  res.json(tasks)
})

app.post('/delete-task', async (req, res) => {
  await taskscollection.deleteOne({_id: new ObjectId(req.body.id), userId: req.session.userId})
  const tasks  = await taskscollection.find({}).toArray();
  res.json(tasks)
})

app.post('/toggle-task', async (req, res) => {
  const task = await taskscollection.findOne({_id: new ObjectId(req.body.id)})
  if ( task ) {
    await taskscollection.updateOne({_id: new ObjectId(req.body.id)}, {$set: {done: !task.done}} )
    console.log( "Toggled Task ", task )
  }
  const tasks  = await taskscollection.find({}).toArray();
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