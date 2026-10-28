import type { Landmark, Lang } from './types'

export const UI = {
  en: {
    brand: 'Earth Online',
    tagline: 'An atlas of world wonders',
    landmarks: 'landmarks',
    countries: 'countries',
    regions: 'regions',
    search: 'Search a landmark, country or region…',
    noResults: 'Nothing matches that search.',
    all: 'All',
    reset: 'Reset',
    locate: 'Locate',
    back: 'Back to globe',
    lat: 'Latitude',
    lng: 'Longitude',
    source: 'Wikipedia',
    license: 'Text and images via Wikipedia / Wikimedia Commons (CC BY-SA).',
    hint: 'Drag to spin · scroll to zoom · click a gold point',
    toggle: '中文',
    noWebgl: 'WebGL is unavailable in this browser.',
  },
  zh: {
    brand: '地球 Online',
    tagline: '世界奇观地球志',
    landmarks: '个景点',
    countries: '个国家/地区',
    regions: '个大区',
    search: '搜索景点、国家或地区…',
    noResults: '没有匹配的景点。',
    all: '全部',
    reset: '重置',
    locate: '定位',
    back: '返回地球',
    lat: '纬度',
    lng: '经度',
    source: '维基百科',
    license: '文字与图片来自维基百科 / 维基共享资源（CC BY-SA）。',
    hint: '拖动旋转 · 滚轮缩放 · 点击金色光点',
    toggle: 'EN',
    noWebgl: '当前浏览器不支持 WebGL。',
  },
} satisfies Record<Lang, Record<string, string>>

const CATEGORY_ZH: Record<string, string> = {
  'Ancient site': '古代遗址',
  'Cultural landmark': '文化地标',
  'Museum & memorial': '博物馆与纪念地',
  'Natural wonder': '自然奇观',
  'Palace & fortress': '宫殿与城堡',
  'Sacred site': '宗教圣地',
  'Urban icon': '城市地标',
}

const REGION_ZH: Record<string, string> = {
  Africa: '非洲',
  Asia: '亚洲',
  Caribbean: '加勒比',
  'Central America': '中美洲',
  Europe: '欧洲',
  'Europe / Asia': '欧亚交界',
  'Middle East': '中东',
  'North America': '北美洲',
  Oceania: '大洋洲',
  'South America': '南美洲',
}

export const name = (l: Landmark, lang: Lang) => (lang === 'zh' && l.zhName) || l.name
export const country = (l: Landmark, lang: Lang) => (lang === 'zh' && l.zhCountry) || l.country
export const summary = (l: Landmark, lang: Lang) => (lang === 'zh' && l.zhSummary) || l.summary
export const detail = (l: Landmark, lang: Lang) => (lang === 'zh' && l.zhDetail) || l.detail
export const category = (c: string, lang: Lang) =>
  c === 'All' ? UI[lang].all : (lang === 'zh' && CATEGORY_ZH[c]) || c
export const region = (r: string, lang: Lang) => (lang === 'zh' && REGION_ZH[r]) || r

export const searchText = (l: Landmark) =>
  [l.name, l.zhName, l.country, l.zhCountry, l.region, REGION_ZH[l.region], l.category, CATEGORY_ZH[l.category]]
    .join(' ')
    .toLowerCase()

export function formatCoord(v: number, axis: 'lat' | 'lng') {
  const hemi = axis === 'lat' ? (v >= 0 ? 'N' : 'S') : v >= 0 ? 'E' : 'W'
  return `${Math.abs(v).toFixed(3)}°${hemi}`
}

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('earth-online-lang')
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem('earth-online-lang', lang)
  } catch {
    /* storage unavailable */
  }
}

// Wikimedia thumbnails accept a width in the path; originals can be tens of MB.
export function sized(l: Landmark, width: number) {
  return l.thumbUrl.includes('/thumb/') ? l.thumbUrl.replace(/\/\d+px-/, `/${width}px-`) : l.imageUrl
}
