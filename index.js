const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});

const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description: String,
  duration: Number,
  date: Date
});

const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors());
app.use("/public", express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  const newUser = new User({ username });

  try {
    const result = await newUser.save();
    res.json({
      _id: result._id,
      username: result.username
    });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (e) {
    res.json({ error: e });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.json({ error: 'user not found' });
    } else {
      const exercise = new Exercise({
        userId: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      });
      const result = await exercise.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: result.description,
        duration: result.duration,
        date: result.date.toDateString()
      });
    }
  } catch (e) {
    console.log(e);
    res.json({ error: e });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id;
  const { from, to, limit } = req.query;
  const user = await User.findById(id);

  if (!user) {
    res.send('user not found');
  }

  let dateObj = {};
  if (from) {
    dateObj['$gte'] = new Date(from);
  }
  if (to) {
    dateObj['$lte'] = new Date(to);
  }

  let filter = { userId: id };
  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ? +limit : 90);

  res.json({
    userId: id,
    username: user.username,
    count: exercises.length,
    log: exercises.map(exercise => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      };
    })
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});