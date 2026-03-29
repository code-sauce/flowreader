# FlowReader

Reading is hard when your brain won't sit still. Your eyes jump ahead, re-read the same line, drift to your phone. Traditional reading demands sustained attention that many people -- especially those with ADHD -- struggle to maintain.

FlowReader paces your reading for you. It presents text one word at a time at your chosen speed, eliminating the need to track lines, manage eye movement, or fight the urge to skip ahead. Your only job is to watch.

The result is something surprising: you read faster and remember more, because the constant low-level effort of "paying attention to the page" is gone. Many people describe it as falling into a flow state -- the kind of absorption you get from a good movie, applied to text.

## Two Ways to Read

**RSVP mode** strips reading down to its purest form -- one word, center screen, nothing else. A key letter is highlighted in red to anchor your eye. The interface disappears while you read.

**Page mode** shows the full text as a paragraph with a gentle underline that moves through each word. The page scrolls continuously, like guitar tabs. You get guided pacing with the comfort of seeing surrounding context.

## How It Works

Paste text, drop a file (TXT, PDF, EPUB, Markdown), or open one from your library. Pick your speed (100-1000 WPM), hit space, and read. The app automatically slows down for longer words and punctuation, giving your brain time to process natural pause points.

Everything runs in your browser. No accounts, no servers, no data leaves your device. Install it as a PWA and use it offline.

Your position is saved automatically. Close the tab mid-article, come back tomorrow, pick up where you left off.

## Get Started

```bash
git clone https://github.com/code-sauce/flowreader.git
cd flowreader
npm install
npm run dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / pause |
| ↑ / ↓ | Adjust speed (±25 WPM) |
| ← / → | Skip to previous / next sentence |
| M | Toggle RSVP / Page mode |
| R | Restart from beginning |
| Esc | Exit to home |

## License

MIT
