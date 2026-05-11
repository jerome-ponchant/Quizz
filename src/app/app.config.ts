import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { UploadService } from './services/upload.service';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHttpClient(withFetch()), provideClientHydration(),
    {
      provide: APP_INITIALIZER,
      useFactory: (uploadService: UploadService) => () => uploadService.getUploadPrefix().toPromise(),
      deps: [UploadService],
      multi: true
    }]
};
