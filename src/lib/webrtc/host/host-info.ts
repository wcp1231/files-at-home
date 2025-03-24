import { MetaResponse } from '../types';

export class HostInfo {
  private readonly apiVersion: string = '1.0.0';
  private readonly platform: string = 'WebBrowser';
  private readonly version: string = '0.0.1';
  
  getMeta(): MetaResponse {
    return {
      apiVersion: this.apiVersion,
      platform: this.platform,
      version: this.version,
      features: {
        writeable: false,
        packable: false,
        uploadable: false,
      },
      message: ''
    };
  }
} 