'use strict';

require('dotenv').config();

const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_BASE_URL = process.env.AWS_S3_BASE_URL
    || `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !S3_BUCKET) {
    console.warn(
        '[S3 Config] WARNING: AWS credentials or bucket name are missing.\n' +
        '  Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET and AWS_REGION in your .env file.'
    );
}

module.exports = { s3Client, S3_BUCKET, S3_BASE_URL };
