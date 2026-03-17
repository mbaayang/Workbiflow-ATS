import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (!data) {
          const httpStatus = context.switchToHttp().getResponse().statusCode;
          const request = context.switchToHttp().getRequest();
          const resource = this.getResourceName(request.route.path);

          return {
            statusCode: httpStatus,
            message: `${resource} retrieved successfully`,
            data: null,
          };
        }
        if (data && data.statusCode && data.message && data.data) {
          return data;
        }

        const httpStatus = context.switchToHttp().getResponse().statusCode;
        const request = context.switchToHttp().getRequest();
        const resource = this.getResourceName(request.route.path);

        const { message, statusCode } = data;
        return {
          statusCode: statusCode ? statusCode : httpStatus,
          message: message ? message : `${resource} retrieved successfully`,
          data: data || null,
        };
      }),
    );
  }

  private getResourceName(path: string): string {
    const segments = path.split('/');
    return (
      segments.find((segment) => segment && !segment.includes(':')) ||
      'Resource'
    );
  }
}
