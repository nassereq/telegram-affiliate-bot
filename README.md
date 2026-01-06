# Telegram Affiliate Bot

## Overview

The Telegram Affiliate Bot is a multi-platform automation tool designed to streamline the process of creating and posting affiliate ads on Telegram and WhatsApp using links from Mercado Livre and Amazon. By leveraging AI for image analysis, queue-based scheduling, and multi-platform broadcasting, this bot automates the generation and distribution of engaging advertisements.

## Features

- **Queue-Based Posting**: Schedule ads with automatic intervals (3min initial + 5min default between posts)
- **Multi-Platform Broadcasting**: Simultaneous posting to Telegram and WhatsApp
- **WhatsApp Integration**: QR code authentication with persistent sessions
- **Image Analysis**: AI-powered image analysis using GPT-4 Vision
- **Mercado Livre Integration**: Complete product scraping with PIX price detection and coupon support
- **Amazon Integration**: Full product detail extraction with discount and coupon handling
- **Ad Generation**: Automatic formatting with emojis and optimized text
- **Coupon Support**: Automatic discount calculation and application
- **Queue Management**: Pause, resume, clear, and monitor scheduled posts
- **Input Validation**: Robust URL and data validation for both platforms

## Project Structure

```
telegram-affiliate-bot
├── src
│   ├── app.ts                  # Entry point of the application
│   ├── services
│   │   ├── imageAnalysis.ts     # Image analysis service
│   │   ├── mercadoLivre.ts      # Mercado Livre API service
│   │   └── telegram.ts          # Telegram bot service
│   ├── controllers
│   │   └── adGenerator.ts       # Ad generation controller
│   ├── utils
│   │   ├── formatter.ts         # Utility functions for formatting
│   │   └── validator.ts         # Utility functions for validation
│   └── types
│       └── index.ts            # TypeScript interfaces and types
├── config
│   └── config.ts               # Configuration settings
├── package.json                 # npm configuration file
├── tsconfig.json                # TypeScript configuration file
├── .env.example                 # Example of environment variables
└── README.md                   # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/telegram-affiliate-bot.git
   ```
2. Navigate to the project directory:
   ```
   cd telegram-affiliate-bot
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Create a `.env` file based on the `.env.example` file and fill in the required environment variables.

## Available Commands

### Basic Commands

- `/start` or `/s` - Start the bot and show welcome message
- `/help` - Show detailed help information
- `/cancelar` - Cancel current operation

### Queue Management

- `/fila` - View all scheduled posts with times and status
- `/intervalo [minutes]` - Set posting interval (1-1440 minutes, default: 5)
- `/pausar` - Pause/resume automatic posting queue
- `/limpar` - Clear all pending ads from queue

### WhatsApp Commands

- `/whatsapp_status` - View WhatsApp connection status and list available groups
- `/whatsapp_reconnect` - Reconnect WhatsApp if disconnected
- `/status` - View combined status (Telegram + WhatsApp + Queue)

## WhatsApp Setup

### Initial Configuration

1. Start the bot:
   ```
   npm start
   ```
2. A QR code will appear in the terminal
3. Open WhatsApp on your phone → **Linked Devices** → **Link a Device**
4. Scan the QR code displayed in the terminal
5. Wait for the message: "✅ WhatsApp conectado e pronto!"

### Group Configuration

1. Use the command `/whatsapp_status` in Telegram
2. The bot will list all available WhatsApp groups with their IDs
3. Copy the desired group ID (format: `120363xxx@g.us`)
4. Add to your `.env` file:
   ```
   WHATSAPP_GROUP_ID=120363xxx@g.us
   ```
5. Restart the bot

### Session Persistence

- WhatsApp sessions are saved in the `whatsapp-session/` directory
- No need to scan QR code again after initial setup
- Session persists across bot restarts
- Use `/whatsapp_reconnect` if connection is lost

## Usage

### Basic Workflow

1. Start the bot: `npm start`
2. Send a product link (Mercado Livre or Amazon) to the Telegram bot
3. Bot scrapes product details and shows preview
4. Confirm with "SIM" to add to posting queue
5. First post: 3 minutes after confirmation
6. Subsequent posts: every 5 minutes (configurable with `/intervalo`)
7. Posts are sent to both Telegram and WhatsApp automatically

### Queue Management

- View queue status: `/fila`
- Adjust posting speed: `/intervalo 10` (10 minutes between posts)
- Pause posting: `/pausar` (pause), `/pausar` again (resume)
- Clear queue: `/limpar`

### Multi-Platform Status

- Check all platforms: `/status`
- Shows:
  - Telegram connection status
  - WhatsApp connection status and groups
  - Queue status (pending ads, paused/active, interval)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
