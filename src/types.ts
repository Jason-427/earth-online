export type Lang = 'en' | 'zh'

export interface Landmark {
  id: string
  name: string
  zhName: string
  country: string
  zhCountry: string
  region: string
  category: string
  lat: number
  lng: number
  summary: string
  zhSummary: string
  detail: string
  zhDetail: string
  imageUrl: string
  thumbUrl: string
  sourceUrls: string[]
}
