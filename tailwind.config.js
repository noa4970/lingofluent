/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background) / <alpha-value>)',
  			foreground: 'hsl(var(--foreground) / <alpha-value>)',
  			card: {
  				DEFAULT: 'hsl(var(--card) / <alpha-value>)',
  				foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
  				foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
  				foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
  				dark: 'hsl(var(--primary-dark) / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
  				foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
  				foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
  				foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
  				foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
  			},
  			border: 'hsl(var(--border) / <alpha-value>)',
  			input: 'hsl(var(--input) / <alpha-value>)',
  			ring: 'hsl(var(--ring) / <alpha-value>)',
  			tertiary: 'hsl(var(--tertiary) / <alpha-value>)',
  			clay: {
  				DEFAULT: 'hsl(var(--clay) / <alpha-value>)',
  				dark: 'hsl(var(--clay-dark) / <alpha-value>)',
  				deep: 'hsl(var(--clay-deep) / <alpha-value>)',
  				tint: 'hsl(var(--clay-tint) / <alpha-value>)',
  				ink: 'hsl(var(--clay-ink) / <alpha-value>)',
  				line: 'hsl(var(--clay-line) / <alpha-value>)'
  			},
  			olive: 'hsl(var(--olive) / <alpha-value>)',
  			forest: {
  				DEFAULT: 'hsl(var(--forest) / <alpha-value>)',
  				deep: 'hsl(var(--forest-deep) / <alpha-value>)',
  				tint: 'hsl(var(--forest-tint) / <alpha-value>)',
  				ink: 'hsl(var(--forest-ink) / <alpha-value>)'
  			},
  			ochre: {
  				DEFAULT: 'hsl(var(--ochre) / <alpha-value>)',
  				tint: 'hsl(var(--ochre-tint) / <alpha-value>)',
  				ink: 'hsl(var(--ochre-ink) / <alpha-value>)'
  			},
  			brick: {
  				DEFAULT: 'hsl(var(--brick) / <alpha-value>)',
  				tint: 'hsl(var(--brick-tint) / <alpha-value>)',
  				line: 'hsl(var(--brick-line) / <alpha-value>)'
  			},
  			gender: {
  				m: {
  					DEFAULT: 'hsl(var(--gender-m) / <alpha-value>)',
  					ink: 'hsl(var(--gender-m-ink) / <alpha-value>)'
  				},
  				f: {
  					DEFAULT: 'hsl(var(--gender-f) / <alpha-value>)',
  					ink: 'hsl(var(--gender-f-ink) / <alpha-value>)'
  				},
  				n: {
  					DEFAULT: 'hsl(var(--gender-n) / <alpha-value>)',
  					ink: 'hsl(var(--gender-n-ink) / <alpha-value>)'
  				}
  			},
  			/* The neutral utilities (stone / white) resolve to the warm autumn sand ramp,
  			   so every existing neutral surface, border and text tone stays warm-tinted. */
  			white: 'hsl(var(--sand-50) / <alpha-value>)',
  			stone: {
  				50: 'hsl(var(--sand-50) / <alpha-value>)',
  				100: 'hsl(var(--sand-100) / <alpha-value>)',
  				200: 'hsl(var(--sand-200) / <alpha-value>)',
  				300: 'hsl(var(--sand-300) / <alpha-value>)',
  				400: 'hsl(var(--sand-400) / <alpha-value>)',
  				500: 'hsl(var(--sand-500) / <alpha-value>)',
  				600: 'hsl(var(--sand-600) / <alpha-value>)',
  				700: 'hsl(var(--sand-700) / <alpha-value>)',
  				800: 'hsl(var(--sand-800) / <alpha-value>)',
  				900: 'hsl(var(--sand-900) / <alpha-value>)'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		boxShadow: {
  			sm: '0 1px 2px rgba(94, 64, 40, 0.06)',
  			DEFAULT: '0 1px 3px rgba(94, 64, 40, 0.08)',
  			md: '0 6px 18px rgba(94, 64, 40, 0.08)',
  			lg: '0 10px 28px rgba(94, 64, 40, 0.10)',
  			xl: '0 18px 44px rgba(94, 64, 40, 0.12)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
