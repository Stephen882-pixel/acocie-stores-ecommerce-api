const { RbacAuditLog } = require('../../../models');

const record = ({ actorId, action, targetType, targetId, before, after }, transaction) =>
    RbacAuditLog.create({ actorId, action, targetType, targetId, before, after }, { transaction });

const listAuditLogs = async ({ page = 1, limit = 20 }) => {
    const { count, rows: logs } = await RbacAuditLog.findAndCountAll({
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['created_at', 'DESC']]
    });

    return {
        logs,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
        }
    };
};

module.exports = { record, listAuditLogs };
