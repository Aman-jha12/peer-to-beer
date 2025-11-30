# Use a lightweight Linux base
FROM alpine:3.17

# 1. Install standard Protobuf compiler (protoc)
RUN apk add --no-cache protobuf

# 2. Download the Google grpc-web plugin
RUN wget https://github.com/grpc/grpc-web/releases/download/1.4.2/protoc-gen-grpc-web-1.4.2-linux-x86_64 \
    -O /usr/local/bin/protoc-gen-grpc-web && \
    chmod +x /usr/local/bin/protoc-gen-grpc-web

# 3. Set working directory
WORKDIR /workspace

# 4. Define the entrypoint
ENTRYPOINT ["protoc"]