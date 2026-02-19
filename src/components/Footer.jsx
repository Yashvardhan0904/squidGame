'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, Instagram, Mail, ExternalLink } from 'lucide-react';
import { CircleSymbol, TriangleSymbol, SquareSymbol } from './SquidSymbols';
import { TechMarquee } from './MarqueeStrip';

const socialLinks = [
  { icon: Linkedin, href: 'https://linkedin.com/company/usaracm', label: 'LinkedIn' },
  { icon: Instagram, href: 'https://instagram.com/usaracm', label: 'Instagram' },
  { icon: Github, href: 'https://github.com/usaracm', label: 'GitHub' },
  { icon: Mail, href: 'mailto:usaracm@ipu.ac.in', label: 'Email' },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-squid-border/30 bg-squid-black">
      {/* Tech marquee */}
      <TechMarquee />

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-12 md:gap-8 mb-16">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CircleSymbol size={16} glowing />
              <TriangleSymbol size={16} glowing />
              <SquareSymbol size={16} glowing />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">
              ACM <span className="text-squid-pink">SQUID GAME</span>
            </h3>
            <p className="text-gray-500 font-mono text-xs leading-relaxed max-w-xs">
              A 25-day DSA survival challenge by GGSIPU EDC ACM Student Chapter.
              Solve or be eliminated.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-mono text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-4">Explore</h4>
            <div className="space-y-2.5">
              {[
                { label: 'About ACM', href: 'https://usar.acm.org/about/' },
                { label: 'Events', href: 'https://usar.acm.org/events/' },
                { label: 'Team', href: 'https://usar.acm.org/teams/' },
                { label: 'Projects', href: 'https://usar.acm.org/projects/' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-500 hover:text-squid-pink text-sm font-mono transition-colors duration-300 group"
                >
                  {link.label}
                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>

          {/* Contact / Socials */}
          <div>
            <h4 className="font-mono text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-4">Connect</h4>
            <div className="flex gap-3 mb-6">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2.5 bg-squid-gray border border-squid-border/50 rounded-xl text-gray-500
                    hover:text-squid-pink hover:border-squid-pink/30 transition-all duration-300"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
            <p className="text-gray-600 font-mono text-[10px] leading-relaxed">
              GGSIPU East Delhi Campus<br />
              Surajmal Vihar, Delhi - 110032
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-squid-border/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-gray-600 font-mono text-[10px] tracking-wider">
            &copy; 2026 GGSIPU EDC ACM Student Chapter
          </span>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-mono text-[10px]">
              Built with Next.js + PostgreSQL
            </span>
            <span className="text-squid-pink/40 font-mono text-[10px]">
              Three strikes and you&apos;re out
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
