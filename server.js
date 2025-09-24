'use strict';

const path = require('path');
const express = require('express');
const { createJobIntelRouter } = require('./api/job-intel');
const { createCareerCoachRouter } = require('./api/career-coach');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));
app.use('/api/job-intel', createJobIntelRouter());
app.use('/api/career-coach', createCareerCoachRouter());

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error in API', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Pathfinder server listening on port ${PORT}`);
});
