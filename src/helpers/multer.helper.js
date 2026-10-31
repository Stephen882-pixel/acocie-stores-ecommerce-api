'use strict';


const multer = require('multer');
const { ALLOWED_MIME_TYPES } = require('./s3.helper');
const { sendError } = require('./response.helper');


const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE    = MAX_FILE_SIZE_MB * 1024 * 1024; // bytes


const storage = multer.memoryStorage();


const imageFileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new multer.MulterError(
                'LIMIT_UNEXPECTED_FILE',
                `Invalid file type "${file.mimetype}". Allowed types: jpeg, png, webp, gif`
            ),
            false
        );
    }
};


const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files:    15,          // absolute maximum across all fields
    },
});


const uploadProductImages = upload.fields([
    { name: 'images',        maxCount: 10 },
    { name: 'variantImages', maxCount: 5  },
]);

/**
 * Single image upload (e.g. category thumbnail, user avatar).
 * File available at req.file
 * @param {string} fieldName
 */
const uploadSingleImage = (fieldName = 'image') => upload.single(fieldName);

/**
 * Generic array upload for any field.
 * @param {string} fieldName
 * @param {number} maxCount
 */
const uploadImageArray = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);


const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE:      `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`,
            LIMIT_FILE_COUNT:     'Too many files uploaded.',
            LIMIT_UNEXPECTED_FILE: err.message || 'Unexpected file field.',
        };
        return sendError(res, 400, messages[err.code] || `Upload error: ${err.message}`, { code: 'UPLOAD_ERROR' });
    }
    next(err);
};

module.exports = {
    upload,
    uploadProductImages,
    uploadSingleImage,
    uploadImageArray,
    handleMulterError,
};
