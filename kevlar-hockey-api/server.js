const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const dataDir = path.join(__dirname, 'data');

function loadJson(file) {
  try {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {error: 'Data not available'};
  }
}

app.get('/api/nhl/teams', (req, res) => {
  res.json(loadJson('teams.json'));
});

app.get('/api/nhl/schedule', (req, res) => {
  res.json(loadJson('schedule.json'));
});

app.get('/api/nhl/scores', (req, res) => {
  res.json(loadJson('scores.json'));
});

app.get('/api/nhl/standings', (req, res) => {
  res.json(loadJson('standings.json'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NHL API server listening on port ${PORT}`));
