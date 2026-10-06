import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAuthCall = AUTH_ENDPOINTS.some(path => req.url.includes(path));

  return next(withToken(req, isAuthCall ? null : authService.getToken())).pipe(
    catchError(err => {
      if (err.status !== 401 || isAuthCall || !authService.getToken()) {
        return throwError(() => err);
      }
      return authService.refreshToken().pipe(
        switchMap(token => next(withToken(req, token))),
        catchError(refreshError => {
          authService.logout();
          return throwError(() => refreshError.status === 401 ? err : refreshError);
        })
      );
    })
  );
};

