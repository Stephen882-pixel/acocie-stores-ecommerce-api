'use strict';

const vendorOrderService = require('../services/vendorOrderService');
const { can } = require('../../rbac/services/permissionService');
const { PERMISSIONS: P } = require('../../rbac/constants/permissions');
const { sendSuccess } = require('../../../helpers/response.helper');

// Admins read all vendors' orders (optionally one vendor); vendors read only their own.
const readScopeVendorId = (req) => can(req.user, P.VENDOR_ORDER_READ_ANY) ? req.query.vendorId : req.user.userId;

const getVendorOrders = async (req, res) => {
    const { orders, pagination } = await vendorOrderService.getVendorOrders(readScopeVendorId(req), req.query);
    return sendSuccess(res, orders, { meta: { pagination } });
};

const getVendorOrderById = async (req, res) => {
    const order = await vendorOrderService.getVendorOrderById(req.params.id, readScopeVendorId(req));
    return sendSuccess(res, order);
};

const acceptOrder = async (req, res) => {
    const order = await vendorOrderService.acceptOrder(req.params.id, req.user.userId);
    return sendSuccess(res, order, { message: 'Order accepted and moved to processing' });
};

const shipOrder = async (req, res) => {
    const order = await vendorOrderService.shipOrder(req.params.id, req.user.userId, req.body);
    return sendSuccess(res, order, { message: 'Order marked as shipped' });
};

const markAsDelivered = async (req, res) => {
    const order = await vendorOrderService.markAsDelivered(req.params.id, req.user.userId);
    return sendSuccess(res, order, { message: 'Order marked as delivered' });
};

const updateTracking = async (req, res) => {
    const tracking = await vendorOrderService.updateTracking(req.params.id, req.user.userId, req.body);
    return sendSuccess(res, tracking, { message: 'Tracking information updated' });
};

const addVendorNote = async (req, res) => {
    const note = await vendorOrderService.addVendorNote(req.params.id, req.user.userId, req.body);
    return sendSuccess(res, note, { statusCode: 201, message: 'Note added successfully' });
};

const getVendorDashboardStats = async (req, res) => {
    const stats = await vendorOrderService.getVendorDashboardStats(req.user.userId);
    return sendSuccess(res, stats);
};

module.exports = {
    getVendorOrders,
    getVendorOrderById,
    acceptOrder,
    shipOrder,
    markAsDelivered,
    updateTracking,
    addVendorNote,
    getVendorDashboardStats
};
