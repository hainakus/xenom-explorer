# XENOM Explorer - React & WASM Implementation

A modern, cyberpunk-themed blockchain explorer for XENOM, built with React and WebAssembly support. This explorer provides real-time network statistics, block exploration, address tracking, and transaction analysis with a sleek, futuristic interface.

## Features

- **🚀 Real-time Updates**: Live block stream via WebSocket connections
- **⚡ WASM Integration**: WebAssembly module for high-performance operations
- **🎨 Cyberpunk Theme**: Futuristic green-on-black interface with glowing effects
- **📊 Network Statistics**: Block count, hashrate, supply information, node status
- **🔍 Advanced Search**: Support for block hashes, addresses, and transaction IDs
- **📱 Responsive Design**: Optimized for both desktop and mobile devices
- **🔄 Live Data**: Automatic polling and real-time block updates

## Architecture

### Frontend Stack
- **React 18** with hooks for state management
- **Vite** for fast development and WASM support
- **Socket.IO** for real-time WebSocket connections
- **Custom CSS** with cyberpunk aesthetics

### WASM Integration
- Modular WebAssembly support for blockchain operations
- Fallback to REST API when WASM is unavailable
- Performance optimizations for block validation and transaction verification

### API Integration
- Connects to XENOM explorer API endpoints
- Real-time WebSocket subscriptions for live blocks
- Comprehensive error handling and loading states

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd xenom-explorer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
xenom-explorer/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Main dashboard with network stats
│   │   ├── BlockPage.jsx      # Block detail view
│   │   ├── AddressPage.jsx    # Address transaction history
│   │   ├── TxPage.jsx         # Transaction details
│   │   └── SearchBar.jsx      # Global search functionality
│   ├── xenom-sdk.js           # Main SDK with API integration
│   ├── xenom-wasm.js          # WASM module interface
│   ├── styles.css             # Cyberpunk theme styles
│   ├── XenomApp.jsx           # Main application component
│   └── App.jsx                # App entry point
├── public/                    # Static assets
├── vite.config.js            # Vite configuration with WASM support
└── package.json              # Dependencies and scripts
```

## WASM Module

The project includes a placeholder WASM module (`xenom-wasm.js`) that demonstrates the integration pattern. When the actual XENOM WASM SDK becomes available, it can be easily integrated:

### Current WASM Features (Simulated)
- Block validation
- Transaction verification  
- Address generation
- Hash calculation

### Future WASM Integration
Replace the placeholder with actual compiled WASM from Rust/C++ for:
- Cryptographic operations
- Block validation algorithms
- Transaction parsing
- Address generation

## API Endpoints

The explorer connects to the XENOM API at `https://explorer.xenom.space/api`:

- `/info/blockdag` - Network statistics
- `/info/xenomd` - Node information
- `/info/coinsupply` - Supply data
- `/blocks/{hash}` - Block details
- `/transactions/{id}` - Transaction data
- `/addresses/{address}/balance` - Address balance
- `/addresses/{address}/transactions` - Address history

## WebSocket Events

Real-time updates via Socket.IO:

- `connect` - Connection established
- `disconnect` - Connection lost
- `last-blocks` - New block notifications
- `join-room` - Subscribe to block updates

## Styling & Theme

The cyberpunk theme features:

- **Color Palette**: Neon green (#00ff88), cyan (#00e5ff), red (#ff3366)
- **Typography**: Orbitron (headers), Share Tech Mono (code), Rajdhani (body)
- **Effects**: Glowing animations, scan lines, grid backgrounds
- **Responsive**: Adapts to mobile and desktop viewports

## Performance Optimizations

- **Lazy Loading**: Components load data on demand
- **Polling Intervals**: Optimized API refresh rates
- **WebSocket Reconnection**: Automatic reconnection handling
- **Memory Management**: Proper cleanup of subscriptions
- **WASM Fallback**: Graceful degradation when WASM unavailable

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Future Enhancements

- [ ] Real WASM SDK integration
- [ ] Advanced charting and analytics
- [ ] Mobile app version
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Advanced filtering and search
- [ ] Export functionality
- [ ] API rate limiting and caching
- [ ] PWA capabilities

---

**Built with ❤️ for the XENOM community**
