# Telegram Affiliate Bot

## Overview
The Telegram Affiliate Bot is a web application designed to streamline the process of creating and posting affiliate ads on Telegram using links from Mercado Livre. By leveraging AI for image analysis and integrating with the Mercado Livre API, this bot automates the generation of engaging advertisements.

## Features
- **Image Analysis**: Utilizes AI to analyze images and extract relevant information for ad creation.
- **Mercado Livre Integration**: Fetches product details and generates affiliate links from the Mercado Livre API.
- **Telegram Bot Management**: Sends messages and handles updates from the Telegram bot seamlessly.
- **Ad Generation**: Automatically creates ads based on analyzed images and product information.
- **Input Validation**: Ensures that all input data meets the required criteria for ad creation.

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

## Usage
1. Start the application:
   ```
   npm start
   ```
2. Interact with the bot on Telegram to create and post affiliate ads.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.