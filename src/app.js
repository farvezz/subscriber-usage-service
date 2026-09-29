const path = require('path');
const express = require('express');
const usageRoutes = require('./routes/usageRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public'))); // simple bonus frontend

app.use('/api', usageRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Fallback error handler (e.g. malformed JSON body)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Subscriber Usage API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
