const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the UTAPS directory
app.use(express.static(path.join(__dirname, '../UTAPS')));

// Fallback to index.html for SPA routing
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../UTAPS/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  TaxUmuahia · UTAPS Static Server        ║`);
  console.log(`║  Running on http://localhost:${PORT}         ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});

module.exports = app;