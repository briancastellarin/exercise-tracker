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
    return res.json({ username: find.username, _id: find._id, });
  }
  else {
    let newUser = new USER({ username: username });
    newUser.save((err, s) => {
      let error = s.validateSync();
      if (err) return console.log(err + ' | ' + error);
      res.json({
        username: username,
        _id: s._id
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
      _date = (_date.toString() !== "Invalid Date") ? _date : new Date();

      let newExercise = new EXERCISE({ username: find.username, description: description, duration: parseInt(duration), date: _date });

      newExercise.save((err, s) => {
        let error = s.validateSync();
        if (err) return console.log(err + ' | ' + error);
        res.json({ username: find.username, description: description, duration: parseInt(duration), date: _date.toDateString(), _id: id });
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
    let exercs = await EXERCISE.find({ username: user.username });
    if (exercs) {
      const initial = exercs.length;
      if (from) {
        const fromDate = new Date(from)
        exercs = exercs.filter(i => new Date(i.date) > fromDate);
      }

      if (to) {
        const toDate = new Date(to)
        exercs = exercs.filter(f => new Date(f.date) < toDate);
      }

      if (limit) {
        exercs = exercs.slice(0, limit);
      }

      res.json({
        username: user.username,
        count: initial,
        _id: user._id,
        log: exercs.map(data => ({
          description: data.description,
          duration: parseInt(data.duration),
          date: data.date.toDateString()
        }))
      });
    }
    else {
      res.json({
        username: user.username,
        count: exercs.length,
        _id: user._id,
        log: exercs.map(data => ({
          description: data.description,
          duration: parseInt(data.duration),
          date: data.date.toDateString()
        }))
      });
    }
  }

});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
