const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Schema } = mongoose;
const app = express();
require('dotenv').config();

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const mongoUri = process.env.MONGODB_URI;

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new Schema({
  username: { type: String, required: true },
  exercises: [
    {
      description: String,
      duration: Number,
      date: { type: Date, default: Date.now }
    }
  ]
});

const User = mongoose.model('User', userSchema);

app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });

  newUser.save()
    .then((user) => {
      console.log('Saved user:', user); // Add this line
      res.json({ username: user.username, _id: user._id });
    })
    .catch((err) => {
      console.error('Error saving user:', err); // Add this line
      res.status(500).send(err);
    });
});

app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });

  newUser.save()
    .then((user) => {
      res.json({ username: user.username, _id: user._id });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  User.findById(_id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const exercise = { description, duration, date: date || new Date().toDateString() };
      user.exercises.push(exercise);

      return user.save();
    })
    .then((updatedUser) => {
      const exercise = updatedUser.exercises[updatedUser.exercises.length - 1];
      exercise.date = new Date(exercise.date).toDateString();

      // Send the response after the document has been saved
      res.json({
        username: updatedUser.username,
        _id: updatedUser._id,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  User.findById(_id, (err, user) => {
    if (err) return res.status(500).send(err);

    let log = user.exercises;

    if (from) {
      log = log.filter((entry) => entry.date >= new Date(from));
    }

    if (to) {
      log = log.filter((entry) => entry.date <= new Date(to));
    }

    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    // Adjust the date format in the response
    log = log.map((entry) => ({
      description: entry.description,
      duration: entry.duration,
      date: new Date(entry.date).toDateString()
    }));

    res.json({
      username: user.username,
      _id: user._id,
      count: log.length,
      log: log
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});