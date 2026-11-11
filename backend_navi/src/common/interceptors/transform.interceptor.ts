import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

interface ControllerResponse<T> {
  message?: string;
  data?: T;
}

function isControllerResponse<T>(val: unknown): val is ControllerResponse<T> {
  return (
    typeof val === 'object' &&
    val !== null &&
    ('data' in val || 'message' in val)
  );
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((resData) => {
        let message = 'Operación exitosa';
        let data: T = resData;

        if (
          isControllerResponse<T>(resData) &&
          resData.data !== undefined &&
          typeof resData.message === 'string'
        ) {
          message = resData.message;
          data = resData.data;
        }

        return {
          success: true,
          statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
