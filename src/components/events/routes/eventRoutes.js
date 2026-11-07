const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authenticate = require('../../auth/middleware/authMiddleware');
const sseAuth = require('../middleware/sseAuth');

router.get('/token', authenticate, eventController.token);
router.get('/stream', sseAuth, eventController.stream);

module.exports = router;
