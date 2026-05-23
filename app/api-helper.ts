import { eq } from "drizzle-orm";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { deleteObject, getObject, putObject } from "@/app/s3-helper";
import { dbUserSchema, zodLockKeySchema, zodUserIdSchema, zodUserSchema } from "@/app/db-schema";
import { environment, s3Path, STATUS_CODES, STATUS_MESSAGES } from "@/app/constants";
import { db, logger, redis } from "@/app/config";

// middleware:-
const middleware = createMiddleware({ type: 'function' })
  .server(async ({ next, data }) => {
    const requestTime = performance.now();
    const requestId = crypto.randomUUID();
    const lockKey = (data as any).lockKey;
    const isAllowed = await redis.set(`${environment}:lock:${lockKey}`, '1', 'PX', 2000, 'NX');

    if (isAllowed) {
      logger.info('Request received', { requestId: crypto.randomUUID(), lockKey, input: data });
      const output = await next();
      logger.info('Response sent', { requestId, lockKey, output, responseTime: Math.round(performance.now() - requestTime) });
      return output;
    }
    else {
      logger.warn('Lock conflict, request rejected', { requestId, lockKey });
      return {
        status_code: STATUS_CODES.CONFLICT,
        message: STATUS_MESSAGES.SERVER_ERROR_CONFLICT,
        data: null,
      } as any;
    }
  });

// functions:-
export const saveUserFn = createServerFn({ method: 'POST' })
  .middleware([middleware])
  .inputValidator(zodUserSchema.extend(zodLockKeySchema.shape))
  .handler(async ({ data }) => {
    try {
      const { lockKey, ...payload } = data;
      const fileName = crypto.randomUUID();
      await putObject(`${s3Path}/${fileName}.json`, payload);
      await db.insert(dbUserSchema).values({ ...payload, id: fileName }).returning();
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_CREATE,
        data: { ...payload, id: fileName },
      };
    } catch (err) {
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_CREATE,
        data: null,
        error: JSON.stringify(err),
      };
    }
  });

export const getUserFn = createServerFn({ method: 'GET' })
  .inputValidator(zodUserIdSchema)
  .handler(async ({ data }) => {
    try {
      const result = await getObject(`${s3Path}/${data.id}.json`);
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_READ,
        data: result,
      };
    } catch (err: any) {
      if (err.name === 'NoSuchKey') {
        return {
          status_code: STATUS_CODES.NOT_FOUND,
          message: STATUS_MESSAGES.SERVER_ERROR_NOT_FOUND,
          data: null,
        };
      } else {
        return {
          status_code: STATUS_CODES.SERVER_ERROR,
          message: STATUS_MESSAGES.SERVER_ERROR_READ,
          data: null,
          error: err instanceof Error ? err.stack : String(err),
        };
      }
    }
  });

export const updateFn = createServerFn({ method: 'POST' })
  .middleware([middleware])
  .inputValidator(zodUserSchema.extend({ ...zodUserIdSchema.shape, ...zodLockKeySchema.shape }))
  .handler(async ({ data }) => {
    try {
      const { lockKey, ...payload } = data;
      await putObject(`${s3Path}/${payload.id}.json`, payload);
      await db.update(dbUserSchema).set(payload).where(eq(dbUserSchema.id, payload.id));
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_UPDATE,
        data: payload,
      };
    } catch (err: any) {
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_UPDATE,
        data: null,
        error: err instanceof Error ? err.stack : String(err),
      };
    }
  });

export const deleteFn = createServerFn({ method: 'POST' })
  .middleware([middleware])
  .inputValidator(zodUserIdSchema.extend(zodLockKeySchema.shape))
  .handler(async ({ data }) => {
    try {
      await deleteObject(`${s3Path}/${data.id}.json`);
      await db.delete(dbUserSchema).where(eq(dbUserSchema.id, data.id));
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_DELETE,
        data: null,
      };
    } catch (err: any) {
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_DELETE,
        data: null,
        error: err instanceof Error ? err.stack : String(err),
      };
    }
  });
