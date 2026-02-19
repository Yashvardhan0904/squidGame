'use client';

import { motion } from 'framer-motion';

export default function GlitchText({ text, className = '', as: Tag = 'h1' }) {
  return (
    <div className="relative inline-block">
      <Tag
        className={`absolute top-0 left-0 ${className} text-squid-pink/40 animate-[glitch_4s_ease-in-out_infinite]`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 33%, 0 33%)', transform: 'translate(-2px, -1px)' }}
        aria-hidden="true"
      >
        {text}
      </Tag>
      <Tag
        className={`absolute top-0 left-0 ${className} text-cyan-400/20 animate-[glitch_4s_ease-in-out_infinite_0.15s]`}
        style={{ clipPath: 'polygon(0 66%, 100% 66%, 100% 100%, 0 100%)', transform: 'translate(2px, 1px)' }}
        aria-hidden="true"
      >
        {text}
      </Tag>
      <Tag className={`relative ${className}`}>
        {text}
      </Tag>
    </div>
  );
}
