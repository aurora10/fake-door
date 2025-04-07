# # Dockerfile

#     # ==== Stage 1: Build ====
#     # Use an official Node.js Alpine image (lightweight)
#     # Choose a Node version compatible with your project (e.g., 18, 20, 22)
#     FROM node:18-alpine AS builder

#     # Set working directory
#     WORKDIR /app

#     # Install dependencies based on your package manager
#     # --- Option: NPM ---
#     COPY package.json package-lock.json* ./
#     RUN npm ci

#     # --- Option: Yarn ---
#     # COPY package.json yarn.lock ./
#     # RUN yarn install --frozen-lockfile

#     # --- Option: PNPM ---
#     # COPY package.json pnpm-lock.yaml ./
#     # RUN npm install -g pnpm
#     # RUN pnpm install --frozen-lockfile

#     # Copy the rest of the application code
#     COPY . .

#     # Set build-time environment variables if needed
#     # ARG NEXT_PUBLIC_API_URL
#     # ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

#     # Build the Next.js application for production
#     RUN npm run build # Or yarn build / pnpm build

#     # --- Prune dev dependencies (Optional, saves space) ---
#     # RUN npm prune --production # If using npm
#     # RUN yarn install --production --ignore-scripts --prefer-offline # If using Yarn

#     # ==== Stage 2: Production Runner ====
#     FROM node:18-alpine AS runner
#     WORKDIR /app

#     # Set environment to production
#     ENV NODE_ENV production

#     # Automatically install dependencies based on the builder stage
#     COPY --from=builder /app/node_modules ./node_modules
#     COPY --from=builder /app/package.json ./package.json

#     # Check if standalone output is used (Recommended)
#     # If next.config.js has output: 'standalone', copy these files:
#     COPY --from=builder /app/.next/standalone ./
#     COPY --from=builder /app/.next/static ./.next/static
#     # Copy public folder if needed by standalone app
#     # COPY --from=builder /app/public ./public

#     # If NOT using standalone, copy the build output instead:
#     # COPY --from=builder /app/.next ./.next
#     # COPY --from=builder /app/public ./public

#     # Expose the port Next.js listens on (default 3000)
#     EXPOSE 3000

#     # Set the user to run the application (improves security)
#     USER node

#     # Command to run the production server
#     # Use this if you have output: 'standalone' in next.config.js
#     CMD ["node", "server.js"]

#     # Use this if you DO NOT have output: 'standalone'
#     # CMD ["npm", "start"] # Or yarn start / pnpm start
#   THIS IS FOF NEXTJS BELLOW IS FOR EXPRESS

# Dockerfile (for Standard Node.js/Express)

# Stage 1: Install dependencies
# Use an official Node.js Alpine image (lightweight)
# Choose a Node version compatible with your project (e.g., 18, 20, 22)
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copy package manager files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev # Use --omit=dev to skip devDependencies

# Stage 2: Production Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Copy installed dependencies from the previous stage
COPY --from=dependencies /app/node_modules ./node_modules
# Copy package.json (needed for npm start potentially)
COPY --from=dependencies /app/package.json ./package.json

# Copy the rest of your application code (server.js, routes, etc.)
COPY . .

# Expose the port your Express app listens on (adjust if not 3000)
# Check your server.js file for app.listen(PORT)
EXPOSE 3000

# Set the user to run the application
USER node

# Command to run the application using your start script
CMD ["npm", "start"]