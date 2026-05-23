'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/salesController');

router.post('/',               ctrl.createSale);
router.get('/',                ctrl.listSales);
router.get('/report/daily',    ctrl.dailyReport);
router.get('/:id',             ctrl.getSaleById);
router.post('/:id/receipt',    ctrl.receiptUpload.single('receipt'), ctrl.uploadSaleReceipt);

module.exports = router;
