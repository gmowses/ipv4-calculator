# IPv4 Subnet Calculator

IPv4 subnet calculator with VLSM (Variable Length Subnet Masking) support. Everything runs client-side -- no data is sent to any server.

**[Live Demo](https://gmowses.github.io/ipv4-calculator)**

## Features

- **Subnet calculation** -- network, broadcast, first/last usable IP, mask, wildcard
- **CIDR notation** -- input and output in CIDR format
- **VLSM calculator** -- divide a network into variable-length subnets sorted by size
- **Binary representation** -- toggle binary view of IP, mask and network
- **Copy to clipboard** -- one-click copy for any calculated value
- **Dark / Light mode** -- toggle or auto-detect from system preference
- **i18n** -- English and Portuguese (auto-detect from browser language)
- **Zero backend** -- pure client-side, works offline

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS v4
- Vite
- Lucide icons

## Getting Started

```bash
git clone https://github.com/gmowses/ipv4-calculator.git
cd ipv4-calculator
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## How It Works

### Subnet Calculation

Given a CIDR block like `192.168.1.0/24`:

| Field | Value |
|-------|-------|
| Network | 192.168.1.0/24 |
| Broadcast | 192.168.1.255 |
| First usable | 192.168.1.1 |
| Last usable | 192.168.1.254 |
| Subnet mask | 255.255.255.0 |
| Wildcard | 0.0.0.255 |
| Usable hosts | 254 |

### VLSM

Divides a network into subnets of different sizes. Subnets are allocated largest-first to minimize wasted address space.

Example: dividing `10.0.0.0/16` into subnets for Servers (500 hosts), Office (200 hosts) and IoT (50 hosts).

## License

[MIT](LICENSE) -- Gabriel Mowses
