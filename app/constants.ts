// Backend
export const environment = 'local';
export const AWS_REGION = 'ap-south-2';
export const AWS_ENDPOINT = 'http://localhost:9000';
export const AWS_ACCESS_KEY = 'minioadmin';
export const AWS_SECRET_KEY = 'minioadmin';
export const AWS_BUCKET = 'storage';
export const DATABASE_URL = 'postgresql://moses@127.0.0.1/start';
export const REDIS_URL = 'http://localhost:6379';
export const PORT = 3000;
export const TABLE_PREFIX = 'start_api_';
export const STATUS_CODES = {
  SUCCESS: 200,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};
export const STATUS_MESSAGES = {
  SUCCESS_CREATE: 'Record created succssfully',
  SUCCESS_READ: 'Record fetched successfully',
  SUCCESS_UPDATE: 'Record update successfully',
  SUCCESS_DELETE: 'Record deleted successfully',
  SUCCESS_MIGRATE: 'Record migrated successfully',
  SERVER_ERROR_CONFLICT: 'Record already exists',
  SERVER_ERROR_VALIDATION_ERROR: 'Please check the input',
  SERVER_ERROR_NOT_FOUND: 'Record does not exist',
  SERVER_ERROR_QUEUE: 'Try again after some time ERR_Q500',
  SERVER_ERROR_CREATE: 'Try again after some time ERR_C500',
  SERVER_ERROR_READ: 'Try again after some time ERR_R500',
  SERVER_ERROR_UPDATE: 'Try again after some time ERR_U500',
  SERVER_ERROR_DELETE: 'Try again after some time ERR_D500',
  SERVER_ERROR_MIGRATE: 'Try again after some time ERR_M500',
};

// Frontend
export const PRIMARY_COLOR = '#B8A898';
export const SECONDARY_COLOR = '#E7DED6';
export const ACCENT_COLOR = '#7C6A5A';
export const SITENAME = 'Start';
export const s3Path = 'start/uploads'
