import nodemailer from 'nodemailer'
export function createMailer(config, createTransport = nodemailer.createTransport) { if (!config.host || !config.user || !config.password || !config.from) throw new Error('SMTP configuration is required'); const transport = createTransport({ host: config.host, port: config.port || 587, secure: config.secure === true, auth: { user: config.user, pass: config.password } }); return {
  sendPasswordReset: ({ to, code, expiresMinutes }) => transport.sendMail({ from: config.from, to, subject: 'AVL Capital admin password reset', text: `Your password reset code is ${code}. It expires in ${expiresMinutes} minutes. If you did not request this, ignore this email.` }),
  sendChatRecovery: ({ to, code, expiresMinutes }) => transport.sendMail({ from: config.from, to, subject: 'Continue your AVL Capital conversation', text: `Your chat recovery code is ${code}. It expires in ${expiresMinutes} minutes. If you did not request this, ignore this email.` }),
} }
