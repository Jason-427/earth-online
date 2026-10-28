// Builds src/data/landmarks.json from Wikipedia (EN + ZH) REST summaries.
// Usage: node scripts/build-landmarks.mjs
import { writeFile, mkdir } from 'node:fs/promises'

const UA = 'earth-online-atlas/0.1 (personal study project)'

// [enTitle, zhTitle, category, region, country, zhCountry]
const SEEDS = [
  ['Great Wall of China', '长城', 'Ancient site', 'Asia', 'China', '中国'],
  ['Forbidden City', '故宫', 'Palace & fortress', 'Asia', 'China', '中国'],
  ['Terracotta Army', '秦始皇兵马俑', 'Ancient site', 'Asia', 'China', '中国'],
  ['Potala Palace', '布达拉宫', 'Palace & fortress', 'Asia', 'China', '中国'],
  ['Zhangjiajie National Forest Park', '张家界国家森林公园', 'Natural wonder', 'Asia', 'China', '中国'],
  ['West Lake', '西湖', 'Natural wonder', 'Asia', 'China', '中国'],
  ['Mount Huangshan', '黄山', 'Natural wonder', 'Asia', 'China', '中国'],
  ['Mogao Caves', '莫高窟', 'Sacred site', 'Asia', 'China', '中国'],
  ['Taipei 101', '台北101', 'Urban icon', 'Asia', 'China', '中国'],
  ['Mount Fuji', '富士山', 'Natural wonder', 'Asia', 'Japan', '日本'],
  ['Fushimi Inari-taisha', '伏见稻荷大社', 'Sacred site', 'Asia', 'Japan', '日本'],
  ['Himeji Castle', '姬路城', 'Palace & fortress', 'Asia', 'Japan', '日本'],
  ['Gyeongbokgung', '景福宫', 'Palace & fortress', 'Asia', 'South Korea', '韩国'],
  ['Angkor Wat', '吴哥窟', 'Sacred site', 'Asia', 'Cambodia', '柬埔寨'],
  ['Hạ Long Bay', '下龙湾', 'Natural wonder', 'Asia', 'Vietnam', '越南'],
  ['Borobudur', '婆罗浮屠', 'Sacred site', 'Asia', 'Indonesia', '印度尼西亚'],
  ['Taj Mahal', '泰姬陵', 'Museum & memorial', 'Asia', 'India', '印度'],
  ['Mount Everest', '珠穆朗玛峰', 'Natural wonder', 'Asia', 'Nepal / China', '尼泊尔 / 中国'],
  ['Petronas Towers', '吉隆坡石油双塔', 'Urban icon', 'Asia', 'Malaysia', '马来西亚'],
  ['Marina Bay Sands', '滨海湾金沙', 'Urban icon', 'Asia', 'Singapore', '新加坡'],
  ['Petra', '佩特拉', 'Ancient site', 'Middle East', 'Jordan', '约旦'],
  ['Burj Khalifa', '哈利法塔', 'Urban icon', 'Middle East', 'United Arab Emirates', '阿联酋'],
  ['Hagia Sophia', '圣索菲亚大教堂', 'Sacred site', 'Europe / Asia', 'Türkiye', '土耳其'],
  ['Cappadocia', '卡帕多细亚', 'Natural wonder', 'Europe / Asia', 'Türkiye', '土耳其'],
  ['Persepolis', '波斯波利斯', 'Ancient site', 'Middle East', 'Iran', '伊朗'],
  ['Giza pyramid complex', '吉萨金字塔群', 'Ancient site', 'Africa', 'Egypt', '埃及'],
  ['Abu Simbel', '阿布辛贝神庙', 'Ancient site', 'Africa', 'Egypt', '埃及'],
  ['Victoria Falls', '维多利亚瀑布', 'Natural wonder', 'Africa', 'Zambia / Zimbabwe', '赞比亚 / 津巴布韦'],
  ['Mount Kilimanjaro', '乞力马扎罗山', 'Natural wonder', 'Africa', 'Tanzania', '坦桑尼亚'],
  ['Table Mountain', '桌山', 'Natural wonder', 'Africa', 'South Africa', '南非'],
  ['Great Mosque of Djenné', '杰内大清真寺', 'Sacred site', 'Africa', 'Mali', '马里'],
  ['Eiffel Tower', '埃菲尔铁塔', 'Urban icon', 'Europe', 'France', '法国'],
  ['Louvre', '卢浮宫', 'Museum & memorial', 'Europe', 'France', '法国'],
  ['Mont-Saint-Michel', '圣米歇尔山', 'Sacred site', 'Europe', 'France', '法国'],
  ['Colosseum', '罗马斗兽场', 'Ancient site', 'Europe', 'Italy', '意大利'],
  ['Leaning Tower of Pisa', '比萨斜塔', 'Cultural landmark', 'Europe', 'Italy', '意大利'],
  ['St. Peter\'s Basilica', '圣伯多禄大殿', 'Sacred site', 'Europe', 'Vatican City', '梵蒂冈'],
  ['Acropolis of Athens', '雅典卫城', 'Ancient site', 'Europe', 'Greece', '希腊'],
  ['Sagrada Família', '圣家堂', 'Sacred site', 'Europe', 'Spain', '西班牙'],
  ['Alhambra', '阿尔罕布拉宫', 'Palace & fortress', 'Europe', 'Spain', '西班牙'],
  ['Stonehenge', '巨石阵', 'Ancient site', 'Europe', 'United Kingdom', '英国'],
  ['Big Ben', '大本钟', 'Urban icon', 'Europe', 'United Kingdom', '英国'],
  ['Neuschwanstein Castle', '新天鹅堡', 'Palace & fortress', 'Europe', 'Germany', '德国'],
  ['Brandenburg Gate', '勃兰登堡门', 'Cultural landmark', 'Europe', 'Germany', '德国'],
  ['Matterhorn', '马特洪峰', 'Natural wonder', 'Europe', 'Switzerland / Italy', '瑞士 / 意大利'],
  ['Saint Basil\'s Cathedral', '圣瓦西里主教座堂', 'Sacred site', 'Europe', 'Russia', '俄罗斯'],
  ['Geirangerfjord', '盖朗厄尔峡湾', 'Natural wonder', 'Europe', 'Norway', '挪威'],
  ['Statue of Liberty', '自由女神像', 'Museum & memorial', 'North America', 'United States', '美国'],
  ['Golden Gate Bridge', '金门大桥', 'Urban icon', 'North America', 'United States', '美国'],
  ['Grand Canyon', '大峡谷', 'Natural wonder', 'North America', 'United States', '美国'],
  ['Yellowstone National Park', '黄石国家公园', 'Natural wonder', 'North America', 'United States', '美国'],
  ['Niagara Falls', '尼亚加拉瀑布', 'Natural wonder', 'North America', 'Canada / United States', '加拿大 / 美国'],
  ['CN Tower', '加拿大国家电视塔', 'Urban icon', 'North America', 'Canada', '加拿大'],
  ['Chichen Itza', '奇琴伊察', 'Ancient site', 'Central America', 'Mexico', '墨西哥'],
  ['Teotihuacan', '特奥蒂瓦坎', 'Ancient site', 'Central America', 'Mexico', '墨西哥'],
  ['Tikal', '蒂卡尔', 'Ancient site', 'Central America', 'Guatemala', '危地马拉'],
  ['Machu Picchu', '马丘比丘', 'Ancient site', 'South America', 'Peru', '秘鲁'],
  ['Christ the Redeemer (statue)', '救世基督像', 'Sacred site', 'South America', 'Brazil', '巴西'],
  ['Iguazu Falls', '伊瓜苏瀑布', 'Natural wonder', 'South America', 'Argentina / Brazil', '阿根廷 / 巴西'],
  ['Salar de Uyuni', '乌尤尼盐沼', 'Natural wonder', 'South America', 'Bolivia', '玻利维亚'],
  ['Moai', '摩艾石像', 'Ancient site', 'South America', 'Chile', '智利'],
  ['Galápagos Islands', '加拉帕戈斯群岛', 'Natural wonder', 'South America', 'Ecuador', '厄瓜多尔'],
  ['Sydney Opera House', '悉尼歌剧院', 'Urban icon', 'Oceania', 'Australia', '澳大利亚'],
  ['Uluru', '乌鲁鲁', 'Natural wonder', 'Oceania', 'Australia', '澳大利亚'],
  ['Great Barrier Reef', '大堡礁', 'Natural wonder', 'Oceania', 'Australia', '澳大利亚'],
  ['Milford Sound', '米尔福德峡湾', 'Natural wonder', 'Oceania', 'New Zealand', '新西兰'],
  ['Castillo San Felipe del Morro', '圣费利佩德尔莫罗城堡', 'Palace & fortress', 'Caribbean', 'Puerto Rico (US)', '波多黎各（美）'],
]

const slug = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Pages whose summary lacks a single coordinate (e.g. multi-site articles).
const COORDS = {
  Petra: [30.3285, 35.4444],
  'Mount Kilimanjaro': [-3.0758, 37.3533],
  Moai: [-27.1258, -109.2767],
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function summary(lang, title, attempt = 0) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': lang === 'zh' ? 'zh-cn' : 'en' } })
  if (res.status === 429 && attempt < 6) {
    await sleep(2000 * 2 ** attempt)
    return summary(lang, title, attempt + 1)
  }
  if (!res.ok) throw new Error(`${lang}:${title} -> ${res.status}`)
  return res.json()
}

const sentences = (text, n) => {
  const parts = text.match(/[^.!?。！？]+[.!?。！？]+/g) ?? [text]
  return parts.slice(0, n).join('').trim()
}

const out = []
for (const [en, zh, category, region, country, zhCountry] of SEEDS) {
  try {
    const e = await summary('en', en)
    await sleep(400)
    const z = await summary('zh', zh).catch((err) => (console.warn('  zh missing:', err.message), null))
    await sleep(400)
    const coords = e.coordinates ? [e.coordinates.lat, e.coordinates.lon] : COORDS[en]
    if (!coords) throw new Error(`no coordinates for ${en}`)
    const thumb = e.thumbnail?.source
    out.push({
      id: slug(en),
      name: e.title.replace(/ \(.*\)$/, ''),
      zhName: z ? z.displaytitle.replace(/<[^>]+>/g, '') : zh,
      country,
      zhCountry,
      region,
      category,
      lat: +coords[0].toFixed(5),
      lng: +coords[1].toFixed(5),
      summary: sentences(e.extract, 1),
      zhSummary: z ? sentences(z.extract, 1) : '',
      detail: e.extract,
      zhDetail: z?.extract ?? '',
      imageUrl: e.originalimage?.source ?? thumb ?? '',
      thumbUrl: thumb ?? e.originalimage?.source ?? '',
      sourceUrls: [e.content_urls.desktop.page, z?.content_urls.desktop.page].filter(Boolean),
    })
    console.log('✓', en)
  } catch (err) {
    console.warn('✗', err.message)
  }
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
await writeFile(new URL('../src/data/landmarks.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log(`wrote ${out.length} landmarks`)
