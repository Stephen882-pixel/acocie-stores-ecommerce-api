'use strict';


const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sharp = require('sharp');

const { s3Client, S3_BUCKET, S3_BASE_URL } = require('../config/s3');


const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]);

/**
 * Build a unique S3 object key.
 * @param {string} folder  - e.g. 'products', 'categories'
 * @param {string} originalName - original filename from the upload
 * @returns {string} e.g. 'products/2025/06/uuid-filename.webp'
 */
const generateKey = (folder, originalName) => {
    const ext  = path.extname(originalName).toLowerCase() || '.webp';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${folder}/${year}/${month}/${uuidv4()}${ext}`;
};

/**
 * Optimise an image buffer with sharp.
 * Resizes to a max of 1200px on the longest side and converts to WebP for
 * non-GIF uploads, preserving GIFs as-is.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<{ buffer: Buffer, mimeType: string, ext: string }>}
 */
const optimiseImage = async (buffer, mimeType) => {
    if (mimeType === 'image/gif') {
        return { buffer, mimeType: 'image/gif', ext: '.gif' };
    }

    const optimised = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

    return { buffer: optimised, mimeType: 'image/webp', ext: '.webp' };
};

/**
 * Upload a single file buffer to S3.
 *
 * @param {Buffer}  buffer       - raw file data (from multer memoryStorage)
 * @param {string}  folder       - destination folder inside the bucket (e.g. 'products')
 * @param {string}  originalName - original filename, used to derive the extension
 * @param {string}  mimeType     - MIME type of the file
 * @param {object}  [options]
 * @param {boolean} [options.optimise=true]  - run through sharp before uploading
 * @param {boolean} [options.isPublic=true]  - set ACL to public-read
 * @returns {Promise<{ key: string, url: string }>}
 */
const uploadToS3 = async (buffer, folder, originalName, mimeType, options = {}) => {
    const { optimise = true, isPublic = true } = options;

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new Error(`Unsupported file type: ${mimeType}. Allowed: jpeg, png, webp, gif`);
    }

    let finalBuffer   = buffer;
    let finalMimeType = mimeType;
    let finalName     = originalName;

    if (optimise) {
        const result = await optimiseImage(buffer, mimeType);
        finalBuffer   = result.buffer;
        finalMimeType = result.mimeType;
        finalName = path.basename(originalName, path.extname(originalName)) + result.ext;
    }

    const key = generateKey(folder, finalName);

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket:      S3_BUCKET,
            Key:         key,
            Body:        finalBuffer,
            ContentType: finalMimeType,
        },
    });

    await upload.done();

    const url = `${S3_BASE_URL}/${key}`;
    return { key, url };
};

/**
 * Upload multiple file buffers to S3 in parallel.
 *
 * @param {Array<{ buffer: Buffer, originalname: string, mimetype: string }>} files
 * @param {string} folder
 * @param {object} [options]
 * @returns {Promise<Array<{ key: string, url: string }>>}
 */
const uploadManyToS3 = async (files, folder, options = {}) => {
    return Promise.all(
        files.map((file) =>
            uploadToS3(file.buffer, folder, file.originalname, file.mimetype, options)
        )
    );
};

/**
 * Delete a file from S3 by its object key.
 *
 * @param {string} key - S3 object key (e.g. 'products/2025/06/uuid.webp')
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (key) => {
    if (!key) return;

    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key:    key,
        })
    );
};

/**
 * Extract the S3 object key from a full URL.
 * Useful when you store the URL in the DB and need to delete the object.
 *
 * @param {string} url - full S3 URL
 * @returns {string|null}
 */
const keyFromUrl = (url) => {
    if (!url) return null;
    try {
        const { pathname } = new URL(url);
        // pathname starts with '/', strip it
        return pathname.slice(1);
    } catch {
        return null;
    }
};

module.exports = {
    uploadToS3,
    uploadManyToS3,
    deleteFromS3,
    keyFromUrl,
    ALLOWED_MIME_TYPES,
};
