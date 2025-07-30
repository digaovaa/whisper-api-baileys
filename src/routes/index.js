const express = require('express');
const docsRoutes = require('./docs.routes');
const apiRoutes = require('./api.routes');

const router = express.Router();

// Documentation and API routes
router.use(docsRoutes);
router.use('/api/v1', apiRoutes);

module.exports = router;
