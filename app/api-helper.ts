import { z } from 'zod';
import { eq } from "drizzle-orm";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { deleteObject, getObject, putObject } from "@/app/s3-helper";
import { environment, s3Path, STATUS_CODES, STATUS_MESSAGES } from "@/app/constants";
import { db, logger, redis, getEntityConfig } from "@/app/config";

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
export const createEntityFn = createServerFn({ method: "POST" })
  .middleware([redisKey((d) => `create-${d.entity}:${d.email ?? ""}`), middleware])
  .validator(z.object({ entity: z.string(), payload: z.any() }))
  .handler(async ({ data }) => {
    try {
      const entity = data.entity;
      const { schema, createValidator } = getEntityConfig(entity);
      const payload = createValidator.parse(data.payload);
      const id = crypto.randomUUID();

      const finalData = { ...payload, id };
      await putObject(`${s3Path}/${entity}/${id}.json`, finalData);
      await db.insert(schema).values(finalData);

      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_CREATE,
        data: finalData,
      };
    } catch (err) {
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_CREATE,
        data: null,
        error: err instanceof Error ? err.stack : String(err),
      };
    }
  });
export const getEntityFn = createServerFn({ method: "GET" })
  .validator(z.object({ entity: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const entity = data.entity;
      const result = await getObject(`${s3Path}/${entity}/${data.id}.json`);
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_READ,
        data: result,
      };
    } catch (err: any) {
      if (err.name === "NoSuchKey") {
        return {
          status_code: STATUS_CODES.NOT_FOUND,
          message: STATUS_MESSAGES.SERVER_ERROR_NOT_FOUND,
          data: null,
        };
      }
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_READ,
        data: null,
        error: err instanceof Error ? err.stack : String(err),
      };
    }
  });
export const updateEntityFn = createServerFn({ method: "POST" })
  .middleware([redisKey((d) => `update-${d.entity}:${d.id}`), middleware])
  .validator(z.object({ entity: z.string(), payload: z.any() }))
  .handler(async ({ data }) => {
    try {
      const entity = data.entity;
      const { schema, updateValidator } = getEntityConfig(entity);
      const payload = updateValidator.parse(data.payload);

      await putObject(`${s3Path}/${entity}/${payload.id}.json`, payload);
      await db.update(schema).set(payload).where(eq(schema.id, payload.id));
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_UPDATE,
        data: payload,
      };
    } catch (err) {
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_UPDATE,
        data: null,
        error: err instanceof Error ? err.stack : String(err),
      };
    }
  });
export const deleteEntityFn = createServerFn({ method: "POST" })
  .middleware([redisKey((d) => `delete-${d.entity}:${d.id}`), middleware])
  .validator(z.object({ entity: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const entity = data.entity;
      const { schema } = getEntityConfig(entity);

      await deleteObject(`${s3Path}/${entity}/${data.id}.json`);
      await db.delete(schema).where(eq(schema.id, data.id));
      return {
        status_code: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGES.SUCCESS_DELETE,
        data: null,
      };
    } catch (err) {
      return {
        status_code: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGES.SERVER_ERROR_DELETE,
        data: null,
        error: err instanceof Error ? err.stack : String(err),
      };
    }
  });
