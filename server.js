const express = require('express')
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))

// MongoDB and mongoose connect
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// MODELS
const usersModel = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});
const USER = mongoose.model('USERS', usersModel);

const exercisesModel = new mongoose.Schema({
  username: String,
  description: {
    type: String,
    required: true,
    maxlength: [128, 'Description too long, not greater than 128']
  },
  duration: {
    type: Number,
    required: true,
    min: [1, 'Duration too short, at least 1 minute']
  },
  date: Date
});
const EXERCISE = mongoose.model('EXERCISES', exercisesModel);


// INDEX
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POSTS
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  let find = await USER.findOne({ username: username });
  if (find) {
    res.json({ username: find.username, _id: find._id });
  }
  else {
    let newUser = new USER({ username: username });
    newUser.save((err, save) => {
      if (err) return console.log(err);
      res.json({
        username: username,
        _id: save._id
      });
    });
  }

});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const id = req.params._id;
  try {
    let find = await USER.findById(id);
    if (find) {
      let _date = (date !== '' || date !== null) ? new Date(date) : new Date();
      _date = (_date.toString() !== "Invalid Date") ? _date.toDateString() : new Date().toDateString();

      let newExercise = new EXERCISE({ username: find.username, description: description, duration: duration, date: _date });
      newExercise.save((err, s) => {
        if (err) return console.log(err);
        res.json({ _id: s._id, username: find.username, description: description, duration: duration, date: _date });
      });
    } else {
      res.json({ error: "user don't exist" });
    }
  }
  catch (e) {
    console.log(e);
  }
});

// GET
app.get('/api/users', (req, res) => {
  USER.find({}, (err, users) => {
    if (err) return console.log(err);
    res.json(users);
  });
});

app.get('/api/users/:_id/logs?', async (req, res) => {
  const index = req.params._id;
  let { from, to, limit } = req.query;

  let user = await USER.findById(index);
  if (user) {
    from = new Date(from).toDateString();
    to = new Date(to).toDateString();

    if (from.toString() !== "Invalid Date" && to.toString() !== "Invalid Date" && parseInt(limit) > 0) {
      EXERCISE.find({ username: user.username }).where('date').gte(from).lte(to).limit(parseInt(limit)).exec().then((e) => {
        res.json({
          _id: user._id,
          username: user.username,
          count: e.length,
          log: e.map(data => ({
            description: data.description,
            duration: data.duration,
            date: data.date.toDateString()
          }))
        });
      });
    }
    else {
      EXERCISE.find({ username: user.username }).exec().then((e) => {
        res.json({
          _id: user._id,
          username: user.username,
          count: e.length,
          log: e.map(data => ({
            description: data.description,
            duration: data.duration,
            date: data.date.toDateString()
          }))
        });
      });
    }
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
