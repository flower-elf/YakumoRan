import got from 'got'

export const getImg = (msg: string) => {
  const tmp1 = msg.split(/(jpg|png|gif|bmp|jpeg)/)
  const tmp2 = tmp1.map((e, i) => {
    if (!e.includes('://')) return undefined
    return `${e.split('http')[1]}${tmp1[i + 1]}`
  }).filter(e => e)
  const result = tmp2.map(e => {
    return `http${e}`
  })
  return result.length > 0 ? result : null
}

export const getRealUrl = async (url: string): Promise<string> => {
  try {
    const resp = await got.head(url, {
      followRedirect: false
    })
    if (resp.statusCode > 300 && resp.statusCode < 400) return String(resp.headers.location)
    return url
  } catch (e) {
    return url
  }
}

export const isPorn = async (url: string) => {
  const resp = await got.get('https://api.peer.ink/api/v2/nsfw/image', {
    searchParams: {
      url: url
    }
  })

  return JSON.parse(resp.body).result
}
