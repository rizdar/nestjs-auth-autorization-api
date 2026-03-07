import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT!, 10) || 2525,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM,
}));
