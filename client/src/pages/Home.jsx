import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { CameraIcon as Camera } from '@phosphor-icons/react/Camera';
import { ArrowRightIcon as ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { ShieldCheckIcon as ShieldCheck } from '@phosphor-icons/react/ShieldCheck';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle';
import { StackIcon as Stack } from '@phosphor-icons/react/Stack';
import { VinylRecordIcon as VinylRecord } from '@phosphor-icons/react/VinylRecord';
import { PersonArmsSpreadIcon as PersonArmsSpread } from '@phosphor-icons/react/PersonArmsSpread';
import { SneakerIcon as Sneaker } from '@phosphor-icons/react/Sneaker';
import { PushPinIcon as PushPin } from '@phosphor-icons/react/PushPin';
import { GameControllerIcon as GameController } from '@phosphor-icons/react/GameController';
import { CurrencyCircleDollarIcon as CurrencyCircleDollar } from '@phosphor-icons/react/CurrencyCircleDollar';
import { PaintBrushIcon as PaintBrush } from '@phosphor-icons/react/PaintBrush';

import { useInitialLoad } from '../contexts/useInitialLoad';
import VaultLogo from '../components/VaultLogo';
import BlobBackground from '../components/UI/BlobBackground';
import CategoryIcon from '../components/UI/CategoryIcon';
import './Home.scss';

const FLOATING_ITEMS = [
  { Icon: Stack, x: '10%', y: '20%', delay: 0, size: 36, color: '#7c3aed' },
  { Icon: VinylRecord, x: '80%', y: '15%', delay: 1.2, size: 32, color: '#2563eb' },
  { Icon: PersonArmsSpread, x: '15%', y: '70%', delay: 0.6, size: 28, color: '#dc2626' },
  { Icon: Sneaker, x: '85%', y: '60%', delay: 1.8, size: 34, color: '#9333ea' },
  { Icon: PushPin, x: '70%', y: '80%', delay: 0.3, size: 24, color: '#4c1d95' },
  { Icon: GameController, x: '25%', y: '45%', delay: 2.1, size: 26, color: '#1d4ed8' },
  { Icon: CurrencyCircleDollar, x: '60%', y: '35%', delay: 0.9, size: 30, color: '#7c3aed' },
  { Icon: PaintBrush, x: '90%', y: '40%', delay: 1.5, size: 22, color: '#00c4cc' },
];

const FEATURES = [
  {
    icon: <Camera weight="duotone" size={32} />,
    title: 'Got Something New?',
    desc: 'Pick a photo from your camera roll, give it a name, drop a note. Done in about ten seconds.',
    color: '#dc2626',
    colorRgb: '220, 38, 38',
    num: '01',
  },
  {
    icon: <Eye weight="duotone" size={32} />,
    title: 'Proper Catalog',
    desc: 'Each collection gets its own grid with item details and notes. Not just a camera roll dump.',
    color: '#7c3aed',
    colorRgb: '124, 58, 237',
    num: '02',
  },
  {
    icon: <ShareNetwork weight="duotone" size={32} />,
    title: 'Share It',
    desc: 'Keep it private, share with friends only, or put it on the explore page for everyone to see.',
    color: '#2563eb',
    colorRgb: '37, 99, 235',
    num: '03',
  },
  {
    icon: <ShieldCheck weight="duotone" size={32} />,
    title: 'Offline First',
    desc: 'No internet needed to add or browse. Sign in and it syncs across all your devices automatically.',
    color: '#00c4cc',
    colorRgb: '0, 196, 204',
    num: '04',
  },
];

const CATEGORIES_SHOWCASE = [
  'trading-cards', 'music', 'figures', 'clothes', 'pins', 'sneakers', 'manga', 'video-games', 'coins', 'art', 'anime',
];

export default function Home() {
  const { isInitialLoad } = useInitialLoad();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // parallax only on desktop
  const { scrollYProgress } = useScroll();
  const heroOpacityProgress = useTransform(
    scrollYProgress,
    [0, 0.12, 0.28, 0.45],
    [1, 0.85, 0.5, 0.12],
  );
  const heroOpacity = useSpring(heroOpacityProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.35,
  });
  const heroScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.95]);

  return (
    <div className="home">

      {/* hero */}
      <motion.section
        className="home__hero"
        style={isMobile ? undefined : { opacity: heroOpacity, scale: heroScale }}
      >
        <BlobBackground />

        {/* Floating icons — CSS-driven */}
        {FLOATING_ITEMS.map((item, i) => (
          <span
            key={i}
            className="home__floating-item"
            style={{
              left: item.x,
              top: item.y,
              color: item.color,
              '--float-duration': `${6 + item.delay}s`,
              '--float-delay': `${item.delay}s`,
            }}
          >
            <item.Icon weight="duotone" size={item.size} />
          </span>
        ))}

        <div className="home__hero-content">
          <motion.div
            className="home__badge"
            initial={isInitialLoad ? { opacity: 0, y: isMobile ? 0 : 10, scale: isMobile ? 0.98 : 1 } : { opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={isInitialLoad ? { delay: 0.2, duration: 0.6, ease: 'easeOut' } : { duration: 0 }}
          >
            <Sparkle weight="fill" size={14} />
            <span>for collectors</span>
          </motion.div>

          <motion.h1
            className="home__title"
            initial={isInitialLoad ? { opacity: 0, y: isMobile ? 0 : 20, scale: isMobile ? 0.98 : 1 } : { opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={isInitialLoad ? { delay: 0.35, duration: 0.7, ease: 'easeOut' } : { duration: 0 }}
          >
            Track Your
            <br />
            <span className="gradient-text">Collection</span>
          </motion.h1>

          <motion.p
            className="home__subtitle"
            initial={isInitialLoad ? { opacity: 0, y: isMobile ? 0 : 15, scale: isMobile ? 0.98 : 1 } : { opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={isInitialLoad ? { delay: 0.5, duration: 0.6, ease: 'easeOut' } : { duration: 0 }}
          >
            Cards, figures, vinyl, manga, games. Log what you own, track new pickups, and share your vault with people who get it.
          </motion.p>

          <motion.div
            className="home__cta"
            initial={isInitialLoad ? { opacity: 0, y: isMobile ? 0 : 15, scale: isMobile ? 0.98 : 1 } : { opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={isInitialLoad ? { delay: 0.7, duration: 0.6, ease: 'easeOut' } : { duration: 0 }}
          >
            <Link to="/dashboard" className="btn btn--primary btn--lg home__cta-btn">
              <VaultLogo size={18} />
              Start Collecting
            </Link>
            <Link to="/explore" className="btn btn--secondary btn--lg home__explore-btn">
              <Eye weight="duotone" />
              Explore
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* scrolling categories */}
      <section className="home__categories">
        <div className="home__categories-track">
          <div className="home__categories-scroll">
            {[...CATEGORIES_SHOWCASE, ...CATEGORIES_SHOWCASE].map((cat, i) => (
              <span key={i} className="home__category-chip">
                <CategoryIcon category={cat} size={16} /> {cat.replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="home__features">
        <div className="container">
          <motion.h2
            className="home__section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Why <span className="gradient-text">Vaulted</span>?
          </motion.h2>

          <div className="home__features-grid">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                className="home__feature-card"
                style={{ '--feat-color': feat.color, '--feat-color-rgb': feat.colorRgb }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 80 }}
                whileHover={{ y: -6 }}
              >
                <span className="home__feature-num" aria-hidden="true">{feat.num}</span>
                <div className="home__feature-icon">
                  {feat.icon}
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home__bottom-cta">
        <BlobBackground color1="#7c3aed" color2="#dc2626" color3="#2563eb" />
        <div className="container">
          <motion.div
            className="home__bottom-cta-content"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2>Build your vault.</h2>
            <p>Free to use. Works offline. No ads, no nonsense.</p>
            <Link to="/dashboard" className="btn btn--primary btn--lg home__cta-btn">
              <ArrowRight weight="bold" />
              Let's Go
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
