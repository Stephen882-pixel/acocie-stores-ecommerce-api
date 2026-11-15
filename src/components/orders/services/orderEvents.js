'use strict';

const eventService = require('../../events/services/eventService');
const { EVENTS, LEVELS } = require('../../events/constants/events');

/**
 * Tells the customer, live, that their order's status changed. Call it inside
 * the same transaction as the status update: the event is then sent only if
 * the change commits (SSE_DESIGN.md, section 7).
 */
const recordStatusChanged = (transaction, order, from, to) =>
    eventService.record(transaction, {
        event: EVENTS.ORDER_STATUS_CHANGED,
        feature: 'orders',
        level: LEVELS.STANDARD,
        to: { userIds: [order.userId] },
        data: { orderId: order.id, orderNumber: order.orderNumber, from, to }
    });

module.exports = { recordStatusChanged };
