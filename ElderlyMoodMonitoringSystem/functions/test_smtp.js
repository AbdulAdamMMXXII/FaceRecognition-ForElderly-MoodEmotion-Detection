require('dotenv').config();
const nodemailer = require('nodemailer');

const cfg = {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true'
};

console.log('SMTP Config loaded:');
console.log('User:', cfg.user);
console.log('Host:', cfg.host);
console.log('Port:', cfg.port);
console.log('Secure:', cfg.secure);
console.log('---');

const transporter = nodemailer.createTransport({
  host: cfg.host,
  port: cfg.port,
  secure: cfg.secure,
  auth: {
    user: cfg.user,
    pass: cfg.pass
  }
});

const mailOptions = {
  from: process.env.SMTP_FROM,
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'This is a test email'
};

console.log('Testing SMTP connection...');
transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    console.error('❌ Email send failed:', err.message);
    console.error('Error code:', err.code);
    process.exit(1);
  } else {
    console.log('✅ Email sent successfully:', info.response);
    process.exit(0);
  }
});

setTimeout(() => {
  console.error('❌ Timeout - no response from mail server');
  process.exit(1);
}, 10000);
