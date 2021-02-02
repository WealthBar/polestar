export type ctxType = {
  params: { [key: string]: any },
  body: { [key: string]: any } | string,
  status: number,
  url: string,
}
