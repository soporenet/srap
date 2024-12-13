# Use a Node.js base image
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and install dependencies
COPY package.json /app/package.json
RUN npm install

# Copy the config.json and the rest of the application files
COPY radius-auth-proxy-config.json /app/radius-auth-proxy-config.json
COPY radius-auth-proxy.js /app/radius-auth-proxy.js

# Expose the port the app will run on
EXPOSE 9090

# Start the application
CMD ["node", "radius-auth-proxy.js"]

