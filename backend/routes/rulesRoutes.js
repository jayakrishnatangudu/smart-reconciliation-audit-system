const express = require('express');
const router = express.Router();
const rulesController = require('../controllers/rulesController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET routes - accessible by all authenticated users
router.get('/', rulesController.getAllRules);
router.get('/:id', rulesController.getRule);

// POST, PUT, DELETE routes - Admin only
router.post('/', authorize('Admin'), rulesController.createRule);
router.put('/:id', authorize('Admin'), rulesController.updateRule);
router.delete('/:id', authorize('Admin'), rulesController.deleteRule);
router.patch('/:id/toggle', authorize('Admin'), rulesController.toggleRule);
router.put('/reorder', authorize('Admin'), rulesController.reorderRules);

module.exports = router;
