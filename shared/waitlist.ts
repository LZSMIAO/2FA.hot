const repository = 'https://github.com/LZSMIAO/2fa-hot'

export const waitlistLinks = {
  submit: `${repository}/issues/new?template=feature-request.yml`,
  browse: `${repository}/issues?q=is%3Aissue%20label%3Aenhancement`,
  markdown: `${repository}/blob/main/docs/WAITLIST.md`,
  sharing: `${repository}/blob/main/docs/WAITLIST.md#临时分享验证码`
} as const
