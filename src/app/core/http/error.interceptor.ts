import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 is handled by authInterceptor (refresh token / logout)
      // Chat stream has its own in-chat error handling
      if (error.status !== 401 && !req.url.includes('/chat/stream')) {
        let message = 'Xatolik yuz berdi';

        if (typeof error.error === 'string') {
          message = error.error;
        } else if (error.error?.message) {
          message = error.error.message;
        } else if (error.message) {
          message = error.message;
        }

        snackBar.open(message, 'Yopish', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }

      return throwError(() => error);
    })
  );
};
