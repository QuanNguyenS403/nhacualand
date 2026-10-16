import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Đệ quy biến đổi mọi giá trị kiểu bigint thành string trong đối tượng hoặc mảng kết quả,
 * sử dụng WeakSet để ngăn chặn vòng lặp tham chiếu tuần hoàn (circular references).
 */
function serializeBigInt(obj: any, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  // Chống circular reference
  if (seen.has(obj)) {
    return obj;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigInt(item, seen));
  }

  // Chỉ serialize plain object hoặc đối tượng dữ liệu thuần túy
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype) {
    return obj;
  }

  const serialized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    serialized[key] = serializeBigInt(obj[key], seen);
  }
  return serialized;
}

/**
 * RB-12: Global BigInt Interceptor — đảm bảo 100% endpoint API không bao giờ gặp lỗi
 * HTTP 500 "Do not know how to serialize a BigInt" khi trả về nested entities có kiểu BigInt.
 */
@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => serializeBigInt(data)));
  }
}
