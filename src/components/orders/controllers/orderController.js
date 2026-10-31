'use strict';

const orderService = require('../services/orderService');
const { sendSuccess } = require('../../../helpers/response.helper');

const getOrderHistory = async (req, res) => {
    const { orders, pagination } = await orderService.getOrderHistory(req.user.userId, req.query);
    return sendSuccess(res, orders, { meta: { pagination } });
};

const getOrderById = async (req, res) => {
    const order = await orderService.getOrderById(req.params.id, req.user.userId);
    return sendSuccess(res, order);
};

const getOrderByNumber = async (req, res) => {
    const order = await orderService.getOrderByNumber(req.params.orderNumber, req.user.userId);
    return sendSuccess(res, order);
};

const getOrderTracking = async (req, res) => {
    const tracking = await orderService.getOrderTracking(req.params.id, req.user.userId);
    return sendSuccess(res, tracking);
};

const requestOrderCancellation = async (req, res) => {
    const cancellation = await orderService.requestOrderCancellation(req.params.id, req.user.userId, req.body.reason);
    return sendSuccess(res, cancellation, { statusCode: 201, message: 'Cancellation request submitted successfully' });
};

const requestReturn = async (req, res) => {
    const returnRequest = await orderService.requestReturn(req.params.id, req.user.userId, req.body.reason);
    return sendSuccess(res, returnRequest, { statusCode: 201, message: 'Return request submitted successfully' });
};

const addCustomerNote = async (req, res) => {
    const note = await orderService.addCustomerNote(req.params.id, req.user.userId, req.body.content);
    return sendSuccess(res, note, { statusCode: 201, message: 'Note added successfully' });
};

const getOrderStats = async (req, res) => {
    const stats = await orderService.getOrderStats(req.user.userId);
    return sendSuccess(res, stats);
};

module.exports = {
    getOrderHistory,
    getOrderById,
    getOrderByNumber,
    getOrderTracking,
    requestOrderCancellation,
    requestReturn,
    addCustomerNote,
    getOrderStats
};
