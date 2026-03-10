import { TestBed } from '@angular/core/testing';

import { InstallPwa } from './install-pwa';

describe('InstallPwa', () => {
  let service: InstallPwa;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InstallPwa);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
