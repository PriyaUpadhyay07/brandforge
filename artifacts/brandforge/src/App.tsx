import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import {
  AlertCircle, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Copy, Download, FileCode2, FolderOpen, Layers3, LayoutDashboard, Linkedin, Menu, MoreHorizontal, Moon,
  Palette, Pencil, Plus, RefreshCw, Save, Search, Send, Settings2, SlidersHorizontal,
  Sparkles, Sun, Trash2, Type, Wand2, X, Zap
} from 'lucide-react';
import {
  getListBrandKitsQueryKey, useCreateBrandKit, useDeleteBrandKit,
  useGenerateBrandVoice, useListBrandKits, useUpdateBrandKit
} from '@workspace/api-client-react';
import type { BrandKit, BrandKitInput, BrandVoice } from '@workspace/api-client-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { generatePalette } from '@/lib/color';
import { SiGmail } from 'react-icons/si';

const queryClient = new QueryClient();
const sampleKits: BrandKit[] = [
  { id: 101, brandName: 'Morrow', industry: 'Climate tech', primaryColor: '#D8F05A', personality: 'Clear, optimistic, quietly bold', headingFont: 'Bricolage Grotesque', bodyFont: 'DM Sans', tagline: 'Better days, designed in.', toneNotes: 'Warm, specific, never preachy.', createdAt: '2024-03-18T00:00:00Z' },
  { id: 102, brandName: 'Common Ground', industry: 'Independent hospitality', primaryColor: '#E7A77A', personality: 'Witty, generous, a little unexpected', headingFont: 'Fraunces', bodyFont: 'DM Sans', tagline: 'Pull up a chair.', toneNotes: 'Sound like a thoughtful host.', createdAt: '2024-03-12T00:00:00Z' },
  { id: 103, brandName: 'Arcform', industry: 'Architecture studio', primaryColor: '#A9C5E8', personality: 'Precise, human, forward-looking', headingFont: 'Bricolage Grotesque', bodyFont: 'Space Mono', tagline: 'The shape of what is next.', toneNotes: 'Measured, visual, confident.', createdAt: '2024-02-26T00:00:00Z' },
];
const LOCAL_KITS_KEY = 'brandforge-local-kits';
const HIDDEN_SAMPLES_KEY = 'brandforge-hidden-samples';
const FONT_OPTIONS = [
  'Bricolage Grotesque', 'Fraunces', 'Syne', 'DM Serif Display', 'Space Grotesk',
  'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Sora', 'Archivo', 'Instrument Serif',
  'Libre Baskerville', 'Playfair Display', 'Figtree', 'IBM Plex Sans', 'DM Sans',
  'Cormorant Garamond', 'Bebas Neue', 'Raleway', 'Urbanist', 'Montserrat',
  'Work Sans', 'Lora', 'Rubik', 'Space Mono',
];

function getLocalKits(): BrandKit[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KITS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalKit(input: BrandKitInput): BrandKit {
  const kit: BrandKit = {
    id: Date.now(),
    brandName: input.brandName,
    industry: input.industry,
    primaryColor: input.primaryColor,
    personality: input.personality,
    headingFont: input.headingFont,
    bodyFont: input.bodyFont,
    tagline: input.tagline ?? null,
    toneNotes: input.toneNotes ?? null,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_KITS_KEY, JSON.stringify([...getLocalKits(), kit]));
  return kit;
}

function kitToInput(kit: BrandKit): BrandKitInput {
  return {
    brandName: kit.brandName,
    industry: kit.industry,
    primaryColor: kit.primaryColor,
    personality: kit.personality,
    headingFont: kit.headingFont,
    bodyFont: kit.bodyFont,
    tagline: kit.tagline,
    toneNotes: kit.toneNotes,
  };
}

function updateLocalKit(kit: BrandKit) {
  const kits = getLocalKits();
  const next = kits.some((item) => item.id === kit.id)
    ? kits.map((item) => item.id === kit.id ? kit : item)
    : [...kits, kit];
  localStorage.setItem(LOCAL_KITS_KEY, JSON.stringify(next));
}

function removeLocalKit(id: number) {
  localStorage.setItem(LOCAL_KITS_KEY, JSON.stringify(getLocalKits().filter((kit) => kit.id !== id)));
}

function getHiddenSampleIds(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIDDEN_SAMPLES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function hideSampleKit(id: number) {
  localStorage.setItem(HIDDEN_SAMPLES_KEY, JSON.stringify([...new Set([...getHiddenSampleIds(), id])]));
}

function hasLocalKit(id: number) {
  return getLocalKits().some((kit) => kit.id === id);
}

function markKitSaved(id: number) {
  localStorage.setItem(`brandforge-kit-saved-${id}`, 'true');
}

function isKitMarkedSaved(id: number) {
  return localStorage.getItem(`brandforge-kit-saved-${id}`) === 'true' || hasLocalKit(id);
}

function kitCardColors(kit: BrandKit) {
  const palette = generatePalette(kit.primaryColor);
  return [kit.primaryColor, palette.ramp[4], palette.ramp[7], palette.ramp[9], palette.neutrals[0]];
}

function contrastText(hex: string) {
  const clean = hex.replace('#', '');
  const values = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16) / 255);
  const [r, g, b] = values.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.45 ? '#252A3D' : '#F5F0E5';
}

function personalityScores(value: string) {
  const [minimalBold = 52, playfulSerious = 48, modernClassic = 60] = value.match(/\d+/g)?.map(Number) ?? [];
  return { minimalBold, playfulSerious, modernClassic };
}

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('brandforge-theme') === 'dark');
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('brandforge-theme', dark ? 'dark' : 'light'); }, [dark]);
  return [dark, () => setDark((value) => !value)] as const;
}

function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className="flex items-center gap-2.5" data-testid="link-logo"><img src="/brandforge-bf.svg" alt="BF" className="h-8 w-8 shrink-0" /><span className={`bf-display text-[19px] font-bold tracking-tight ${light ? 'text-[#F5F0E5]' : 'text-foreground'}`}>brandforge</span></Link>;
}

function ContraMark() {
  return <svg className="bf-contra-logo" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12.25 4.25c-4.28 0-7.75 3.46-7.75 7.75s3.47 7.75 7.75 7.75c2.85 0 5.34-1.54 6.67-3.83l-3.24-1.87a3.96 3.96 0 0 1-3.43 1.98 4.03 4.03 0 0 1 0-8.06c1.46 0 2.75.79 3.43 1.98l3.24-1.87a7.73 7.73 0 0 0-6.67-3.83Z" />
    <path fill="currentColor" d="M14.85 8.05h3.7v7.9h-3.7z" opacity=".7" />
  </svg>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [dark, toggleTheme] = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { setMobileMenuOpen(false); }, [location]);
  const nav = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/builder', label: 'New identity', icon: Wand2 },
    { href: '/system', label: 'Design system', icon: Layers3 },
    { href: '/kits', label: 'Saved kits', icon: FolderOpen },
    { href: '/export', label: 'Export', icon: Download },
  ];
  return <div className="bf-shell bf-grain">
    <aside className="bf-sidebar">
      <Logo light />
      <div className="mt-14 mb-3 px-3 bf-eyebrow text-[#F5F0E5]/40">Workspace</div>
      <nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="bf-navlink" data-active={location === href || (href !== '/' && location.startsWith(href))} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={16} /><span>{label}</span>{href === '/builder' && <span className="ml-auto rounded bg-[#D8F05A] px-1.5 py-0.5 text-[9px] font-bold text-[#252A3D]">NEW</span>}</Link>)}</nav>
      <div className="mt-auto rounded-xl border border-[#F5F0E5]/10 bg-[#F5F0E5]/[.04] p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#D8F05A] text-xs font-bold text-[#252A3D]">BF</div>
        <p className="text-xs font-semibold text-[#F5F0E5]">Your creative desk</p><p className="mt-1 text-[11px] leading-4 text-[#F5F0E5]/45">Make something people recognize.</p>
      </div>
      <button className="mt-4 flex items-center gap-2 px-3 py-2 text-xs text-[#F5F0E5]/55 hover:text-[#F5F0E5]" onClick={toggleTheme} data-testid="button-toggle-theme">{dark ? <Sun size={14} /> : <Moon size={14} />}{dark ? 'Light mode' : 'Dark mode'}</button>
    </aside>
    <div className="bf-main">
      <div className="bf-mobile-nav">
        <Logo light />
        <button className="bf-menu-toggle" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} data-testid="button-mobile-menu">
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileMenuOpen && <div id="mobile-navigation" className="bf-mobile-menu">
        <nav className="bf-mobile-menu-list" aria-label="Mobile navigation">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="bf-mobile-menu-link" data-active={location === href || (href !== '/' && location.startsWith(href))} data-testid={`link-mobile-${label.toLowerCase().replace(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/builder' && <span className="bf-mobile-new">NEW</span>}</Link>)}
        </nav>
        <button onClick={toggleTheme} className="bf-mobile-theme" data-testid="button-mobile-theme">{dark ? <Sun size={17} /> : <Moon size={17} />}{dark ? 'Light mode' : 'Dark mode'}</button>
      </div>}
      {children}
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-10 flex items-end justify-between gap-5"><div><div className="bf-eyebrow mb-3">{eyebrow}</div><h1 className="bf-display text-5xl font-bold leading-[.95] text-foreground">{title}</h1>{detail && <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p>}</div>{action}</div>;
}

function Landing() {
  const { data: kits, isError, refetch } = useListBrandKits({ query: { queryKey: getListBrandKitsQueryKey(), staleTime: 30000, retry: false } });
  const localKits = getLocalKits();
  const visibleSamples = sampleKits.filter((kit) => !getHiddenSampleIds().includes(kit.id));
  const examples = kits?.length ? [...kits, ...localKits].slice(0, 3) : (localKits.length ? localKits.slice(0, 3) : visibleSamples);
  return <div className="bf-content">
    <div className="mb-20 flex items-center justify-between md:hidden"><Logo /><span className="bf-eyebrow">A brand in 30 seconds</span></div>
    <section className="relative grid items-center gap-10 overflow-visible py-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:py-12">
      <div className="bf-reveal"><div className="bf-eyebrow mb-5 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#D8F05A]" /> The founder's design desk</div><h1 className="bf-display max-w-3xl text-7xl font-bold leading-[.88] tracking-tight text-foreground md:text-[112px]">Make a brand<br /><span className="text-[#8C9652]">people feel.</span></h1><p className="mt-8 max-w-md text-base leading-7 text-muted-foreground">BrandForge turns a sharp point of view into a visual identity you can actually use, in one focused 30-second session.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/builder" className="bf-btn bf-btn-primary" data-testid="link-start-building">Start building <ArrowRight size={16} /></Link><Link href="/kits" className="bf-btn bf-btn-quiet" data-testid="link-see-kits">Browse kits</Link></div><div className="mt-10 flex items-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Zap size={14} className="text-[#8C9652]" /> Live token preview</span><span className="flex items-center gap-2"><Download size={14} className="text-[#8C9652]" /> Ready to ship</span></div></div>
      <div className="relative mx-auto w-full max-w-[440px] justify-self-end pr-1 bf-reveal" style={{ animationDelay: '.12s' }}><div className="absolute -right-3 -top-6 h-32 w-32 rounded-full bg-[#D8F05A] opacity-70 blur-3xl" /><div className="relative rotate-2 rounded-2xl border border-[#252A3D] bg-[#252A3D] p-3 shadow-2xl"><div className="rounded-xl bg-[#F5F0E5] p-6 md:p-8"><div className="flex items-center justify-between"><span className="bf-mono text-[10px] font-bold tracking-widest text-[#697080]">BF / 001</span><span className="rounded-full bg-[#D8F05A] px-2 py-1 bf-mono text-[9px] font-bold">LIVE</span></div><div className="my-12"><div className="bf-kicker-line" /><div className="bf-display text-6xl font-bold text-[#252A3D]">Morrow</div><p className="mt-3 text-sm text-[#697080]">Better days, designed in.</p></div><div className="grid grid-cols-5 gap-1.5">{kitCardColors(sampleKits[0]).map((color) => <div key={color} className="h-12 rounded" style={{ background: color }} />)}</div><div className="mt-6 flex justify-between border-t border-[#D8D4C8] pt-4 bf-mono text-[9px] text-[#697080]"><span>CLIMATE TECH</span><span>2024 / 08</span></div></div></div><span className="absolute -bottom-5 -left-8 rotate-[-8deg] rounded-lg bg-[#E7A77A] px-4 py-3 bf-mono text-[10px] font-bold text-[#252A3D] shadow-lg">YOUR POV, PACKAGED.</span></div>
    </section>
    <section className="border-t border-border py-20"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><div className="bf-eyebrow">The short version</div><h2 className="bf-display mt-3 max-w-sm text-4xl font-bold">Less blank canvas.<br />More sharp decisions.</h2></div><div className="grid gap-8 md:grid-cols-3">{[['01','Give it a point of view','Name your brand, pick your world, and describe its personality in plain English.'],['02','Watch it take shape','See color roles, type pairings, spacing and component states update as you work.'],['03','Take the system with you','Save the kit, keep the voice, and export production-ready tokens for your stack.']].map(([number, title, text]) => <div key={number} className="border-t-2 border-[#D8F05A] pt-4"><span className="bf-mono text-xs text-muted-foreground">{number}</span><h3 className="mt-6 text-base font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div></section>
    <section className="pb-12"><div className="mb-7 flex items-end justify-between"><div><div className="bf-eyebrow">From the archive</div><h2 className="bf-display mt-2 text-4xl font-bold">Recent identities</h2></div><Link href="/kits" className="bf-btn bf-btn-ghost" data-testid="link-all-kits">View all <ArrowRight size={14} /></Link></div>{isError && <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-secondary/60 px-4 py-3 text-xs text-muted-foreground"><span>Showing your starter archive while cloud storage reconnects.</span><button onClick={() => refetch()} className="bf-btn bf-btn-quiet min-h-8 px-3 text-[11px]" data-testid="button-retry-kits"><RefreshCw size={13} /> Retry</button></div>}<div className="grid gap-4 md:grid-cols-3">{examples.map((kit, index) => <KitPreview kit={kit} key={kit.id} index={index} />)}</div></section>
    <Footer />
  </div>;
}

function KitPreview({ kit, index = 0 }: { kit: BrandKit; index?: number }) {
  const colors = kitCardColors(kit);
  return <Link href={kit.id < 100 ? '/builder' : '/system'} className="bf-card group block overflow-hidden p-3" data-testid={`card-kit-${kit.id}`}><div className="grid h-32 grid-cols-4 gap-1.5 rounded-xl overflow-hidden">{colors.map((color, i) => <div key={`${color}-${i}`} style={{ background: color }} className={`${i === 0 ? 'col-span-2' : ''} transition-transform group-hover:scale-[1.03]`} />)}</div><div className="p-3 pb-2"><div className="flex items-start justify-between"><div><h3 className="bf-display text-2xl font-bold">{kit.brandName}</h3><p className="mt-1 text-xs text-muted-foreground">{kit.industry}</p></div><span className="bf-mono text-[9px] text-muted-foreground">0{index + 1}</span></div></div></Link>;
}

function Footer() {
  return <footer className="mt-16 border-t border-border pt-10 pb-4" data-testid="site-footer">
    <div className="grid gap-10 md:grid-cols-[1.1fr_1fr_1fr]">
      <div><div className="bf-eyebrow">About BrandForge</div><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">BrandForge helps you turn a clear point of view into a useful visual identity.</p><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">It is a small creative desk for exploring color, type, and brand voice.</p></div>
      <div><div className="bf-eyebrow">About the builder</div><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Hi, I&apos;m Priya Upadhyay, a UI/UX designer and AI product builder. I built BrandForge as a solo project to explore color theory in practical brand systems.</p></div>
      <div><div className="bf-eyebrow">Say hello</div><p className="mt-4 text-sm leading-6 text-muted-foreground">Have an idea or want to connect? Feel free to reach out.</p><div className="mt-4 flex flex-wrap gap-2"><a className="bf-social-link bf-email-link" href="mailto:upadhyaypriya974@gmail.com?subject=Hello%20from%20BrandForge" aria-label="Email Priya at upadhyaypriya974@gmail.com" data-testid="link-footer-email"><SiGmail size={16} /> <span>upadhyaypriya974@gmail.com</span></a><a className="bf-social-link" href="https://www.linkedin.com/in/priya-upadhyay68" target="_blank" rel="noreferrer" aria-label="Priya on LinkedIn"><Linkedin size={16} /> LinkedIn</a><a className="bf-social-link" href="https://contra.com/priya_upadhyay_bkxvxwme?referralExperimentNid=DEFAULT_REFERRAL_PROGRAM&referrerUsername=priya_upadhyay_bkxvxwme" target="_blank" rel="noreferrer" aria-label="Priya on Contra" data-testid="link-footer-contra"><ContraMark /> Contra</a></div></div>
    </div>
    <div className="mt-10 flex items-center justify-between border-t border-border pt-4 bf-mono text-[10px] text-muted-foreground"><span>BRANDFORGE</span><span>Built with care by Priya Upadhyay</span></div>
  </footer>;
}

const initialForm: BrandKitInput = { brandName: '', industry: '', primaryColor: '#D8F05A', personality: '', headingFont: 'Bricolage Grotesque', bodyFont: 'DM Sans', tagline: null, toneNotes: null };
function Builder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); const [form, setForm] = useState<BrandKitInput>(initialForm); const [validationNotice, setValidationNotice] = useState(''); const [error, setError] = useState('');
  const create = useCreateBrandKit();
  const set = (key: keyof BrandKitInput, value: string) => { setForm((current) => ({ ...current, [key]: value })); setValidationNotice(''); setError(''); };
  const canNext = step === 1 ? !!form.brandName && !!form.industry : step === 2 ? !!form.primaryColor && !!form.personality : !!form.headingFont && !!form.bodyFont;
  const validateStep = () => {
    const missing = step === 1
      ? [!form.brandName && 'a brand name', !form.industry && 'an industry'].filter(Boolean)
      : step === 2
        ? [!form.primaryColor && 'a primary color', !form.personality && 'a personality direction'].filter(Boolean)
        : [!form.headingFont && 'a heading font', !form.bodyFont && 'a body font'].filter(Boolean);
    if (missing.length) {
      setValidationNotice(`Add ${missing.join(' and ')} to continue.`);
      return false;
    }
    setValidationNotice('');
    return true;
  };
  const advance = () => { if (validateStep()) setStep((current) => current + 1); };
  const submit = () => {
    if (!validateStep()) return;
    create.mutate(
      { data: form },
      {
        onSuccess: (kit) => {
          queryClient.invalidateQueries({ queryKey: getListBrandKitsQueryKey() });
          markKitSaved(kit.id);
          localStorage.setItem('brandforge-current-kit', JSON.stringify(kit));
          setLocation('/system');
        },
        onError: () => {
          const localKit = saveLocalKit(form);
          markKitSaved(localKit.id);
          localStorage.setItem('brandforge-current-kit', JSON.stringify(localKit));
          setLocation('/system');
        },
      },
    );
  };
  return <div className="bf-content"><PageHeading eyebrow="New identity / 30 seconds" title="Build your signal." detail="Three quick choices. One usable system. You can always come back and tune the edges." /><div className="mb-10 flex max-w-2xl items-center justify-between">{[['01','The basics'],['02','The energy'],['03','The type']].map(([num, label], index) => <div key={num} className="flex items-center gap-3"><div className="bf-step" data-active={step === index + 1} data-done={step > index + 1}><span className="bf-step-dot">{step > index + 1 ? <Check size={13} /> : num}</span><span className={`hidden text-xs font-bold md:block ${step === index + 1 ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span></div>{index < 2 && <div className={`mx-2 h-px w-10 md:w-24 ${step > index + 1 ? 'bg-[#D8F05A]' : 'bg-border'}`} />}</div>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="bf-card p-6 md:p-9">
       {step === 1 && <div className="bf-reveal"><div className="bf-eyebrow">01 / Orient</div><h2 className="bf-display mt-3 text-3xl font-bold">What are we calling it?</h2><p className="mt-2 text-sm text-muted-foreground">Start with the words people will remember.</p><div className="mt-8 grid gap-5"><div><label className="bf-label">Brand name</label><input autoFocus className={`bf-input ${validationNotice && !form.brandName ? 'bf-input-error' : ''}`} value={form.brandName} onChange={e => set('brandName', e.target.value)} placeholder="e.g. Morrow" aria-invalid={validationNotice && !form.brandName ? true : undefined} data-testid="input-brand-name" />{validationNotice && !form.brandName && <p className="bf-field-error"><AlertCircle size={13} /> Brand name is required.</p>}</div><div><label className="bf-label">Industry or category</label><select className={`bf-input ${validationNotice && !form.industry ? 'bf-input-error' : ''}`} value={form.industry} onChange={e => set('industry', e.target.value)} aria-invalid={validationNotice && !form.industry ? true : undefined} data-testid="input-industry"><option value="">Choose an industry</option>{['Tech','Food & Beverage','Fashion','Health','Finance','Creative'].map(option => <option key={option}>{option}</option>)}</select>{validationNotice && !form.industry && <p className="bf-field-error"><AlertCircle size={13} /> Industry is required.</p>}</div><div><label className="bf-label">Optional tagline</label><input className="bf-input" value={form.tagline ?? ''} onChange={e => set('tagline', e.target.value)} placeholder="A few words worth repeating" data-testid="input-tagline" /></div></div></div>}
       {step === 2 && <div className="bf-reveal"><div className="bf-eyebrow">02 / Dial it in</div><h2 className="bf-display mt-3 text-3xl font-bold">What should it feel like?</h2><p className="mt-2 text-sm text-muted-foreground">Choose the tensions that make the brand recognizably yours.</p><div className="mt-8 grid gap-5"><div><label className="bf-label">Primary color</label><div className="flex gap-3"><input type="color" className={`h-11 w-14 cursor-pointer rounded-lg border border-input bg-background p-1 ${validationNotice && !form.primaryColor ? 'bf-input-error' : ''}`} value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} data-testid="input-primary-color" /><input className={`bf-input bf-mono ${validationNotice && !form.primaryColor ? 'bf-input-error' : ''}`} value={form.primaryColor} onChange={e => set('primaryColor', e.target.value)} data-testid="input-primary-hex" /></div>{validationNotice && !form.primaryColor && <p className="bf-field-error"><AlertCircle size={13} /> Choose a primary color.</p>}</div><div className={validationNotice && !form.personality ? 'rounded-xl border border-red-400/70 p-3' : ''}><PersonalitySliders value={form.personality} onChange={value => set('personality', value)} />{validationNotice && !form.personality && <p className="bf-field-error mt-3"><AlertCircle size={13} /> Set the brand personality.</p>}</div><div><label className="bf-label">Voice notes <span className="font-normal text-muted-foreground">(optional)</span></label><textarea className="bf-input min-h-20 resize-none py-3" value={form.toneNotes ?? ''} onChange={e => set('toneNotes', e.target.value)} placeholder="Anything the brand should sound like or avoid?" data-testid="input-tone-notes" /></div></div></div>}
       {step === 3 && <div className="bf-reveal"><div className="bf-eyebrow">03 / Set the voice</div><h2 className="bf-display mt-3 text-3xl font-bold">Choose your type pairing.</h2><p className="mt-2 text-sm text-muted-foreground">One expressive voice. One workhorse. No font hunting.</p><div className="mt-8 grid gap-5"><FontSelect label="Heading font" value={form.headingFont} onChange={value => set('headingFont', value)} options={FONT_OPTIONS} testId="select-heading-font" /><FontSelect label="Body font" value={form.bodyFont} onChange={value => set('bodyFont', value)} options={FONT_OPTIONS} testId="select-body-font" /></div>{error && <p className="mt-5 rounded-lg bg-[#E7A77A]/20 p-3 text-sm text-[#8B3D2B]" data-testid="status-builder-error">{error}</p>}</div>}
       {validationNotice && <p className="mt-6 flex items-center gap-2 rounded-lg border border-red-400/60 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300" data-testid="status-builder-validation"><AlertCircle size={16} /> {validationNotice}</p>}
       <div className="mt-10 flex justify-between border-t border-border pt-6">{step > 1 ? <button className="bf-btn bf-btn-quiet" onClick={() => { setStep(step - 1); setValidationNotice(''); }} data-testid="button-builder-back"><ChevronLeft size={15} /> Back</button> : <span />}{step < 3 ? <button className="bf-btn bf-btn-primary" onClick={advance} data-testid="button-builder-next">Continue <ChevronRight size={15} /></button> : <button className="bf-btn bf-btn-accent" disabled={create.isPending} onClick={submit} data-testid="button-generate-kit">{create.isPending ? 'Forging...' : 'Forge my identity'} <Sparkles size={15} /></button>}</div>
    </div><BuilderPreview form={form} /></div>
  </div>;
}

function FontSelect({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (value: string) => void; options: string[]; testId: string }) { return <div><label className="bf-label">{label}</label><select className="bf-input" value={value} onChange={e => onChange(e.target.value)} data-testid={testId}>{options.map(option => <option key={option}>{option}</option>)}</select><p className="mt-2 text-xs text-muted-foreground" style={{ fontFamily: value }}>{value} makes the system feel {value === 'Fraunces' || value === 'Cormorant Garamond' || value === 'DM Serif Display' ? 'editorial and warm' : value === 'Space Mono' || value === 'IBM Plex Sans' ? 'technical and exact' : 'distinctly considered'}.</p></div>; }
function PersonalitySliders({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [minimalBold, playfulSerious, modernClassic] = value.match(/\d+/g)?.map(Number) ?? [52, 48, 60];
  const setSlider = (name: string, next: number) => {
    const values = { minimalBold, playfulSerious, modernClassic, [name]: next };
    onChange(`Minimal ${values.minimalBold}% / Bold ${100 - values.minimalBold}% · Playful ${values.playfulSerious}% / Serious ${100 - values.playfulSerious}% · Modern ${values.modernClassic}% / Classic ${100 - values.modernClassic}%`);
  };
  return <div className="grid gap-5" data-testid="personality-sliders">{[['minimalBold','Minimal','Bold',minimalBold],['playfulSerious','Playful','Serious',playfulSerious],['modernClassic','Modern','Classic',modernClassic]].map(([name, left, right, current]) => <label key={name as string} className="block"><span className="mb-2 flex justify-between text-xs font-semibold"><span>{left as string}</span><span className="text-muted-foreground">{right as string}</span></span><input type="range" min="0" max="100" value={current as number} onChange={event => setSlider(name as string, Number(event.target.value))} className="w-full accent-[#8C9652]" aria-label={`${left} to ${right}`} /></label>)}</div>;
}
function BuilderPreview({ form }: { form: BrandKitInput }) {
  const safeColor = /^#[0-9a-f]{6}$/i.test(form.primaryColor) ? form.primaryColor : '#D8F05A';
  const palette = generatePalette(safeColor);
  const scores = personalityScores(form.personality);
  const boldness = 100 - scores.minimalBold;
  const roundness = 8 + (100 - scores.playfulSerious) * 0.22;
  const surface = palette.ramp[Math.min(9, Math.max(1, Math.round(2 + scores.modernClassic / 25)))];
  const ink = contrastText(surface);
  return <div className="bf-card overflow-hidden transition-colors duration-300" style={{ background: surface, color: ink, borderRadius: `${roundness}px` }}><div className="flex items-center justify-between p-5" style={{ color: ink }}><span className="bf-mono text-[10px] font-bold">LIVE PREVIEW</span><span className="h-2 w-2 rounded-full" style={{ background: ink }} /></div><div className="flex min-h-[390px] flex-col justify-center p-8" style={{ color: ink }}><div className="mb-5 h-1 w-12 rounded-full transition-all duration-300" style={{ background: palette.ramp[Math.min(9, Math.max(0, Math.round(scores.playfulSerious / 12)))] }} /><div className="bf-display break-words text-5xl leading-[.95] transition-all duration-300" style={{ fontFamily: form.headingFont, fontWeight: 500 + Math.round(boldness * 3), letterSpacing: `${-0.02 - scores.modernClassic / 2600}em` }}>{form.brandName || 'Your brand'}</div><p className="mt-4 text-sm opacity-75 transition-all duration-300" style={{ fontFamily: form.bodyFont, letterSpacing: `${scores.modernClassic / 5000}em` }}>{form.tagline || 'A point of view is taking shape.'}</p><div className="mt-8 flex flex-wrap gap-2 bf-mono text-[9px] font-bold uppercase"><span className="rounded-full border px-2 py-1" style={{ borderColor: `${ink}55` }}>Minimal {scores.minimalBold}</span><span className="rounded-full border px-2 py-1" style={{ borderColor: `${ink}55` }}>Playful {scores.playfulSerious}</span><span className="rounded-full border px-2 py-1" style={{ borderColor: `${ink}55` }}>Modern {scores.modernClassic}</span></div></div><div className="border-t p-5 bf-mono text-[9px] opacity-70" style={{ borderColor: `${ink}33`, color: ink }}>{form.industry || 'YOUR INDUSTRY'} / {form.personality ? 'POINT OF VIEW' : 'PERSONALITY PENDING'}</div></div>;
}

function CurrentKit({ fallback = false }: { fallback?: boolean }) {
  const [kit, setKit] = useState<BrandKit | null>(() => { try { return JSON.parse(localStorage.getItem('brandforge-current-kit') || 'null'); } catch { return null; } });
  const { data: kits } = useListBrandKits({ query: { staleTime: 30000, queryKey: getListBrandKitsQueryKey() } });
  useEffect(() => { if (!kit && kits?.[0]) { setKit(kits[0]); localStorage.setItem('brandforge-current-kit', JSON.stringify(kits[0])); } }, [kit, kits]);
  return kit || (fallback ? sampleKits[0] : null);
}
function fallbackVoice(kit: BrandKit): BrandVoice {
  const scores = personalityScores(kit.personality);
  const playful = 100 - scores.playfulSerious;
  const style = playful > 65 ? 'warm and lively' : scores.modernClassic > 65 ? 'clear and forward-looking' : 'calm and considered';
  return {
    tagline: `${kit.brandName}, ${playful > 65 ? 'with a little more joy' : 'made to matter'}.`,
    toneGuidelines: [
      `Keep every sentence clear, human, and ${style}.`,
      `Lead with the useful idea, then let the personality follow.`,
      `Sound like a confident guide in ${kit.industry}, never a distant expert.`,
    ],
    brandDescription: `${kit.brandName} helps people move through ${kit.industry} with a point of view that feels ${style}, useful, and memorable.`,
  };
}
function SystemPage() {
  const kit = CurrentKit({ fallback: true }); const [voice, setVoice] = useState<BrandVoice | null>(null); const [saved, setSaved] = useState(() => false); const generate = useGenerateBrandVoice(); const save = useCreateBrandKit(); const queryClient = useQueryClient();
  const palette = useMemo(() => kit ? generatePalette(kit.primaryColor) : null, [kit]);
  useEffect(() => { if (kit) setSaved(isKitMarkedSaved(kit.id)); }, [kit]);
  if (!kit) return <EmptySystem />;
  const makeVoice = () => {
    generate.mutate(
      { data: { brandName: kit.brandName, industry: kit.industry, personality: kit.personality } },
      { onSuccess: setVoice, onError: () => setVoice(fallbackVoice(kit)) },
    );
  };
  const saveKit = () => {
    if (saved || save.isPending) return;
    if (kit.id >= 100 && !hasLocalKit(kit.id)) {
      save.mutate({ data: kitToInput(kit) }, {
        onSuccess: (savedKit) => { markKitSaved(savedKit.id); localStorage.setItem('brandforge-current-kit', JSON.stringify(savedKit)); setSaved(true); queryClient.invalidateQueries({ queryKey: getListBrandKitsQueryKey() }); },
        onError: () => { const localKit = saveLocalKit(kitToInput(kit)); markKitSaved(localKit.id); localStorage.setItem('brandforge-current-kit', JSON.stringify(localKit)); setSaved(true); },
      });
    } else {
      if (hasLocalKit(kit.id)) updateLocalKit(kit);
      markKitSaved(kit.id);
      setSaved(true);
    }
  };
  return <div className="bf-content"><PageHeading eyebrow="Design system / live output" title={kit.brandName} detail={`${kit.industry} · Forged ${new Date(kit.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`} action={<Link href="/export" className="bf-btn bf-btn-primary" data-testid="link-export-system"><Download size={15} /> Export system</Link>} /><div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="bf-card overflow-hidden p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="bf-eyebrow">01 / Color system</div><h2 className="bf-display mt-2 text-2xl font-bold">A palette with a pulse.</h2></div><span className="bf-mono text-[10px] text-muted-foreground">10-SHADE RAMP</span></div><div className="grid grid-cols-5 gap-1.5 md:grid-cols-10">{palette?.ramp.map((color, index) => <button key={`${color}-${index}`} className="bf-swatch group relative" style={{ background: color, color: contrastText(color), minHeight: 150 }} title={`Copy ${color}`} onClick={() => navigator.clipboard?.writeText(color)}><span className="bf-mono text-[9px] font-bold opacity-75">{String(index + 1).padStart(2, '0')}</span><span className="bf-swatch-label bf-mono">{color}</span><Copy size={12} className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-70" /></button>)}</div><div className="mt-5 grid gap-4 md:grid-cols-3"><div><p className="bf-eyebrow">Complementary</p><p className="mt-2 bf-mono text-sm font-semibold">{palette?.complementary}</p></div><div><p className="bf-eyebrow">Neutrals</p><p className="mt-2 bf-mono text-sm font-semibold">{palette?.neutrals.slice(0, 3).join(' · ')}</p></div><div><p className="bf-eyebrow">Contrast</p><p className="mt-2 text-sm font-semibold">AA / readable</p></div></div></div><div className="bf-card p-7" style={{ background: palette?.neutrals[0], color: palette?.neutrals[4] }}><div className="bf-eyebrow" style={{ color: palette?.ramp[7] }}>02 / Type system</div><div className="mt-10" style={{ fontFamily: kit.headingFont }}><span className="bf-mono text-[10px]" style={{ color: palette?.ramp[7] }}>DISPLAY / {kit.headingFont}</span><div className="bf-display mt-3 text-5xl font-bold leading-[.9]">Make it<br />recognizable.</div></div><div className="mt-12 border-t pt-5" style={{ fontFamily: kit.bodyFont, borderColor: `${palette?.neutrals[4]}25` }}><span className="bf-mono text-[10px]" style={{ color: palette?.ramp[7] }}>BODY / {kit.bodyFont}</span><p className="mt-3 text-sm leading-6 opacity-85">A clear, generous system for people with a point of view and something worth saying.</p></div></div></div><div className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><ComponentGallery kit={kit} /><VoiceCard kit={kit} voice={voice} onGenerate={makeVoice} pending={generate.isPending} /></div><div className="mt-5 flex justify-end"><button className="bf-btn bf-btn-accent" onClick={saveKit} disabled={saved || save.isPending} data-testid="button-save-kit">{saved ? <><CheckCircle2 size={15} /> Kit saved</> : <><Save size={15} /> {save.isPending ? 'Saving...' : 'Save kit'}</>}</button></div></div>;
}
function ComponentGallery({ kit }: { kit: BrandKit }) {
  const [active, setActive] = useState('Primary action');
  const colors = kitCardColors(kit);
  return <div className="bf-card p-6"><div className="bf-eyebrow">03 / Components</div><h2 className="bf-display mt-2 text-2xl font-bold">Small system, many moves.</h2><div className="mt-7 space-y-5"><div className="flex flex-wrap gap-2"><button className="bf-btn bf-btn-primary" onClick={() => setActive('Primary action selected')} data-testid="button-component-primary">Primary action <ArrowRight size={14} /></button><button className="bf-btn bf-btn-quiet" onClick={() => setActive('Secondary selected')} data-testid="button-component-secondary">Secondary</button></div><p className="text-xs font-semibold text-muted-foreground">{active}</p><div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full" style={{ background: colors[0] }} /><div className="flex-1"><div className="h-2 w-4/5 rounded bg-foreground/80" /><div className="mt-2 h-2 w-3/5 rounded bg-muted-foreground/30" /></div><span className="h-3 w-3 rounded-full" style={{ background: colors[2] }} /></div><div className="rounded-xl border border-border bg-background p-4"><div className="flex items-center gap-2"><Search size={14} className="text-muted-foreground" /><input className="w-full bg-transparent text-xs outline-none" placeholder="Search your system..." aria-label="Search your system" /></div></div><div className="grid grid-cols-3 gap-2">{colors.slice(0, 3).map((color, index) => <div key={color} className="rounded-lg p-3" style={{ background: color, color: contrastText(color) }}><span className="bf-mono text-[9px]">0{index + 1}</span><div className="mt-5 h-1.5 w-10 rounded-full bg-current opacity-50" /></div>)}</div></div></div>;
}
function VoiceCard({ kit, voice, onGenerate, pending }: { kit: BrandKit; voice: BrandVoice | null; onGenerate: () => void; pending: boolean }) { return <div className="bf-card p-6"><div className="flex items-start justify-between gap-4"><div><div className="bf-eyebrow">04 / Brand voice</div><h2 className="bf-display mt-2 text-2xl font-bold">Say it like you mean it.</h2></div><button className="bf-btn bf-btn-accent" onClick={onGenerate} disabled={pending} data-testid="button-generate-voice">{pending ? 'Writing...' : voice ? 'Refresh voice' : 'Generate voice'} <Send size={14} /></button></div>{voice ? <div className="bf-reveal mt-8"><div className="rounded-xl bg-secondary p-5"><span className="bf-eyebrow">Suggested tagline</span><p className="bf-display mt-3 text-3xl font-bold">{voice.tagline}</p></div><p className="mt-6 text-sm leading-6 text-muted-foreground">{voice.brandDescription}</p><div className="mt-6 grid gap-3">{voice.toneGuidelines.map((line, i) => <div key={`${line}-${i}`} className="flex gap-3 text-sm"><span className="bf-mono text-xs text-[#8C9652]">0{i + 1}</span><span>{line}</span></div>)}</div></div> : <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center"><BookOpen className="mx-auto text-muted-foreground" size={24} /><p className="mt-3 text-sm font-semibold">Your voice is the final layer.</p><p className="mt-1 text-xs text-muted-foreground">Generate a concise tagline and three practical tone rules for {kit.brandName}.</p></div>}</div>; }
function EmptySystem() { return <div className="bf-content"><div className="bf-card flex min-h-[55vh] flex-col items-center justify-center p-8 text-center"><Sparkles className="text-[#8C9652]" size={30} /><h1 className="bf-display mt-5 text-4xl font-bold">Nothing forged yet.</h1><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Start with a name and a point of view. Your complete system will land here.</p><Link href="/builder" className="bf-btn bf-btn-accent mt-7" data-testid="link-empty-start">Start a new identity <ArrowRight size={15} /></Link></div></div>; }

function EditKitDialog({ kit, onClose, onSave, pending }: { kit: BrandKit; onClose: () => void; onSave: (name: string, color: string) => void; pending: boolean }) {
  const [name, setName] = useState(kit.brandName);
  const [color, setColor] = useState(kit.primaryColor);
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#252A3D]/55 p-4" role="dialog" aria-modal="true" aria-label="Adjust saved kit">
    <div className="bf-card w-full max-w-md p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><div className="bf-eyebrow">Adjust kit</div><h2 className="bf-display mt-2 text-2xl font-bold">Tune this identity.</h2></div><button className="bf-btn bf-btn-quiet min-h-9 px-3" onClick={onClose} aria-label="Close dialog"><X size={16} /></button></div>
      <div className="mt-7 grid gap-5"><div><label className="bf-label">Kit name</label><input className="bf-input" value={name} onChange={event => setName(event.target.value)} autoFocus data-testid="input-edit-kit-name" /></div><div><label className="bf-label">Primary color</label><div className="flex gap-3"><input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-input bg-background p-1" value={color} onChange={event => setColor(event.target.value)} /><input className="bf-input bf-mono" value={color} onChange={event => setColor(event.target.value)} data-testid="input-edit-kit-color" /></div></div></div>
      <div className="mt-7 flex justify-end gap-2"><button className="bf-btn bf-btn-quiet" onClick={onClose}>Cancel</button><button className="bf-btn bf-btn-accent" disabled={!name.trim() || !/^#[0-9a-f]{6}$/i.test(color) || pending} onClick={() => onSave(name.trim(), color)} data-testid="button-save-kit-adjustment">{pending ? 'Saving...' : 'Save changes'} <Check size={14} /></button></div>
    </div>
  </div>;
}

function KitsPage() {
  const { data, isError, refetch } = useListBrandKits({ query: { queryKey: getListBrandKitsQueryKey(), staleTime: 30000, retry: false } });
  const queryClient = useQueryClient();
  const remove = useDeleteBrandKit();
  const create = useCreateBrandKit();
  const update = useUpdateBrandKit();
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<number | null>(null);
  const [editing, setEditing] = useState<BrandKit | null>(null);
  const [, setLocation] = useLocation();
  const [, refreshLocal] = useState(0);
  const localKits = getLocalKits();
  const cloudKits = data ?? [];
  const visibleSamples = sampleKits.filter((kit) => !getHiddenSampleIds().includes(kit.id));
  const sourceKits = cloudKits.length ? [...cloudKits, ...localKits] : (localKits.length ? localKits : visibleSamples);
  const shown = sourceKits.filter(k => `${k.brandName} ${k.industry}`.toLowerCase().includes(search.toLowerCase()));
  const isCloudKit = (kit: BrandKit) => cloudKits.some((item) => item.id === kit.id);
  const duplicate = (kit: BrandKit) => create.mutate({ data: kitToInput({ ...kit, brandName: `${kit.brandName} / Copy` }) }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBrandKitsQueryKey() }), onError: () => { saveLocalKit({ ...kitToInput(kit), brandName: `${kit.brandName} / Copy` }); refreshLocal((value) => value + 1); } });
  const deleteKit = (kit: BrandKit) => {
    if (!confirm(`Delete ${kit.brandName}?`)) return;
    if (isCloudKit(kit)) remove.mutate({ id: kit.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBrandKitsQueryKey() }) });
    else if (hasLocalKit(kit.id)) { removeLocalKit(kit.id); refreshLocal((value) => value + 1); }
    else { hideSampleKit(kit.id); refreshLocal((value) => value + 1); }
  };
  const saveAdjustment = (name: string, color: string) => {
    if (!editing) return;
    const nextKit = { ...editing, brandName: name, primaryColor: color };
    if (isCloudKit(editing)) {
      update.mutate({ id: editing.id, data: { brandName: name, primaryColor: color } }, { onSuccess: (savedKit) => { localStorage.setItem('brandforge-current-kit', JSON.stringify(savedKit)); setEditing(null); queryClient.invalidateQueries({ queryKey: getListBrandKitsQueryKey() }); } });
    } else {
      if (hasLocalKit(editing.id)) updateLocalKit(nextKit);
      else { hideSampleKit(editing.id); saveLocalKit(kitToInput(nextKit)); }
      setEditing(null);
      refreshLocal((value) => value + 1);
    }
  };
  return <div className="bf-content"><PageHeading eyebrow="Archive / Saved kits" title="Your little library." detail="Every sharp decision, kept close. Open a kit to revisit its system or duplicate it to explore a new direction." action={<Link href="/builder" className="bf-btn bf-btn-accent" data-testid="link-new-kit"><Plus size={15} /> New kit</Link>} /><div className="mb-6 flex items-center gap-3"><div className="relative max-w-sm flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input className="bf-input pl-10" placeholder="Search kits..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-kits" /></div><span className="bf-mono text-[10px] text-muted-foreground">{sourceKits.length} SAVED</span></div>{isError ? <div className="bf-card-flat mb-5 flex items-center justify-between p-5 text-sm"><span>Cloud archive unavailable. Browser storage is active.</span><button className="bf-btn bf-btn-quiet" onClick={() => refetch()} data-testid="button-retry-archive"><RefreshCw size={14} /> Retry cloud</button></div> : null}{shown.length === 0 ? <div className="bf-card flex min-h-64 flex-col items-center justify-center text-center"><FolderOpen size={24} className="text-muted-foreground" /><p className="mt-4 font-semibold">No kits match that search.</p><button className="bf-btn bf-btn-quiet mt-4" onClick={() => setSearch('')} data-testid="button-clear-search">Clear search</button></div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{shown.map(kit => <div className="bf-card group relative overflow-visible" key={kit.id} data-testid={`card-saved-kit-${kit.id}`}><div className="grid h-36 grid-cols-5 gap-1.5 rounded-t-2xl p-2" style={{ background: kit.primaryColor }}>{kitCardColors(kit).map((c, index) => <div key={`${c}-${index}`} className="rounded-lg" style={{ background: c }} />)}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="bf-display text-2xl font-bold">{kit.brandName}</h3><p className="mt-1 text-xs text-muted-foreground">{kit.industry}</p></div><span className="shrink-0 rounded bg-secondary px-2 py-1 bf-mono text-[9px]">{kit.primaryColor}</span></div><div className="mt-5 flex gap-2 border-t border-border pt-4"><button className="bf-btn bf-btn-primary flex-1" onClick={() => { localStorage.setItem('brandforge-current-kit', JSON.stringify(kit)); setLocation('/system'); }} data-testid={`button-open-kit-${kit.id}`}><FolderOpen size={14} /> Open</button><button className="bf-btn bf-btn-quiet px-3" onClick={() => duplicate(kit)} disabled={create.isPending} data-testid={`button-duplicate-kit-${kit.id}`}><Copy size={14} /></button><button className="bf-btn bf-btn-quiet px-3" onClick={() => setMenuId(menuId === kit.id ? null : kit.id)} aria-expanded={menuId === kit.id} aria-label={`Adjust ${kit.brandName}`} data-testid={`button-adjust-kit-${kit.id}`}><MoreHorizontal size={16} /></button></div></div>{menuId === kit.id && <div className="absolute bottom-16 right-4 z-20 min-w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl"><button className="bf-menu-item" onClick={() => { setEditing(kit); setMenuId(null); }}><Pencil size={14} /> Rename</button><button className="bf-menu-item" onClick={() => { setEditing(kit); setMenuId(null); }}><Palette size={14} /> Change palette</button><button className="bf-menu-item text-destructive" onClick={() => { setMenuId(null); deleteKit(kit); }}><Trash2 size={14} /> Delete kit</button></div>}</div>)}</div>}{editing && <EditKitDialog kit={editing} onClose={() => setEditing(null)} onSave={saveAdjustment} pending={update.isPending} />}</div>;
}

function ExportPage() {
  const kit = CurrentKit({ fallback: true }); const [tab, setTab] = useState<'css' | 'tailwind' | 'json'>('css'); const [copied, setCopied] = useState(false);
  if (!kit) return <EmptySystem />;
  const palette = generatePalette(kit.primaryColor);
  const code = tab === 'css' ? `:root {\n${palette.ramp.map((color, index) => `  --color-brand-${index + 1}: ${color};`).join('\n')}\n  --color-complementary: ${palette.complementary};\n  --color-ink: ${palette.neutrals[4]};\n  --color-paper: ${palette.neutrals[0]};\n  --font-heading: "${kit.headingFont}";\n  --font-body: "${kit.bodyFont}";\n}` : tab === 'tailwind' ? `export default {\n  theme: {\n    extend: {\n      colors: {\n${palette.ramp.map((color, index) => `        brand: { ${index + 1}: "${color}" },`).join('\n')}\n        complementary: "${palette.complementary}",\n      },\n      fontFamily: {\n        heading: ["${kit.headingFont}"],\n        body: ["${kit.bodyFont}"],\n      },\n    },\n  },\n};` : JSON.stringify({ ...kit, tokens: palette }, null, 2);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return <div className="bf-content"><PageHeading eyebrow="Handoff / Export" title="Take it anywhere." detail={`Production-ready tokens for ${kit.brandName}. Copy a snippet, or download the full kit as JSON.`} action={<button className="bf-btn bf-btn-accent" onClick={() => { const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${kit.brandName.toLowerCase().replaceAll(' ', '-')}-brand-kit.json`; a.click(); }} data-testid="button-download-json"><Download size={15} /> Download JSON</button>} /><div className="bf-card overflow-hidden"><div className="flex flex-wrap items-center gap-7 border-b border-border px-6"><button className="bf-tab" data-active={tab === 'css'} onClick={() => setTab('css')} data-testid="tab-export-css"><FileCode2 size={15} className="mr-2 inline" /> CSS variables</button><button className="bf-tab" data-active={tab === 'tailwind'} onClick={() => setTab('tailwind')} data-testid="tab-export-tailwind"><Layers3 size={15} className="mr-2 inline" /> Tailwind config</button><button className="bf-tab" data-active={tab === 'json'} onClick={() => setTab('json')} data-testid="tab-export-json"><Copy size={15} className="mr-2 inline" /> JSON</button></div><div className="flex items-center justify-between bg-[#252A3D] px-5 py-3 text-[#F5F0E5]/55"><span className="bf-mono text-[10px] uppercase">{tab === 'css' ? 'tokens.css' : tab === 'tailwind' ? 'tailwind.config.js' : `${kit.brandName.toLowerCase()}.json`}</span><button className="flex items-center gap-2 text-xs font-bold text-[#D8F05A]" onClick={copy} data-testid="button-copy-export">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy code'}</button></div><pre className="bf-code min-h-[350px] rounded-none">{code}</pre></div><div className="mt-5 grid gap-4 md:grid-cols-3">{[['CSS variables','Drop into any stylesheet.'],['Tailwind config','Map directly to your utility layer.'],['JSON source','Keep the complete identity portable.']].map(([title, text], i) => <div className="bf-card-flat p-5" key={title}><div className="bf-mono text-[10px] text-[#8C9652]">0{i + 1}</div><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p></div>)}</div></div>;
}

function NotFound() { return <div className="bf-content"><div className="bf-card p-12 text-center"><X className="mx-auto text-[#8C9652]" /><h1 className="bf-display mt-4 text-4xl font-bold">That page went off-grid.</h1><Link href="/" className="bf-btn bf-btn-primary mt-6" data-testid="link-not-found-home">Back to overview</Link></div></div>; }
function Router() { return <Shell><ErrorBoundary resetKey={location.pathname}><Switch><Route path="/" component={Landing} /><Route path="/builder" component={Builder} /><Route path="/system" component={SystemPage} /><Route path="/kits" component={KitsPage} /><Route path="/export" component={ExportPage} /><Route component={NotFound} /></Switch></ErrorBoundary></Shell>; }
function App() { return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></QueryClientProvider>; }
export default App;