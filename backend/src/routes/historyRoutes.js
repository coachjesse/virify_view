const express = require('express');
const historyController = require('../controllers/historyController');

const router = express.Router();

router.post('/', historyController.addHistory);
router.get('/', historyController.getHistorys);
router.delete('/:id', historyController.deleteHistory);

module.exports = router;

