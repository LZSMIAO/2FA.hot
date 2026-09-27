import { decode, encode, random } from './encoding.js'

/*
 * Unlocking with Touch ID, Windows Hello or the like. The extension registers
 * a passkey of its own on this device's authenticator and asks it for a PRF
 * value. That value wraps the vault key, so the device's biometric or PIN
 * stands in for the master password, and nothing but the authenticator can
 * produce it.
 */
export const deviceSupported = () =>
  typeof PublicKeyCredential === 'function' && !!navigator.credentials?.get

export async function deviceSecret(device) {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: random(32),
      userVerification: 'required',
      allowCredentials: [{ type: 'public-key', id: decode(device.credentialId, 1024) }],
      extensions: { prf: { eval: { first: decode(device.salt, 32) } } }
    }
  })
  const first = credential.getClientExtensionResults().prf?.results?.first
  if (!first) throw new Error('这台设备的验证器没有返回解锁所需的数据，请改用主口令。')
  return encode(first)
}

export async function enrollDevice() {
  const salt = random(32)
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: '2fa.hot Passkeys' },
      user: { id: random(16), name: '2fa.hot 通行密钥库', displayName: '2fa.hot 通行密钥库' },
      challenge: random(32),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged'
      },
      extensions: { prf: { eval: { first: salt } } }
    }
  })
  const prf = credential.getClientExtensionResults().prf
  if (!prf?.enabled)
    throw new Error('这台设备的 Touch ID、Windows Hello 或系统验证器不支持用来解锁的 PRF 功能。')
  const device = { credentialId: encode(credential.rawId), salt: encode(salt) }
  // Many authenticators only report "enabled" when creating; one sign-in reads the value.
  const secret = prf.results?.first ? encode(prf.results.first) : await deviceSecret(device)
  return { ...device, secret }
}
