# Local development image for the Vite frontend.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Source is bind-mounted by docker-compose; node_modules stays in the image
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
