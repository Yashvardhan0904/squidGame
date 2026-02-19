/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        'squid-black': '#0a0a0a',
        'squid-dark': '#111111',
        'squid-pink': '#ff2e88',
        'squid-red': '#b11226',
        'squid-mint': '#00ff9f',
        'squid-green': '#1db954',
        'squid-yellow': '#ffff00',
        'squid-gray': '#1a1a1a',
        'squid-card': '#161616',
        'squid-border': '#2a2a2a',
      },
      fontFamily: {
        'mono': ['"Share Tech Mono"', 'Courier New', 'monospace'],
        'display': ['"Orbitron"', 'sans-serif'],
        'body': ['"Inter"', 'sans-serif'],
      },
      animation: {
        'flicker': 'flicker 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-red': 'pulse-glow-red 1.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'glitch': 'glitch 0.3s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'fade-in': 'fadeIn 0.8s ease-out',
        'count-pulse': 'countPulse 1s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'particle-float': 'particleFloat 15s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 46, 136, 0.3), 0 0 15px rgba(255, 46, 136, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 46, 136, 0.8), 0 0 40px rgba(255, 46, 136, 0.3)' },
        },
        'pulse-glow-red': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(177, 18, 38, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(177, 18, 38, 0.8), 0 0 60px rgba(177, 18, 38, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(10px)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-3px, 3px)' },
          '40%': { transform: 'translate(-3px, -3px)' },
          '60%': { transform: 'translate(3px, 3px)' },
          '80%': { transform: 'translate(3px, -3px)' },
          '100%': { transform: 'translate(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        countPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        particleFloat: {
          '0%': { transform: 'translateY(100vh) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-10vh) rotate(720deg)', opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
