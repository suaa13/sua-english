import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  error: { code: string } | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        message: null,
        error: null,
      })),
    );
  }
}
