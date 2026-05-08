/**
 * Generic Joi validation middleware.
 *
 * Usage at the route level:
 *   router.post('/register', validate(authSchema.signup), authController.signup);
 *
 * By default validates req.body. Pass a second argument to validate a different
 * part of the request:
 *   validate(schema, 'query')  → validates req.query
 *   validate(schema, 'params') → validates req.params
 */

const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,  
            stripUnknown: true, 
            convert: true 
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.context?.label || detail.path.join('.'),
                message: detail.message.replace(/['"]/g, '') 
            }));

            return res.status(400).json({
                error: 'Validation failed',
                errors
            });
        }

        req[source] = value;
        next();
    };
};

module.exports = validate;
