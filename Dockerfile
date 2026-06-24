FROM rust:latest

# Instalar dependencias del sistema para Tauri y GTK
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    pkg-config \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    mingw-w64 \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js 20 via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Instalar Tauri CLI
RUN cargo install tauri-cli --version "^2" --locked

# Agregar target de cross-compilación para Windows
RUN rustup target add x86_64-pc-windows-gnu

WORKDIR /app

EXPOSE 1420
