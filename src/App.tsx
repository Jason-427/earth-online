import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Crosshair, ExternalLink, Globe2, MapPin, RotateCcw, Search, X } from 'lucide-react'
import data from './data/landmarks.json'
import type { Hover } from './Globe'
import type { Landmark, Lang } from './types'
import * as t from './i18n'

const Globe = lazy(() => import('./Globe'))

const LANDMARKS = data as Landmark[]
const HOME = LANDMARKS.find((l) => l.id === 'great-wall-of-china') ?? LANDMARKS[0]
const INDEX = new Map(LANDMARKS.map((l) => [l.id, t.searchText(l)]))
const DIVE_MS = 1100

type View = 'globe' | 'diving' | 'photo'

const reducedQuality = () =>
  window.matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4

function Img({ landmark, width, ...rest }: { landmark: Landmark; width: number } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={t.sized(landmark, width)}
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget
        if (img.src !== landmark.imageUrl) img.src = landmark.imageUrl
      }}
      {...rest}
    />
  )
}

export default function App() {
  const [lang, setLang] = useState<Lang>(t.initialLang)
  const [selected, setSelected] = useState<Landmark>(HOME)
  const [view, setView] = useState<View>('globe')
  const [hover, setHover] = useState<Hover | null>(null)
  const [query, setQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [cat, setCat] = useState('All')
  const [resetSignal, setResetSignal] = useState(0)
  const [reduced] = useState(reducedQuality)
  const diveTimer = useRef<number | undefined>(undefined)
  const ui = t.UI[lang]

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of LANDMARKS) counts.set(l.category, (counts.get(l.category) ?? 0) + 1)
    return ['All', ...[...counts].sort((a, b) => b[1] - a[1]).map(([c]) => c)]
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LANDMARKS.filter((l) => (cat === 'All' || l.category === cat) && (!q || INDEX.get(l.id)!.includes(q)))
  }, [cat, query])

  const stats = useMemo(
    () => ({ countries: new Set(LANDMARKS.map((l) => l.country)).size, regions: new Set(LANDMARKS.map((l) => l.region)).size }),
    [],
  )

  const select = useCallback((l: Landmark, fromGlobe: boolean) => {
    window.clearTimeout(diveTimer.current)
    setSelected(l)
    setHover(null)
    setSuggestOpen(false)
    setQuery(t.name(l, lang))
    // Warm the cache so the photo is ready when the dive ends.
    new Image().src = t.sized(l, 1920)
    if (!fromGlobe || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setView('globe')
      return
    }
    setView('diving')
    diveTimer.current = window.setTimeout(() => setView('photo'), DIVE_MS)
  }, [lang])

  const backToGlobe = useCallback(() => {
    window.clearTimeout(diveTimer.current)
    setView('globe')
    setResetSignal((n) => n + 1)
  }, [])

  const clearSearch = () => {
    setQuery('')
    setSuggestOpen(false)
    backToGlobe()
  }

  const reset = () => {
    backToGlobe()
    setSelected(HOME)
    setCat('All')
    setQuery('')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (view !== 'globe') backToGlobe()
      setSuggestOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, backToGlobe])

  useEffect(() => () => window.clearTimeout(diveTimer.current), [])

  const toggleLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh'
    setLang(next)
    t.saveLang(next)
    // Keep the input in sync when it is showing the selected landmark's name.
    setQuery((q) => (q === t.name(selected, lang) ? t.name(selected, next) : q))
  }

  return (
    <main className={`shell ${view}`} lang={lang === 'zh' ? 'zh-Hans' : 'en'}>
      <section className="stage">
        <div className="canvas">
          {view === 'photo' ? (
            <motion.figure key={selected.id} className="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <motion.div className="photo-img" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}>
                <Img landmark={selected} width={1920} alt={t.name(selected, lang)} />
              </motion.div>
              <div className="photo-shade" />
              <figcaption>
                <span>{t.category(selected.category, lang)}</span>
                <strong>{t.name(selected, lang)}</strong>
                <small>{t.country(selected, lang)}</small>
              </figcaption>
            </motion.figure>
          ) : (
            <Suspense fallback={<div className="webgl-fallback">…</div>}>
              <Globe
                landmarks={visible}
                selected={selected}
                hoveredId={hover?.landmark.id}
                diving={view === 'diving'}
                resetSignal={resetSignal}
                reduced={reduced}
                onSelect={select}
                onHover={setHover}
                noWebgl={ui.noWebgl}
              />
            </Suspense>
          )}
        </div>

        <header className="topbar">
          <div className="brand">
            <Globe2 size={28} strokeWidth={1.4} />
            <div>
              <strong>{ui.brand}</strong>
              <span>{ui.tagline}</span>
            </div>
          </div>
          <div className="stats">
            <span>
              <b>{LANDMARKS.length}</b> {ui.landmarks}
            </span>
            <span>
              <b>{stats.countries}</b> {ui.countries}
            </span>
            <span>
              <b>{stats.regions}</b> {ui.regions}
            </span>
            <button type="button" className="chip lang" onClick={toggleLang}>
              {ui.toggle}
            </button>
          </div>
        </header>

        <div className="search">
          <label className="search-box">
            <Search size={17} />
            <input
              value={query}
              placeholder={ui.search}
              aria-label={ui.search}
              onChange={(e) => {
                setQuery(e.target.value)
                setSuggestOpen(true)
              }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && visible[0]) select(visible[0], false)
              }}
            />
            {query && (
              <button type="button" className="icon clear" aria-label="Clear" onClick={clearSearch}>
                <X size={16} />
              </button>
            )}
          </label>
          <AnimatePresence>
            {query && suggestOpen && (
              <motion.div className="suggestions" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {visible.slice(0, 8).map((l) => (
                  <button type="button" key={l.id} onClick={() => select(l, false)}>
                    <Img landmark={l} width={120} alt="" loading="lazy" />
                    <span>
                      <strong>{t.name(l, lang)}</strong>
                      <small>
                        {t.country(l, lang)} · {t.category(l.category, lang)}
                      </small>
                    </span>
                  </button>
                ))}
                {!visible.length && <p>{ui.noResults}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {view === 'photo' ? (
          <button type="button" className="chip back" onClick={backToGlobe}>
            <ArrowLeft size={16} /> {ui.back}
          </button>
        ) : (
          <nav className="categories">
            {categories.map((c) => (
              <button type="button" key={c} className={`chip${c === cat ? ' active' : ''}`} onClick={() => setCat(c)}>
                {t.category(c, lang)}
              </button>
            ))}
          </nav>
        )}

        <footer className="hud">
          <div className="coords">
            <MapPin size={16} />
            <span>{t.region(selected.region, lang)}</span>
            <strong>
              {t.formatCoord(selected.lat, 'lat')} / {t.formatCoord(selected.lng, 'lng')}
            </strong>
          </div>
          <button type="button" className="chip" onClick={reset}>
            <RotateCcw size={15} /> {ui.reset}
          </button>
          <button type="button" className="chip" onClick={() => (view === 'globe' ? setResetSignal((n) => n + 1) : backToGlobe())}>
            <Crosshair size={15} /> {ui.locate}
          </button>
          <span className="hint">{ui.hint}</span>
        </footer>

        <AnimatePresence>
          {hover && hover.landmark.id !== selected.id && view === 'globe' && (
            <motion.aside
              className="preview"
              style={{ left: hover.x + 18, top: hover.y + 18 }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <Img landmark={hover.landmark} width={250} alt="" />
              <div>
                <strong>{t.name(hover.landmark, lang)}</strong>
                <span>{t.country(hover.landmark, lang)}</span>
                <p>{t.summary(hover.landmark, lang)}</p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </section>

      <motion.aside key={selected.id} className="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <div className="detail-img">
          <Img landmark={selected} width={960} alt={t.name(selected, lang)} />
          <span>{t.category(selected.category, lang)}</span>
        </div>
        <div className="detail-body">
          <p className="eyebrow">
            {t.country(selected, lang)} · {t.region(selected.region, lang)}
          </p>
          <h1>{t.name(selected, lang)}</h1>
          <p className="lede">{t.summary(selected, lang)}</p>
          <dl className="grid">
            <div>
              <dt>{ui.lat}</dt>
              <dd>{t.formatCoord(selected.lat, 'lat')}</dd>
            </div>
            <div>
              <dt>{ui.lng}</dt>
              <dd>{t.formatCoord(selected.lng, 'lng')}</dd>
            </div>
          </dl>
          <p className="copy">{t.detail(selected, lang)}</p>
          <div className="sources">
            {selected.sourceUrls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                {ui.source} {u.includes('zh.wikipedia') ? '中文' : 'EN'} <ExternalLink size={13} />
              </a>
            ))}
          </div>
          <p className="license">{ui.license}</p>
        </div>
      </motion.aside>
    </main>
  )
}
