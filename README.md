# Kick Link Crawler

A powerful and feature-rich tool designed to crawl, manage, and organize links from Kick channel chats in real-time.

## Features

- **Real-time Link Crawling:** Connects to a Kick user's chat and automatically captures any links shared.
- **Link Management:**
    - Displays a clean, organized list of all captured links.
    - Tracks link frequency and identifies duplicate shares.
    - Marks links as "opened" to keep track of what you've seen.
- **Urgent Messaging:** Users with "trusted" status can send urgent messages or links, triggering an audio notification.
- **User and Link Blacklisting:**
    - Blacklist specific users to ignore their messages entirely.
    - Blacklist specific links to prevent them from appearing in the list.
- **Temporary Timeouts:** Temporarily mute a user or a specific link for a configurable duration.
- **Advanced Filtering and Search:**
    - Filter links by "Urgent," "Duplicates," or view historical links.
    - Search for links by sender, URL, or the content of the message.
- **Batch Operations:** Open multiple links at once, either from the top or bottom of the list.
- **Persistent History:** Previously captured links are saved locally and reloaded on startup.
- **Settings Management:**
    - Export your current settings (blacklists, trusted users, etc.) to a JSON file.
    - Import settings from a file to quickly set up a new session.
- **Test Mode:** A built-in test mode generates random links to help you test the application's functionality without needing a live chat.

## Tech Stack

- **Frontend:** React with TypeScript
- **UI:** Tailwind CSS for styling
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`)
- **Real-time Communication:** WebSocket connection to Kick's chat servers
- **Local Storage:** Browser's `localStorage` is used to persist settings and link history.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd linkcrawler
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```

## Usage

To start the development server, run:

```bash
npm run dev
```

By default, the application will connect to the chat of the user "BurakSakinOl". To connect to a different user's chat, append a query parameter to the URL in your browser:

```
http://localhost:5173/?user=<username>
```

## Configuration

All configuration is managed through the **Settings** modal within the application.

- **General:** Manage blacklisted and trusted users.
- **Links:** Manage blacklisted links.
- **Timeouts:** View and manage active user and link timeouts.
- **Advanced:**
    - **Test Mode:** Enable or disable test mode.
    - **Data Management:** Export or import your application settings.
    - **Reset All Settings:** Clear all data from your browser's local storage and reset the application to its default state.
