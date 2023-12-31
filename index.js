const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Schema } = mongoose;
const app = express();
require('dotenv').config();

app.use(cors());
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

const createAndSaveUser = (username, done) => {
  const newUser = new User({ username });

  newUser.save()
    .then((user) => {
      console.log('Saved user:', user);
      done(null, { username: user.username, _id: user._id });
    })
    .catch((err) => {
      console.error('Error saving user:', err);
      done(err);
    });
};

app.post('/api/users', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  createAndSaveUser(username, (err, result) => {
    if (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    console.log('User created successfully:', result);
    res.json(result);
  });
});

const getAllUsers = (done) => {
  User.find({})
    .then((users) => {
      const userArray = users.map((user) => ({
        username: user.username,
        _id: user._id,
      }));
      done(null, userArray);
    })
    .catch((err) => {
      console.error('Error fetching users:', err);
      done(err);
    });
};

const addExerciseToUser = (_id, description, duration, date, done) => {
  User.findById(_id)
    .then((user) => {
      if (!user) {
        return done({ error: 'User not found' });
      }

      const exercise = { description, duration, date: date || new Date().toDateString() };
      user.exercises.push(exercise);

      return user.save();
    })
    .then((updatedUser) => {
      const exercise = updatedUser.exercises[updatedUser.exercises.length - 1];
      exercise.date = new Date(exercise.date).toDateString();

      done(null, {
        username: updatedUser.username,
        _id: updatedUser._id,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      });
    })
    .catch((err) => {
      done(err);
    });
};

const getUserExerciseLog = (_id, from, to, limit, done) => {
  User.findById(_id, (err, user) => {
    if (err) {
      console.error('Error finding user:', err);
      return done('Internal Server Error');
    }

    if (!user) {
      return done({ error: 'User not found' });
    }

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

    log = log.map((entry) => ({
      description: entry.description,
      duration: entry.duration,
      date: new Date(entry.date).toDateString()
    }));

    done(null, {
      username: user.username,
      _id: user._id,
      count: log.length,
      log: log
    });
  });
};

app.get('/api/users', (req, res) => {
  getAllUsers((err, result) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(result);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  addExerciseToUser(_id, description, duration, date, (err, result) => {
    if (err) {
      console.error('Error adding exercise:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(result);
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  getUserExerciseLog(_id, from, to, limit, (err, result) => {
    if (err) {
      console.error('Error fetching exercise log:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(result);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});