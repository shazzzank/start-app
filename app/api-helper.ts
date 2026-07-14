import { eq } from "drizzle-orm";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { deleteObject, getObject, putObject } from "@/app/s3-helper";
import { dbUserSchema, zodUserIdSchema, zodUserSchema } from "@/app/db-schema";
import { environment, s3Path, STATUS_CODES, STATUS_MESSAGES } from "@/app/constants";
import { db, logger, redis } from "@/app/config";

// middleware:-
const redisKey = (getKey: (data: any) => string) => createMiddleware({ type: 'function' })
  .server(async ({ next, data }) => {
    const request = getRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    return next({
      sendContext: {
        lockKey: `${environment}:lock:${getKey(data)}`,
        rateLimitKey: `${environment}:rate:${ip}`,
      },
    });
  });

const middleware = createMiddleware({ type: 'function' })
  .server(async ({ next, data, context }) => {
    const requestTime = performance.now();
    const requestId = crypto.randomUUID();
    const lockKey = (context as any).lockKey;
    const rateLimitKey = (context as any).rateLimitKey;
    const isNotLocked = await redis.set(lockKey, '1', 'PX', 2000, 'NX');
    const requestCount = await redis.incr(rateLimitKey);
    if (requestCount === 1) await redis.expire(rateLimitKey, 6);

    if (isNotLocked && requestCount < 5) {
      const output = await next();
      logger.info({
        requestId,
        message: 'Success',
        error: null,
        data: {
          request: data,
          response: (output as any).result,
        },
        executionTime: Math.round(performance.now() - requestTime),
      });
      return output;
    }
    else {
      logger.warn({
        requestId,
        message: 'Failure',
        error: 'Lock or rate limit conflict',
        data: {
          lockKey,
          rateLimitKey,
        },
        executionTime: Math.round(performance.now() - requestTime),
      });
      return {
        status_code: STATUS_CODES.CONFLICT,
        message: STATUS_MESSAGES.SERVER_ERROR_CONFLICT,
        data: null,
      } as any;
    }
  });

// functions:-
export const saveUserFn = createServerFn({ method: 'POST' })
  .middleware([redisKey((d) => `save-user:${d.email}`), middleware])
  .inputValidator(zodUserSchema)
  .handler(async ({ data: payload }) => {
    try {
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
  .middleware([redisKey((d) => `update-user:${d.id}`), middleware])
  .inputValidator(zodUserSchema.extend(zodUserIdSchema.shape))
  .handler(async ({ data: payload }) => {
    try {
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
  .middleware([redisKey((d) => `delete-user:${d.id}`), middleware])
  .inputValidator(zodUserIdSchema)
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
