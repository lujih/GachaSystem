import { BUSINESS_CONFIG } from './business.js';
import { TECHNICAL_CONFIG } from './technical.js';

export const CONFIG = {
  ...BUSINESS_CONFIG,
  ...TECHNICAL_CONFIG,
  KEYS: TECHNICAL_CONFIG.KEYS,
  TTL: TECHNICAL_CONFIG.TTL,
  R2_DOMAIN: TECHNICAL_CONFIG.INFRASTRUCTURE.R2_DOMAIN
};

export const DEFAULT_CHANGELOG = [
  { 
    date: new Date().toISOString().split('T')[0], 
    ver: 'v1.0.0', 
    content: '暂无变更日志。', 
    tag: 'info' 
  }
];

export { BUSINESS_CONFIG, TECHNICAL_CONFIG };
