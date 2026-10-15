import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : ''
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
const validPassword = (password) => typeof password === 'string' && password.length >= 12 && password.length <= 128
const digest = (value) => createHash('sha256').update(value).digest('hex')

export async function hashSecret(value) { const salt = randomBytes(16); const derived = await scrypt(value, salt, 64); return `${salt.toString('hex')}:${derived.toString('hex')}` }
export async function verifySecret(value, stored = '') { const [saltHex, hashHex] = stored.split(':'); if (!saltHex || !hashHex) return false; const expected = Buffer.from(hashHex, 'hex'); const actual = await scrypt(value, Buffer.from(saltHex, 'hex'), expected.length); return timingSafeEqual(expected, actual) }

export function createAuthService({ admins, sessions, resets, mailer, now = () => new Date(), sessionHours = 8, otpMinutes = 10, logger = console }) {
  async function createAdmin(emailInput, password) {
    const email = normalizeEmail(emailInput)
    if (!validEmail(email) || !validPassword(password)) return { ok: false, reason: 'validation' }
    try { const id = await admins.create({ email, passwordHash: await hashSecret(password), sessionVersion: 1, createdAt: now() }); return { ok: true, admin: { id, email } } }
    catch (error) { if (error?.code === 11000) return { ok: false, reason: 'duplicate' }; throw error }
  }
  return {
    createAdmin,
    async bootstrap(email, password) { if (!email || !password || await admins.count() !== 0) return false; return (await createAdmin(email, password)).ok },
    async login(emailInput, password) { const email = normalizeEmail(emailInput); const admin = validEmail(email) ? await admins.findByEmail(email) : null; if (!admin || !await verifySecret(password || '', admin.passwordHash)) return null; const token = randomBytes(32).toString('base64url'); const expiresAt = new Date(now().getTime() + sessionHours * 3_600_000); await sessions.create({ tokenHash: digest(token), adminId: admin._id, sessionVersion: admin.sessionVersion, createdAt: now(), expiresAt }); return { token, expiresAt, admin: { id: admin._id.toString(), email: admin.email } } },
    async authenticate(token) { if (!token) return null; const session = await sessions.find(digest(token)); if (!session || session.expiresAt <= now()) return null; const admin = await admins.findById(session.adminId); return admin && admin.sessionVersion === session.sessionVersion ? { id: admin._id.toString(), email: admin.email } : null },
    logout: (token) => token ? sessions.delete(digest(token)) : Promise.resolve(),
    async requestReset(emailInput) { const email = normalizeEmail(emailInput); const admin = validEmail(email) ? await admins.findByEmail(email) : null; if (!admin) return; const code = String(randomInt(100000, 1000000)); const record = { email, codeHash: await hashSecret(code), createdAt: now(), expiresAt: new Date(now().getTime() + otpMinutes * 60_000), usedAt: null }; const created = await resets.create(record); record._id = created?.insertedId ?? record._id; try { await mailer.sendPasswordReset({ to: email, code, expiresMinutes: otpMinutes }) } catch (error) { if (record._id !== undefined && resets.invalidate) await resets.invalidate(record._id).catch((cleanupError) => logger.error('Failed to invalidate undelivered password reset', cleanupError)); logger.error('Failed to deliver password reset email', error) } },
    async resetPassword(emailInput, code, password) { const email = normalizeEmail(emailInput); if (!validEmail(email) || !/^\d{6}$/.test(code || '') || !validPassword(password)) return false; const record = await resets.findActive(email, now()); if (!record || !await verifySecret(code, record.codeHash)) return false; const admin = await admins.findByEmail(email); if (!admin) return false; const previousHash = admin.passwordHash; const previousVersion = admin.sessionVersion || 1; const nextHash = await hashSecret(password); const updated = await admins.updatePassword(admin._id, nextHash, previousVersion + 1); if (updated?.modifiedCount !== 1) return false; try { const claimed = await resets.markUsed(record._id, now()); if (claimed?.modifiedCount !== 1) { await admins.updatePassword(admin._id, previousHash, previousVersion); return false } } catch (error) { await admins.updatePassword(admin._id, previousHash, previousVersion); throw error } try { await sessions.deleteForAdmin(admin._id) } catch (error) { logger.error('Failed to remove rotated admin sessions', error) } return true },
  }
}
